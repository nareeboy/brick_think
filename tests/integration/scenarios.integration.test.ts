// Integration tests for scenario-actions — facilitator-gated, RLS-scoped.
//
// Pattern follows stage-controller.integration.test.ts:
//   - vi.mock('next/cache') + vi.mock('@/lib/db/server') before the action import
//   - getServiceSupabaseClient() is NOT mocked — works against the real local stack
//   - Per-test fixture via createTestUser / createTestOrg / createTestSession / addOrgMember

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  addOrgMember,
  cleanupTestUser,
  createTestOrg,
  createTestSession,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestOrg,
  type TestSession,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set in test');
    return currentClient;
  }),
}));

import {
  setStageScenarioAction,
  updateSessionBriefAction,
} from '@/app/(authed)/app/sessions/scenario-actions';

interface Fixture {
  facilitator: TestUser;
  participant: TestUser;
  outsider: TestUser;
  org: TestOrg;
  session: TestSession;
  /** A template scenario id selected from the seeds; resolved in beforeAll. */
  templateScenarioId: string;
  /** stages.id for the skill_building stage (so we can pick a matching scenario). */
  skillBuildingStageId: string;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const participant = await createTestUser();
  const outsider = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  await addOrgMember({ orgId: org.id, profileId: participant.id, role: 'member' });

  // createTestSession seeds all five canonical stages and exposes their ids.
  const session = await createTestSession({ orgId: org.id, facilitatorId: facilitator.id });

  const admin = getAdminClient();
  const scenarioRes = await admin
    .from('scenarios')
    .select('id')
    .eq('is_template', true)
    .eq('stage_type', 'skill_building')
    .limit(1)
    .single();
  if (scenarioRes.error || !scenarioRes.data) throw new Error('seed scenario missing');

  fx = {
    facilitator,
    participant,
    outsider,
    org,
    session,
    templateScenarioId: scenarioRes.data.id,
    skillBuildingStageId: session.stageIds.skill_building,
  };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.participant.id);
  await cleanupTestUser(fx.outsider.id);
});

describe('setStageScenarioAction', () => {
  test('facilitator can pick a scenario for a stage', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await setStageScenarioAction(fx.skillBuildingStageId, fx.templateScenarioId);
    expect(result).toEqual({ ok: true });

    const admin = getAdminClient();
    const stage = await admin
      .from('stages')
      .select('scenario_id')
      .eq('id', fx.skillBuildingStageId)
      .single();
    expect(stage.data?.scenario_id).toBe(fx.templateScenarioId);
  });

  test('passing null clears the pick', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await setStageScenarioAction(fx.skillBuildingStageId, null);
    expect(result).toEqual({ ok: true });
    const admin = getAdminClient();
    const stage = await admin
      .from('stages')
      .select('scenario_id')
      .eq('id', fx.skillBuildingStageId)
      .single();
    expect(stage.data?.scenario_id).toBeNull();
  });

  test('non-facilitator participant is refused', async () => {
    currentClient = await signInAs(fx.participant);
    const result = await setStageScenarioAction(fx.skillBuildingStageId, fx.templateScenarioId);
    expect(result).toEqual({ ok: false, code: 'not_facilitator' });
  });

  test('outsider gets stage_not_found (RLS hides the row)', async () => {
    currentClient = await signInAs(fx.outsider);
    const result = await setStageScenarioAction(fx.skillBuildingStageId, fx.templateScenarioId);
    expect(result).toEqual({ ok: false, code: 'stage_not_found' });
  });

  test('invalid stage uuid', async () => {
    currentClient = await signInAs(fx.facilitator);
    expect(await setStageScenarioAction('not-a-uuid', fx.templateScenarioId)).toEqual({
      ok: false,
      code: 'invalid_uuid',
    });
  });

  test('unknown scenario id', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await setStageScenarioAction(
      fx.skillBuildingStageId,
      '00000000-0000-0000-0000-000000000000',
    );
    expect(result).toEqual({ ok: false, code: 'scenario_not_found' });
  });

  test('scenario for a different stage_type is refused', async () => {
    currentClient = await signInAs(fx.facilitator);
    // Find an individual_model template — won't match the skill_building stage.
    const admin = getAdminClient();
    const wrong = await admin
      .from('scenarios')
      .select('id')
      .eq('is_template', true)
      .eq('stage_type', 'individual_model')
      .limit(1)
      .single();
    expect(wrong.data?.id).toBeTruthy();
    const result = await setStageScenarioAction(fx.skillBuildingStageId, wrong.data!.id);
    expect(result).toEqual({ ok: false, code: 'scenario_stage_mismatch' });
  });
});

describe('updateSessionBriefAction', () => {
  test('facilitator writes a brief', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await updateSessionBriefAction(fx.session.id, 'Workshop brief goes here.');
    expect(result).toEqual({ ok: true });
    const admin = getAdminClient();
    const sess = await admin.from('sessions').select('brief_text').eq('id', fx.session.id).single();
    expect(sess.data?.brief_text).toBe('Workshop brief goes here.');
  });

  test('null clears the brief', async () => {
    currentClient = await signInAs(fx.facilitator);
    expect(await updateSessionBriefAction(fx.session.id, null)).toEqual({ ok: true });
    const admin = getAdminClient();
    const sess = await admin.from('sessions').select('brief_text').eq('id', fx.session.id).single();
    expect(sess.data?.brief_text).toBeNull();
  });

  test('empty string after trim clears the brief', async () => {
    // Seed something non-null first so we can observe the clear.
    const admin = getAdminClient();
    await admin.from('sessions').update({ brief_text: 'prior' }).eq('id', fx.session.id);

    currentClient = await signInAs(fx.facilitator);
    expect(await updateSessionBriefAction(fx.session.id, '   ')).toEqual({ ok: true });
    const sess = await admin.from('sessions').select('brief_text').eq('id', fx.session.id).single();
    expect(sess.data?.brief_text).toBeNull();
  });

  test('rejects briefs over 4000 chars', async () => {
    currentClient = await signInAs(fx.facilitator);
    const long = 'a'.repeat(4001);
    expect(await updateSessionBriefAction(fx.session.id, long)).toEqual({
      ok: false,
      code: 'brief_too_long',
    });
  });

  test('non-facilitator is refused', async () => {
    currentClient = await signInAs(fx.participant);
    expect(await updateSessionBriefAction(fx.session.id, 'sneaky')).toEqual({
      ok: false,
      code: 'not_facilitator',
    });
  });

  test('invalid uuid', async () => {
    currentClient = await signInAs(fx.facilitator);
    expect(await updateSessionBriefAction('not-a-uuid', 'x')).toEqual({
      ok: false,
      code: 'invalid_uuid',
    });
  });
});

describe('RLS: scenarios visibility', () => {
  test('signed-in user sees all 20 template scenarios', async () => {
    const client = await signInAs(fx.participant);
    const res = await client.from('scenarios').select('id').eq('is_template', true);
    expect(res.error).toBeNull();
    expect(res.data?.length).toBe(20);
  });

  test('outsider also sees templates (templates are global)', async () => {
    const client = await signInAs(fx.outsider);
    const res = await client.from('scenarios').select('id').eq('is_template', true);
    expect(res.error).toBeNull();
    expect(res.data?.length).toBe(20);
  });
});
