import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { StageRow } from '@/lib/sessions/types';

import { SessionStageList } from './SessionStageList';
import { SessionTitle } from './SessionTitle';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!isSupabaseConfigured()) return { title: 'Session' };
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('sessions')
    .select('title')
    .eq('id', id)
    .maybeSingle();
  return { title: data?.title ? `${data.title} · Session` : 'Session' };
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    redirect(`/sign-in?reason=unconfigured&next=%2Fapp%2Fsessions%2F${id}`);
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=%2Fapp%2Fsessions%2F${id}`);

  const sessionRes = await supabase
    .from('sessions')
    .select('id, title, org_id, facilitator_id, status')
    .eq('id', id)
    .maybeSingle();
  if (sessionRes.error || !sessionRes.data) notFound();
  const session = sessionRes.data;

  const stagesRes = await supabase
    .from('stages')
    .select('id, session_id, stage_type, position')
    .eq('session_id', id)
    .order('position', { ascending: true });
  if (stagesRes.error) {
    throw new Error(`Failed to load stages: ${stagesRes.error.message}`);
  }
  const stages = (stagesRes.data ?? []) as StageRow[];

  const ownedRes = await supabase
    .from('models')
    .select('id, title, updated_at, stage_id')
    .eq('session_id', id)
    .eq('owner_profile_id', user.id)
    .is('deleted_at', null);
  if (ownedRes.error) {
    throw new Error(`Failed to load your session models: ${ownedRes.error.message}`);
  }
  const ownedModels = (ownedRes.data ?? []).filter(
    (m): m is typeof m & { stage_id: string } => m.stage_id !== null,
  );

  // Rename permission mirrors the sessions UPDATE RLS: facilitator OR org
  // admin. Org-admin check is via membership role; we resolve it here so the
  // client component can render the title as plain text for non-authorised
  // viewers (and skip the editing affordance entirely).
  let canRename = session.facilitator_id === user.id;
  if (!canRename) {
    const { data: membership } = await supabase
      .from('org_memberships')
      .select('role')
      .eq('org_id', session.org_id)
      .eq('profile_id', user.id)
      .maybeSingle();
    canRename =
      membership !== null &&
      membership !== undefined &&
      (membership.role === 'owner' || membership.role === 'admin');
  }

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-5 py-10">
        <header className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Session · {session.status}
            </p>
            <SessionTitle
              sessionId={session.id}
              initialTitle={session.title}
              canRename={canRename}
            />
          </div>
        </header>
        <SessionStageList
          sessionId={session.id}
          stages={stages}
          ownedModels={ownedModels}
        />
      </div>
    </main>
  );
}
