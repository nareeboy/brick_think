import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

export const metadata: Metadata = { title: 'Sessions' };
export const dynamic = 'force-dynamic';

interface SessionRow {
  id: string;
  title: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed' | 'archived';
  facilitator_id: string;
  updated_at: string;
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return fmt.format(date);
}

export default async function SessionsListPage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Fsessions');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fsessions');

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

  let rows: SessionRow[] = [];
  let heading: string;

  if (activeOrgId === null) {
    // Personal context — only show sessions the user facilitates.
    const { data, error } = await supabase
      .from('sessions')
      .select('id, title, status, facilitator_id, updated_at')
      .eq('facilitator_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`Failed to load sessions: ${error.message}`);
    rows = (data ?? []) as SessionRow[];
    heading = 'My sessions';
  } else {
    // Org context — show every session in this org (RLS already restricts
    // to org members).
    const { data, error } = await supabase
      .from('sessions')
      .select('id, title, status, facilitator_id, updated_at')
      .eq('org_id', activeOrgId)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`Failed to load sessions: ${error.message}`);
    rows = (data ?? []) as SessionRow[];
    heading = `${activeOrgName ?? 'Organisation'} · sessions`;
  }

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              BrickThink
            </p>
            <h1
              className="mt-1 text-[26px] font-semibold tracking-tight text-zinc-950"
              data-testid="sessions-heading"
            >
              {heading}
            </h1>
          </div>
          <Link
            href="/app/sessions/new"
            data-testid="new-session-link"
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47]"
          >
            New session
          </Link>
        </header>

        {rows.length === 0 ? (
          <div
            data-testid="sessions-empty-state"
            className="rounded-2xl border border-dashed border-zinc-900/10 bg-white p-10 text-center"
          >
            <p className="text-[14px] text-zinc-600">
              No sessions yet.{' '}
              <Link
                href="/app/sessions/new"
                className="font-medium text-[#c0613d] underline-offset-2 hover:underline"
              >
                Create one
              </Link>{' '}
              to start a Serious Play workshop.
            </p>
          </div>
        ) : (
          <ul
            data-testid="sessions-list"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
          >
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/app/sessions/${row.id}`}
                  data-testid={`session-card-${row.id}`}
                  className="group flex h-full flex-col gap-2 rounded-2xl border border-zinc-900/10 bg-white p-5 transition-colors hover:border-zinc-900/20"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    {row.status}
                  </p>
                  <h2 className="text-[18px] font-semibold tracking-tight text-zinc-950 group-hover:text-[#c0613d]">
                    {row.title}
                  </h2>
                  <p className="mt-auto text-[12px] text-zinc-500">
                    Updated {formatRelative(row.updated_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
