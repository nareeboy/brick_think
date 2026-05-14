import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

import { CreateSessionForm } from './CreateSessionForm';

export const metadata: Metadata = { title: 'New session' };
export const dynamic = 'force-dynamic';

export default async function NewSessionPage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Fsessions%2Fnew');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fsessions%2Fnew');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('active_org_id')
    .eq('id', user.id)
    .single();
  if (error || !profile) {
    throw new Error(`Failed to load profile: ${error?.message}`);
  }
  const activeOrgId = profile.active_org_id;
  const canCreate = activeOrgId !== null;

  let activeOrgName: string | null = null;
  if (activeOrgId) {
    const { data: orgRow } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', activeOrgId)
      .single();
    activeOrgName = orgRow?.name ?? null;
  }

  return (
    <main className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <div className="mx-auto flex max-w-[640px] flex-col gap-6 px-5 py-10">
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            New session
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-zinc-950">
            Create a session
          </h1>
          {canCreate ? (
            <p className="mt-3 text-[14px] text-zinc-600">
              Will be created in{' '}
              <span className="font-medium text-zinc-900">
                {activeOrgName ?? 'your active org'}
              </span>
              . Switch context in the header before submitting if that&rsquo;s wrong.
            </p>
          ) : (
            <p
              role="alert"
              data-testid="no-org-warning"
              className="mt-4 inline-flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] leading-snug text-amber-900"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
              />
              You need an organisation first. Sessions always belong to an org — go to{' '}
              <Link
                href="/app/orgs"
                className="underline-offset-2 hover:underline"
              >
                Organisations
              </Link>{' '}
              to create one, then come back.
            </p>
          )}
        </header>
        <CreateSessionForm canCreate={canCreate} />
        <Link
          href="/app/sessions"
          className="self-start text-[13px] text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
        >
          ← Back to sessions
        </Link>
      </div>
    </main>
  );
}
