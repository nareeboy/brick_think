import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { ModelSummary, OrgModelSummary } from '@/lib/models/types';

import { DesignList } from './DesignList';
import { NewDesignButton } from './NewDesignButton';

export const metadata: Metadata = { title: 'Designs' };
export const dynamic = 'force-dynamic';

interface RawRow {
  id: string;
  title: string;
  updated_at: string;
  thumbnail_path: string | null;
  thumbnail_updated_at: string | null;
  owner_profile_id?: string;
  profiles?: { email: string; full_name: string | null } | null;
}

export default async function DesignsPage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Fdesigns');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fdesigns');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('active_org_id')
    .eq('id', user.id)
    .single();
  if (profileError || !profile) {
    throw new Error(`Failed to load profile: ${profileError?.message}`);
  }
  const activeOrgId = profile.active_org_id;

  let activeOrgName: string | null = null;
  if (activeOrgId) {
    const { data: orgRow } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', activeOrgId)
      .single();
    activeOrgName = orgRow?.name ?? null;
  }

  const trashRes = await supabase
    .from('models')
    .select('id', { count: 'exact', head: true })
    .not('deleted_at', 'is', null);
  if (trashRes.error) {
    throw new Error(`Failed to load trash count: ${trashRes.error.message}`);
  }
  const trashCount = trashRes.count ?? 0;

  let rows: RawRow[];
  let heading: string;
  if (activeOrgId === null) {
    const { data, error } = await supabase
      .from('models')
      .select('id, title, updated_at, thumbnail_path, thumbnail_updated_at')
      .eq('owner_profile_id', user.id)
      .is('org_id', null)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`Failed to load designs: ${error.message}`);
    rows = (data ?? []) as RawRow[];
    heading = 'My designs';
  } else {
    const { data, error } = await supabase
      .from('models')
      .select(
        'id, title, updated_at, thumbnail_path, thumbnail_updated_at, owner_profile_id, profiles:owner_profile_id ( email, full_name )',
      )
      .eq('org_id', activeOrgId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`Failed to load designs: ${error.message}`);
    rows = (data ?? []) as unknown as RawRow[];
    heading = `${activeOrgName ?? 'Organisation'} · designs`;
  }

  // Sign thumbnail URLs in a single batched call (works in both contexts —
  // signed URLs are bucket-level access, not per-user, and the bucket is
  // private so URLs expire in an hour).
  const paths = rows
    .map((r) => r.thumbnail_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await supabase.storage
      .from('model-thumbnails')
      .createSignedUrls(paths, 60 * 60);
    if (signed.error) {
      console.error('thumbnail signing failed', signed.error);
    } else {
      for (const s of signed.data ?? []) {
        if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
      }
    }
  }

  function thumbnailUrl(r: RawRow): string | null {
    if (!r.thumbnail_path || !urlByPath.has(r.thumbnail_path)) return null;
    const base = urlByPath.get(r.thumbnail_path)!;
    const v = encodeURIComponent(r.thumbnail_updated_at ?? '');
    return `${base}&v=${v}`;
  }

  const cards: (ModelSummary | OrgModelSummary)[] =
    activeOrgId === null
      ? rows.map(
          (r): ModelSummary => ({
            id: r.id,
            title: r.title,
            updated_at: r.updated_at,
            thumbnail_url: thumbnailUrl(r),
          }),
        )
      : rows.map((r): OrgModelSummary => {
          const p = r.profiles ?? null;
          return {
            id: r.id,
            title: r.title,
            updated_at: r.updated_at,
            thumbnail_url: thumbnailUrl(r),
            owner_profile_id: r.owner_profile_id ?? '',
            owner_email: p?.email ?? '',
            owner_full_name: p?.full_name ?? null,
          };
        });

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              BrickThink
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-zinc-950">
              {heading}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                data-testid="sign-out-button"
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-3 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
              >
                Sign out
              </button>
            </form>
            {trashCount > 0 ? (
              <Link
                href="/app/designs/trash"
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5"
              >
                Trash ({trashCount})
              </Link>
            ) : null}
            <NewDesignButton />
          </div>
        </header>
        <DesignList models={cards} viewerProfileId={user.id} />
      </div>
    </main>
  );
}
