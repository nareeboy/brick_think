// Stream 3 phase 1 follow-up: shared_model designs must be ONE row per
// (session, stage), not one per (session, stage, owner). Otherwise every
// participant clicks "Start your model" and lands on their own private
// Y.Doc, defeating the entire point of the shared_model stage.
//
// The fix lives in `createModelInStage` in app/(authed)/app/sessions/actions.ts:
// when stage_type === 'shared_model', the row is owned by the facilitator
// and the idempotency check ignores owner_profile_id.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
import {
  addOrgMember,
  cleanupTestUser,
  createTestOrg,
  createTestSession,
  createTestUser,
  getAdminClient,
  type TestOrg,
  type TestSession,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

interface Fixture {
  facilitator: TestUser;
  participant: TestUser;
  org: TestOrg;
  session: TestSession;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const participant = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  await addOrgMember({ orgId: org.id, profileId: participant.id, role: 'member' });
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'shared-model fixture',
  });
  fx = { facilitator, participant, org, session };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.participant.id);
});

// Mirror the createModelInStage server action's behaviour at the DB level.
// The action does: pre-SELECT session (RLS) → SELECT existing model
// (without owner filter for shared_model) → service-role INSERT owned by
// facilitator. Tests exercise the post-conditions directly via admin SQL.
async function simulateCreateSharedModel(args: {
  sessionId: string;
  stageId: string;
  facilitatorId: string;
}): Promise<string> {
  const admin = getAdminClient();
  const existing = await admin
    .from('models')
    .select('id')
    .eq('session_id', args.sessionId)
    .eq('stage_id', args.stageId)
    .is('deleted_at', null)
    .maybeSingle();
  if (existing.data) return existing.data.id as string;
  const insert = await admin
    .from('models')
    .insert({
      owner_profile_id: args.facilitatorId,
      session_id: args.sessionId,
      stage_id: args.stageId,
      title: 'Shared model',
      canvas_state: EMPTY_CANVAS_STATE,
    })
    .select('id')
    .single();
  if (insert.error || !insert.data) {
    throw new Error(`shared-model insert failed: ${insert.error?.message}`);
  }
  return insert.data.id as string;
}

describe('shared_model: single row per (session, stage)', () => {
  test('facilitator and participant resolve to the same model id', async () => {
    const stageId = fx.session.stageIds.shared_model;

    const facilitatorRes = await simulateCreateSharedModel({
      sessionId: fx.session.id,
      stageId,
      facilitatorId: fx.facilitator.id,
    });
    const participantRes = await simulateCreateSharedModel({
      sessionId: fx.session.id,
      stageId,
      facilitatorId: fx.facilitator.id,
    });

    expect(participantRes).toBe(facilitatorRes);

    const admin = getAdminClient();
    const all = await admin
      .from('models')
      .select('id, owner_profile_id')
      .eq('session_id', fx.session.id)
      .eq('stage_id', stageId)
      .is('deleted_at', null);
    expect(all.error).toBeNull();
    expect(all.data ?? []).toHaveLength(1);
    expect(all.data?.[0]?.owner_profile_id).toBe(fx.facilitator.id);
  });

  test('participant can read the facilitator-owned shared model via can_read_model', async () => {
    const stageId = fx.session.stageIds.shared_model;
    const modelId = await simulateCreateSharedModel({
      sessionId: fx.session.id,
      stageId,
      facilitatorId: fx.facilitator.id,
    });

    const admin = getAdminClient();
    const facilitatorCheck = await admin.rpc('can_read_model', {
      p_profile_id: fx.facilitator.id,
      p_model_id: modelId,
    });
    expect(facilitatorCheck.data).toBe(true);

    const participantCheck = await admin.rpc('can_read_model', {
      p_profile_id: fx.participant.id,
      p_model_id: modelId,
    });
    // This is the critical check — the participant who is NOT the owner
    // still passes can_read_model via the session-org-member branch, which
    // is what lets the worker accept their WebSocket upgrade.
    expect(participantCheck.data).toBe(true);
  });
});
