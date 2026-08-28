// Integration coverage for the configuration flow's first-session hook
// (lib/onboarding/firstSession.ts, called from createSessionWithStages):
//
// - a purpose answer pre-assigns the mapped template scenario to every stage
//   and pre-fills the brief with one short sentence, exactly once — the
//   second session gets nothing;
// - `not_sure` pre-assigns nothing;
// - queued step-5 invites dispatch through the standard invite path on the
//   first session (when a join code finally exists) and the queue clears.
//
// Harness mirrors createSession.integration.test.ts: setup.ts mocks the
// Next.js plumbing, setActionClient supplies a real signed-in anon client,
// so everything runs against the local stack with real RLS.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { setActionClient } from './_helpers/action-mocks';
import {
  cleanupTestUser,
  createTestOrg,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestOrg,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

import { createSessionWithStages } from '@/lib/sessions/service';
import { PURPOSE_BRIEF_SENTENCES, PURPOSE_SCENARIO_TITLES } from '@/lib/scenarios/purposeMap';

async function seedOnboarding(userId: string, config: Record<string, unknown>): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({
      onboarding: {
        v: 1,
        config: {
          completed_at: new Date().toISOString(),
          role: 'facilitator',
          fluency: null,
          purpose: null,
          group_size: null,
          pending_invites: [],
          purpose_applied: false,
          invites_dispatched: false,
          ...config,
        },
        pathways: { build: 'not_started', workshop: 'not_started', session: 'not_started' },
        welcome_dismissed_at: null,
        events: [],
      },
    })
    .eq('id', userId);
  if (error) throw new Error(`seedOnboarding failed: ${error.message}`);
}

async function readOnboardingConfig(userId: string): Promise<Record<string, unknown>> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('onboarding')
    .eq('id', userId)
    .single();
  if (error) throw new Error(error.message);
  return (data.onboarding as { config: Record<string, unknown> }).config;
}

describe('onboarding first-session hook', () => {
  let facilitator: TestUser;
  let org: TestOrg;

  beforeAll(async () => {
    facilitator = await createTestUser();
    org = await createTestOrg({ ownerId: facilitator.id });
  });

  afterAll(async () => {
    if (facilitator) await cleanupTestUser(facilitator.id);
  });

  test('purpose pre-assigns template scenarios and the brief, exactly once', async () => {
    await seedOnboarding(facilitator.id, { purpose: 'retrospective' });
    const supabase = await signInAs(facilitator);
    setActionClient(supabase);

    const first = await createSessionWithStages({
      supabase,
      userId: facilitator.id,
      orgId: org.id,
      title: 'First session with purpose',
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const admin = getAdminClient();
    const [stagesRes, templatesRes] = await Promise.all([
      admin.from('stages').select('stage_type, scenario_id').eq('session_id', first.data.sessionId),
      admin.from('scenarios').select('id, title').eq('is_template', true),
    ]);
    expect(stagesRes.error).toBeNull();
    expect(templatesRes.error).toBeNull();
    const titleById = new Map((templatesRes.data ?? []).map((t) => [t.id, t.title]));
    const expected = PURPOSE_SCENARIO_TITLES.retrospective;
    for (const stage of stagesRes.data ?? []) {
      expect(
        stage.scenario_id === null ? null : titleById.get(stage.scenario_id),
        `stage ${stage.stage_type}`,
      ).toBe(expected[stage.stage_type as keyof typeof expected]);
    }

    const sessionRes = await admin
      .from('sessions')
      .select('brief_text')
      .eq('id', first.data.sessionId)
      .single();
    expect(sessionRes.data?.brief_text).toBe(PURPOSE_BRIEF_SENTENCES.retrospective);

    const config = await readOnboardingConfig(facilitator.id);
    expect(config.purpose_applied).toBe(true);

    // The SECOND session is untouched — first-session sugar applies once.
    const second = await createSessionWithStages({
      supabase,
      userId: facilitator.id,
      orgId: org.id,
      title: 'Second session stays clean',
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const secondStages = await admin
      .from('stages')
      .select('scenario_id')
      .eq('session_id', second.data.sessionId);
    expect((secondStages.data ?? []).every((s) => s.scenario_id === null)).toBe(true);
  });

  test('not_sure pre-assigns nothing', async () => {
    const user = await createTestUser();
    try {
      const ownOrg = await createTestOrg({ ownerId: user.id });
      await seedOnboarding(user.id, { purpose: 'not_sure' });
      const supabase = await signInAs(user);
      setActionClient(supabase);

      const res = await createSessionWithStages({
        supabase,
        userId: user.id,
        orgId: ownOrg.id,
        title: 'Not sure yet',
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      const admin = getAdminClient();
      const stages = await admin
        .from('stages')
        .select('scenario_id')
        .eq('session_id', res.data.sessionId);
      expect((stages.data ?? []).every((s) => s.scenario_id === null)).toBe(true);
      const session = await admin
        .from('sessions')
        .select('brief_text')
        .eq('id', res.data.sessionId)
        .single();
      expect(session.data?.brief_text).toBeNull();
    } finally {
      await cleanupTestUser(user.id);
    }
  });

  test('queued invites dispatch on the first session and the queue clears', async () => {
    const user = await createTestUser();
    try {
      const ownOrg = await createTestOrg({ ownerId: user.id });
      const invitee = `invitee-${Date.now().toString(36)}@brick-think.test`;
      await seedOnboarding(user.id, { pending_invites: [invitee] });
      const supabase = await signInAs(user);
      setActionClient(supabase);

      const res = await createSessionWithStages({
        supabase,
        userId: user.id,
        orgId: ownOrg.id,
        title: 'Session with queued invites',
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      const admin = getAdminClient();
      const invitations = await admin
        .from('session_invitations')
        .select('email')
        .eq('session_id', res.data.sessionId);
      expect(invitations.error).toBeNull();
      expect(invitations.data?.map((i) => i.email.toLowerCase())).toContain(invitee);

      const config = await readOnboardingConfig(user.id);
      expect(config.invites_dispatched).toBe(true);
      expect(config.pending_invites).toEqual([]);
    } finally {
      await cleanupTestUser(user.id);
    }
  });
});
