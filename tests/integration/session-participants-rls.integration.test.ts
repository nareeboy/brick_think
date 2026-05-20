// RLS isolation tests for session_participants: a participant can SELECT
// their own session but NOT a sibling session in the same org.
//
// Tests the RLS extensions from Task 1 migration that gate session/stage/model
// visibility via session_participants membership.
//
// Pattern follows sessions-rls.integration.test.ts:
//   - Per-suite fixture via createTestUser / createTestOrg / createTestSession
//   - signInAs() returns a user-scoped client for direct-DB queries
//   - getAdminClient() bypasses RLS for seeding and verification

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
import {
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

interface Fixture {
  facilitator: TestUser;
  alice: TestUser;
  org: TestOrg;
  sessionA: TestSession;
  sessionB: TestSession;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const alice = await createTestUser();

  // Create a single org with both facilitator and alice (alice will become
  // a participant via join code, not org membership).
  const org = await createTestOrg({ ownerId: facilitator.id });

  // Create two sessions under the same org and facilitator.
  const sessionA = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'Session A',
  });
  const sessionB = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'Session B',
  });

  // Backfill join codes on both sessions so we can seed participant rows.
  const admin = getAdminClient();
  async function setJoinCode(sessionId: string): Promise<void> {
    const codeRes = await admin.rpc('generate_join_code');
    if (codeRes.error || !codeRes.data) {
      throw new Error(`generate_join_code rpc failed: ${codeRes.error?.message}`);
    }
    const upd = await admin
      .from('sessions')
      .update({ join_code: codeRes.data as string })
      .eq('id', sessionId);
    if (upd.error) throw new Error(`backfill join_code failed: ${upd.error.message}`);
  }
  await setJoinCode(sessionA.id);
  await setJoinCode(sessionB.id);

  // Create a session_participants row for alice on sessionA only.
  const partRes = await admin.from('session_participants').insert({
    session_id: sessionA.id,
    profile_id: alice.id,
  });
  if (partRes.error) throw new Error(`seed participant row failed: ${partRes.error.message}`);

  fx = { facilitator, alice, org, sessionA, sessionB };
});

afterAll(async () => {
  if (!fx) return;
  // Order: alice first (participant), then facilitator (session owner).
  await cleanupTestUser(fx.alice.id);
  await cleanupTestUser(fx.facilitator.id);
});

describe('RLS — session_participants isolation', () => {
  test('participant can SELECT their session but NOT a sibling session', async () => {
    const aliceClient = await signInAs(fx.alice);

    // Alice is a participant on sessionA — she can read it.
    const sessionARes = await aliceClient
      .from('sessions')
      .select('id')
      .eq('id', fx.sessionA.id)
      .maybeSingle();
    expect(sessionARes.error).toBeNull();
    expect(sessionARes.data?.id).toBe(fx.sessionA.id);

    // Alice is NOT a participant on sessionB — it should not be visible.
    const sessionBRes = await aliceClient
      .from('sessions')
      .select('id')
      .eq('id', fx.sessionB.id)
      .maybeSingle();
    expect(sessionBRes.error).toBeNull();
    expect(sessionBRes.data).toBeNull();
  });

  test('participant can read stages of their session', async () => {
    const aliceClient = await signInAs(fx.alice);

    // Alice can query stages for her session (sessionA).
    const stagesRes = await aliceClient
      .from('stages')
      .select('id')
      .eq('session_id', fx.sessionA.id);
    expect(stagesRes.error).toBeNull();
    // createTestSession seeds all CANONICAL_STAGE_TYPES, so at least one.
    expect((stagesRes.data ?? []).length).toBeGreaterThan(0);

    // Alice cannot query stages for sessionB (RLS filters silently).
    const sessionBStagesRes = await aliceClient
      .from('stages')
      .select('id')
      .eq('session_id', fx.sessionB.id);
    expect(sessionBStagesRes.error).toBeNull();
    expect((sessionBStagesRes.data ?? []).length).toBe(0);
  });

  test('participant can read shared_model models on their session via user-scoped client', async () => {
    // Seed a shared_model on sessionA (owned by facilitator).
    const admin = getAdminClient();
    const modelRes = await admin
      .from('models')
      .insert({
        owner_profile_id: fx.facilitator.id,
        session_id: fx.sessionA.id,
        stage_id: fx.sessionA.stageIds.shared_model,
        title: 'fixture shared model',
        canvas_state: EMPTY_CANVAS_STATE,
      })
      .select('id')
      .single();
    if (modelRes.error || !modelRes.data) {
      throw new Error(`seed model failed: ${modelRes.error?.message}`);
    }
    const modelId = modelRes.data.id as string;

    // Alice (participant on sessionA) can read the model.
    const aliceClient = await signInAs(fx.alice);
    const readRes = await aliceClient
      .from('models')
      .select('id')
      .eq('session_id', fx.sessionA.id)
      .maybeSingle();
    expect(readRes.error).toBeNull();
    expect(readRes.data?.id).toBe(modelId);

    // Cleanup the seeded model.
    await admin.from('models').delete().eq('id', modelId);
  });
});
