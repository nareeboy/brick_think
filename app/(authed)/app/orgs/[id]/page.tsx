import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { OrgMember, OrgRole } from '@/lib/orgs/types';

import { AddMemberForm } from './AddMemberForm';
import { DeleteOrgButton } from './DeleteOrgButton';
import { LeaveOrgButton } from './LeaveOrgButton';
import { MemberRow } from './MemberRow';
import { RenameOrgForm } from './RenameOrgForm';
import { NewSessionInline } from './sessions/NewSessionInline';
import { SessionsList } from './sessions/SessionsList';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) return { title: 'Organisation' };
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('organisations')
    .select('name')
    .eq('id', id)
    .single();
  return { title: data?.name ?? 'Organisation' };
}

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    redirect(`/sign-in?reason=unconfigured&next=%2Fapp%2Forgs%2F${id}`);
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=%2Fapp%2Forgs%2F${id}`);

  const [orgRes, viewerRoleRes, membersRes, sessionsRes] = await Promise.all([
    supabase.from('organisations').select('id, name, slug').eq('id', id).single(),
    supabase
      .from('org_memberships')
      .select('role')
      .eq('org_id', id)
      .eq('profile_id', user.id)
      .maybeSingle(),
    supabase
      .from('org_memberships')
      .select('role, profiles:profile_id ( id, email, full_name, avatar_url )')
      .eq('org_id', id),
    supabase
      .from('sessions')
      .select('id, title, status, updated_at')
      .eq('org_id', id)
      .order('updated_at', { ascending: false }),
  ]);

  if (orgRes.error || !orgRes.data) notFound();
  if (viewerRoleRes.error) {
    throw new Error(`Failed to load role: ${viewerRoleRes.error.message}`);
  }
  if (!viewerRoleRes.data) notFound();
  if (membersRes.error) {
    throw new Error(`Failed to load members: ${membersRes.error.message}`);
  }
  if (sessionsRes.error) {
    throw new Error(`Failed to load sessions: ${sessionsRes.error.message}`);
  }

  const viewerRole = viewerRoleRes.data.role as OrgRole;
  const isAdmin = viewerRole === 'owner' || viewerRole === 'admin';
  const isOwner = viewerRole === 'owner';

  const members: OrgMember[] = (membersRes.data ?? [])
    .map((row): OrgMember | null => {
      const profile = (row as {
        profiles: { id: string; email: string; full_name: string | null; avatar_url: string | null } | null;
      }).profiles;
      if (!profile) return null;
      return {
        profile_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: (row as { role: OrgRole }).role,
      };
    })
    .filter((m): m is OrgMember => m !== null)
    .sort((a, b) => a.email.localeCompare(b.email));

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-10">
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            <Link href="/app/orgs" className="underline-offset-2 hover:underline">
              Organisations
            </Link>
            <span aria-hidden="true" className="mx-1.5 text-zinc-400">/</span>
            {orgRes.data.name}
          </p>
          <div className="mt-1">
            {isAdmin ? (
              <RenameOrgForm orgId={id} initialName={orgRes.data.name} />
            ) : (
              <h1 className="text-[26px] font-semibold tracking-tight text-zinc-950">
                {orgRes.data.name}
              </h1>
            )}
          </div>
          <p className="mt-1 font-mono text-[12px] text-zinc-500">{orgRes.data.slug}</p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950">Sessions</h2>
          <NewSessionInline orgId={id} />
          <SessionsList sessions={sessionsRes.data ?? []} />
        </section>

        <section className="flex flex-col gap-3 border-t border-zinc-900/5 pt-8">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Members ({members.length})
          </h2>
          {isAdmin ? <AddMemberForm orgId={id} /> : null}
          <ul className="flex flex-col gap-2">
            {members.map((m) => (
              <MemberRow
                key={m.profile_id}
                orgId={id}
                member={m}
                canRemove={isAdmin && m.profile_id !== user.id}
              />
            ))}
          </ul>
        </section>

        <footer className="flex flex-col gap-4 border-t border-zinc-900/5 pt-6">
          <LeaveOrgButton orgId={id} profileId={user.id} />
          {isOwner ? (
            <DeleteOrgButton
              orgId={id}
              orgName={orgRes.data.name}
              orgSlug={orgRes.data.slug}
            />
          ) : null}
        </footer>
      </div>
    </main>
  );
}
