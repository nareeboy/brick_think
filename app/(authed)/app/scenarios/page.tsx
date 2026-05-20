import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { Scenario } from '@/lib/scenarios/types';

import { ScenariosList } from './ScenariosList';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Scenarios · BrickThink',
};

export default async function ScenariosPage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp%2Fscenarios');
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Fscenarios');

  // RLS filters: templates + caller's-org rows.
  const res = await supabase
    .from('scenarios')
    .select('id, org_id, stage_type, title, body, tags, duration_minutes, is_template, created_at')
    .order('stage_type', { ascending: true })
    .order('title', { ascending: true });

  if (res.error) {
    throw new Error(`Failed to load scenarios: ${res.error.message}`);
  }
  const scenarios = (res.data ?? []) as unknown as Scenario[];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-serif text-[40px] leading-tight tracking-tight text-zinc-900">
            Scenarios
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-zinc-600">
            Canonical Serious Play exercises for each stage of a session.
          </p>
        </div>
        <span
          className="inline-flex h-9 items-center rounded-full bg-zinc-900/5 px-3 text-[12px] font-medium text-zinc-700"
          aria-label="Custom scenario authoring is on the Phase 2 roadmap"
        >
          Want to author your own? On the roadmap.
        </span>
      </div>

      <ScenariosList scenarios={scenarios} />
    </div>
  );
}
