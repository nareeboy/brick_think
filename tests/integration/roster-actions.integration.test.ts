// Integration tests for the four facilitator-side roster actions
// (remove / restore / spotlight / resolveSpotlightTarget).
//
// Pattern follows join-code-redeem.integration.test.ts:
//   - vi.mock('next/cache') + vi.mock('@/lib/db/server') before the action import
//   - getServiceSupabaseClient() is NOT mocked — works against the real local stack
//   - Per-suite fixture via createTestUser / createTestOrg / createTestSession
//
// Cleanup order: cleanupTestUser purges sessions facilitated by a user, which
// cascades stage_rooms, stage_room_members, session_participants and models.
// We delete the facilitator last so participants' membership rows go down
// with the cascade rather than tripping the NO-ACTION fkey on profiles.

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  addOrgMember,
  cleanupTestUser,
  createTestOrg,
  createTestSession,
  createTestUser,
  getAdminClient,
  makeAnonClient,
  signInAs,
  type TestOrg,
  type TestSession,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) {
      // Mimic the unauthenticated branch — fresh anon client, no session.
      return makeAnonClient();
    }
    return currentClient;
  }),
}));

// Import AFTER mocks are registered.
import {
  removeParticipantAction,
  resolveSpotlightTargetModelAction,
  restoreParticipantAction,
  setSpotlightAction,
} from '@/app/(authed)/app/sessions/roster-actions';

interface Fixture {
  facilitator: TestUser;
  alice: TestUser;
  bob: TestUser;
  outsider: TestUser;
  org: TestOrg;
  session: TestSession;
  // Independent session for the no-current-stage spotlight test, so we can
  // leave session.current_stage_id set on the primary fixture.
  blankStageSession: TestSession;
}

let fx: Fixture;

/**
 * Seed a fresh "active" session_participants row for `user` on the fixture
 * session. Idempotent — if a row already exists it's reset (removed_at +
 * removed_by_profile_id cleared). Tests that need a kicked row should
 * follow this with their own UPDATE.
 */
async function ensureActiveParticipant(user: TestUser): Promise<void> {
  const admin = getAdminClient();
  const res = await admin
    .from('session_participants')
    .upsert(
      {
        session_id: fx.session.id,
        profile_id: user.id,
        removed_at: null,
        removed_by_profile_id: null,
      },
      { onConflict: 'session_id,profile_id' },
    );
  if (res.error) throw new Error(`ensureActiveParticipant failed: ${res.error.message}`);
}

/** Soft-delete a participant via service-role. Used to set up restore tests. */
async function softDeleteParticipant(user: TestUser): Promise<void> {
  const admin = getAdminClient();
  const res = await admin
    .from('session_participants')
    .update({ removed_at: new Date().toISOString(), removed_by_profile_id: fx.facilitator.id })
    .eq('session_id', fx.session.id)
    .eq('profile_id', user.id);
  if (res.error) throw new Error(`softDeleteParticipant failed: ${res.error.message}`);
}

/** Seed a stage_rooms row + a stage_room_members row pinning `user` to it. */
async function seedRoomMembership(user: TestUser, stageId: string, position: number): Promise<string> {
  const admin = getAdminClient();
  const roomRes = await admin
    .from('stage_rooms')
    .insert({ stage_id: stageId, position, title: `Room ${position + 1}` })
    .select('id')
    .single();
  if (roomRes.error || !roomRes.data) {
    throw new Error(`seedRoomMembership stage_rooms insert failed: ${roomRes.error?.message}`);
  }
  const roomId = roomRes.data.id as string;
  const memberRes = await admin.from('stage_room_members').insert({
    room_id: roomId,
    stage_id: stageId,
    profile_id: user.id,
  });
  if (memberRes.error) {
    throw new Error(`seedRoomMembership members insert failed: ${memberRes.error.message}`);
  }
  return roomId;
}

/** Seed a per-participant model on the given stage. */
async function seedParticipantModel(user: TestUser, stageId: string): Promise<string> {
  const admin = getAdminClient();
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: user.id,
      session_id: fx.session.id,
      stage_id: stageId,
      title: `${user.email} model`,
      canvas_state: { groups: [], bricks: [] },
    })
    .select('id')
    .single();
  if (res.error || !res.data) {
    throw new Error(`seedParticipantModel failed: ${res.error?.message}`);
  }
  return res.data.id as string;
}

/** Set sessions.current_stage_id via service role. */
async function setCurrentStage(sessionId: string, stageId: string | null): Promise<void> {
  const admin = getAdminClient();
  const res = await admin
    .from('sessions')
    .update({ current_stage_id: stageId })
    .eq('id', sessionId);
  if (res.error) throw new Error(`setCurrentStage failed: ${res.error.message}`);
}

beforeAll(async () => {
  const facilitator = await createTestUser();
  const alice = await createTestUser();
  const bob = await createTestUser();
  const outsider = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  await addOrgMember({ orgId: org.id, profileId: alice.id, role: 'member' });
  await addOrgMember({ orgId: org.id, profileId: bob.id, role: 'member' });

  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'roster fixture',
  });
  const blankStageSession = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'roster fixture (no current stage)',
  });

  fx = { facilitator, alice, bob, outsider, org, session, blankStageSession };

  // Default state on the primary session: current_stage_id pointing at
  // individual_model so spotlight-resolution tests have something to look up
  // against. Tests that need the alternative state flip it explicitly.
  await setCurrentStage(session.id, session.stageIds.individual_model);
  // blankStageSession deliberately leaves current_stage_id NULL (default).
});

afterAll(async () => {
  if (!fx) return;
  // Order: participants first so their session_participants rows are deleted
  // via auth-user cascade before the facilitator delete sweeps the sessions
  // those rows reference (the session-side FK is ON DELETE CASCADE too, but
  // doing it in this order keeps cleanup symmetric with the rest of the
  // suite).
  await cleanupTestUser(fx.alice.id);
  await cleanupTestUser(fx.bob.id);
  await cleanupTestUser(fx.outsider.id);
  await cleanupTestUser(fx.facilitator.id);
});

describe('removeParticipantAction', () => {
  test('soft-deletes the participant and clears their stage_room_members rows for this session', async () => {
    await ensureActiveParticipant(fx.alice);
    const roomId = await seedRoomMembership(
      fx.alice,
      fx.session.stageIds.shared_model,
      // position 0 — wipe pre-existing rooms first so the unique
      // (stage_id, position) constraint doesn't trip if another test left
      // a Room 1 behind.
      0,
    );

    currentClient = await signInAs(fx.facilitator);
    const result = await removeParticipantAction(fx.session.id, fx.alice.id);
    expect(result).toEqual({ ok: true });

    const admin = getAdminClient();

    const partRes = await admin
      .from('session_participants')
      .select('removed_at, removed_by_profile_id')
      .eq('session_id', fx.session.id)
      .eq('profile_id', fx.alice.id)
      .single();
    expect(partRes.error).toBeNull();
    expect(partRes.data?.removed_at).not.toBeNull();
    expect(partRes.data?.removed_by_profile_id).toBe(fx.facilitator.id);

    const memberRes = await admin
      .from('stage_room_members')
      .select('profile_id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('profile_id', fx.alice.id);
    expect(memberRes.error).toBeNull();
    expect(memberRes.count).toBe(0);

    // Cleanup: drop the seeded room so subsequent tests have a clean stage.
    await admin.from('stage_rooms').delete().eq('id', roomId);
  });

  test('rejects removing the facilitator themselves', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await removeParticipantAction(fx.session.id, fx.facilitator.id);
    expect(result).toEqual({ ok: false, code: 'cannot_remove_facilitator' });
  });

  test('rejects non-facilitator caller', async () => {
    await ensureActiveParticipant(fx.bob);
    currentClient = await signInAs(fx.alice);
    const result = await removeParticipantAction(fx.session.id, fx.bob.id);
    expect(result).toEqual({ ok: false, code: 'not_facilitator' });
  });

  test('rejects with participant_not_found when the profile has no row', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await removeParticipantAction(fx.session.id, fx.outsider.id);
    expect(result).toEqual({ ok: false, code: 'participant_not_found' });
  });

  test('returns unauthenticated when no caller', async () => {
    currentClient = null;
    const result = await removeParticipantAction(fx.session.id, fx.alice.id);
    expect(result).toEqual({ ok: false, code: 'unauthenticated' });
  });
});

describe('restoreParticipantAction', () => {
  test('clears removed_at on a previously-removed participant', async () => {
    await ensureActiveParticipant(fx.alice);
    await softDeleteParticipant(fx.alice);

    currentClient = await signInAs(fx.facilitator);
    const result = await restoreParticipantAction(fx.session.id, fx.alice.id);
    expect(result).toEqual({ ok: true });

    const admin = getAdminClient();
    const partRes = await admin
      .from('session_participants')
      .select('removed_at, removed_by_profile_id')
      .eq('session_id', fx.session.id)
      .eq('profile_id', fx.alice.id)
      .single();
    expect(partRes.error).toBeNull();
    expect(partRes.data?.removed_at).toBeNull();
    expect(partRes.data?.removed_by_profile_id).toBeNull();
  });

  test('rejects non-facilitator caller', async () => {
    await ensureActiveParticipant(fx.bob);
    currentClient = await signInAs(fx.alice);
    const result = await restoreParticipantAction(fx.session.id, fx.bob.id);
    expect(result).toEqual({ ok: false, code: 'not_facilitator' });
  });

  test('rejects with participant_not_found when there is no row', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await restoreParticipantAction(fx.session.id, fx.outsider.id);
    expect(result).toEqual({ ok: false, code: 'participant_not_found' });
  });

  test('returns unauthenticated when no caller', async () => {
    currentClient = null;
    const result = await restoreParticipantAction(fx.session.id, fx.alice.id);
    expect(result).toEqual({ ok: false, code: 'unauthenticated' });
  });
});

describe('setSpotlightAction', () => {
  test('writes spotlight_target_profile_id when target is an active participant', async () => {
    await ensureActiveParticipant(fx.alice);

    currentClient = await signInAs(fx.facilitator);
    const result = await setSpotlightAction(fx.session.id, fx.alice.id);
    expect(result).toEqual({ ok: true });

    const admin = getAdminClient();
    const sessRes = await admin
      .from('sessions')
      .select('spotlight_target_profile_id')
      .eq('id', fx.session.id)
      .single();
    expect(sessRes.data?.spotlight_target_profile_id).toBe(fx.alice.id);
  });

  test('rejects when target is not a participant', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await setSpotlightAction(fx.session.id, fx.outsider.id);
    expect(result).toEqual({ ok: false, code: 'target_not_participant' });
  });

  test('rejects when target is soft-deleted (treated as not a participant)', async () => {
    await ensureActiveParticipant(fx.bob);
    await softDeleteParticipant(fx.bob);

    currentClient = await signInAs(fx.facilitator);
    const result = await setSpotlightAction(fx.session.id, fx.bob.id);
    expect(result).toEqual({ ok: false, code: 'target_not_participant' });
  });

  test('clears spotlight when targetProfileId is null', async () => {
    // First set spotlight to alice so we have something to clear.
    await ensureActiveParticipant(fx.alice);
    currentClient = await signInAs(fx.facilitator);
    const setRes = await setSpotlightAction(fx.session.id, fx.alice.id);
    expect(setRes).toEqual({ ok: true });

    // Now clear.
    const clearRes = await setSpotlightAction(fx.session.id, null);
    expect(clearRes).toEqual({ ok: true });

    const admin = getAdminClient();
    const sessRes = await admin
      .from('sessions')
      .select('spotlight_target_profile_id')
      .eq('id', fx.session.id)
      .single();
    expect(sessRes.data?.spotlight_target_profile_id).toBeNull();
  });

  test('rejects non-facilitator caller', async () => {
    await ensureActiveParticipant(fx.alice);
    currentClient = await signInAs(fx.alice);
    const result = await setSpotlightAction(fx.session.id, fx.alice.id);
    expect(result).toEqual({ ok: false, code: 'not_facilitator' });
  });

  test('returns unauthenticated when no caller', async () => {
    currentClient = null;
    const result = await setSpotlightAction(fx.session.id, fx.alice.id);
    expect(result).toEqual({ ok: false, code: 'unauthenticated' });
  });
});

describe('resolveSpotlightTargetModelAction', () => {
  test('returns the model URL when the target has a model on the current stage', async () => {
    const stageId = fx.session.stageIds.individual_model;
    await setCurrentStage(fx.session.id, stageId);
    const modelId = await seedParticipantModel(fx.alice, stageId);

    currentClient = await signInAs(fx.facilitator);
    const result = await resolveSpotlightTargetModelAction(fx.session.id, fx.alice.id);
    expect(result).toEqual({ ok: true, modelUrl: `/app/designs/${modelId}` });

    // Cleanup: drop the seeded model so the "no model" test below is clean.
    const admin = getAdminClient();
    await admin.from('models').delete().eq('id', modelId);
  });

  test('returns modelUrl=null when the target has no model on the current stage', async () => {
    await setCurrentStage(fx.session.id, fx.session.stageIds.individual_model);

    currentClient = await signInAs(fx.facilitator);
    const result = await resolveSpotlightTargetModelAction(fx.session.id, fx.bob.id);
    expect(result).toEqual({ ok: true, modelUrl: null });
  });

  test('returns no_current_stage when the session has no current stage set', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await resolveSpotlightTargetModelAction(
      fx.blankStageSession.id,
      fx.alice.id,
    );
    expect(result).toEqual({ ok: false, code: 'no_current_stage' });
  });

  test('returns unauthenticated when no caller', async () => {
    currentClient = null;
    const result = await resolveSpotlightTargetModelAction(fx.session.id, fx.alice.id);
    expect(result).toEqual({ ok: false, code: 'unauthenticated' });
  });

  test('allows any signed-in caller (not just the facilitator)', async () => {
    // The spotlight banner shows to every viewer, so non-facilitators must
    // be able to resolve. Verify with `fx.alice` (a participant, not the
    // facilitator) — same successful return as the facilitator case.
    await setCurrentStage(fx.session.id, fx.session.stageIds.individual_model);
    const modelId = await seedParticipantModel(fx.bob, fx.session.stageIds.individual_model);

    currentClient = await signInAs(fx.alice);
    const result = await resolveSpotlightTargetModelAction(fx.session.id, fx.bob.id);
    expect(result).toEqual({ ok: true, modelUrl: `/app/designs/${modelId}` });

    const admin = getAdminClient();
    await admin.from('models').delete().eq('id', modelId);
  });
});
