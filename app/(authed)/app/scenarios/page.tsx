import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PageBanner } from '@/components/app/PageBanner';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { Scenario } from '@/lib/scenarios/types';

import { NewScenarioButton } from './NewScenarioButton';
import type { OrgOption } from './ScenarioEditorDialog';
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

  // RLS filters: templates + own rows + caller's-org rows + rows picked into
  // sessions the caller can see.
  const res = await supabase
    .from('scenarios')
    .select(
      'id, org_id, stage_type, title, body, tags, duration_minutes, is_template, created_by, created_at',
    )
    .order('stage_type', { ascending: true })
    .order('title', { ascending: true });

  if (res.error) {
    throw new Error(`Failed to load scenarios: ${res.error.message}`);
  }
  const allVisible = (res.data ?? []) as unknown as Scenario[];

  // Workshops the caller belongs to — the editor's destination options and
  // the org-name labels on custom-scenario chips.
  const membershipRes = await supabase
    .from('org_memberships')
    .select('organisations:org_id ( id, name )')
    .eq('profile_id', user.id);
  if (membershipRes.error) {
    throw new Error(`Failed to load workshops: ${membershipRes.error.message}`);
  }
  const orgs: OrgOption[] = (membershipRes.data ?? [])
    .map((row) => (row as { organisations: OrgOption | null }).organisations)
    .filter((o): o is OrgOption => o !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
  const orgNames: Record<string, string> = Object.fromEntries(orgs.map((o) => [o.id, o.name]));

  // The library shows templates, the caller's own scenarios, and their orgs'
  // scenarios. Rows visible only via the picked-into-a-session RLS branch
  // (e.g. another member's personal scenario) belong on the session page,
  // not in this library.
  const scenarios = allVisible.filter(
    (s) => s.is_template || s.created_by === user.id || (s.org_id !== null && s.org_id in orgNames),
  );

  return (
    <>
      <PageBanner
        eyebrow="BrickThink"
        title="Scenarios"
        subtitle="Canonical LEGO® SERIOUS PLAY® exercises for each stage of a session."
        maxWidthClassName="max-w-6xl"
        actions={<NewScenarioButton orgs={orgs} />}
      />
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <ScenariosList
          scenarios={scenarios}
          myProfileId={user.id}
          orgNames={orgNames}
          orgs={orgs}
        />
      </div>
    </>
  );
}
