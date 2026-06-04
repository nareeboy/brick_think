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
  cancelInvitationAction,
  getSpotlightBannerAction,
  inviteParticipantsByEmailAction,
  removeParticipantAction,
  resendInvitationAction,
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
  const res = await admin.from('session_participants').upsert(
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
async function seedRoomMembership(
  user: TestUser,
  stageId: string,
  position: number,
): Promise<string> {
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

/**
 * Seed a stage_rooms row + a facilitator-owned room canvas (models.room_id
 * set) on the given stage. Wipes pre-existing rooms on that stage first so the
 * unique (stage_id, position) constraint doesn't trip. Returns the room id,
 * model id, and the room title for banner-label assertions.
 */
async function seedRoomModel(
  stageId: string,
  position: number,
): Promise<{ roomId: string; modelId: string; roomTitle: string }> {
  const admin = getAdminClient();
  await admin.from('stage_rooms').delete().eq('stage_id', stageId);
  const roomTitle = `Room ${position + 1}`;
  const roomRes = await admin
    .from('stage_rooms')
    .insert({ stage_id: stageId, position, title: roomTitle })
    .select('id')
    .single();
  if (roomRes.error || !roomRes.data) {
    throw new Error(`seedRoomModel stage_rooms insert failed: ${roomRes.error?.message}`);
  }
  const roomId = roomRes.data.id as string;
  const modelRes = await admin
    .from('models')
    .insert({
      owner_profile_id: fx.facilitator.id,
      session_id: fx.session.id,
      stage_id: stageId,
      room_id: roomId,
      title: roomTitle,
      canvas_state: { groups: [], bricks: [] },
    })
    .select('id')
    .single();
  if (modelRes.error || !modelRes.data) {
    throw new Error(`seedRoomModel models insert failed: ${modelRes.error?.message}`);
  }
  return { roomId, modelId: modelRes.data.id as string, roomTitle };
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

  // Backfill join_code on the primary session. createTestSession doesn't
  // set one and there's no DB-side trigger — the invite action's defensive
  // "no join_code" branch returns all-failed, so the invite tests need a
  // real code present.
  const admin = getAdminClient();
  const codeRes = await admin.rpc('generate_join_code');
  if (codeRes.error || !codeRes.data) {
    throw new Error(`generate_join_code rpc failed: ${codeRes.error?.message}`);
  }
  const codeUpd = await admin
    .from('sessions')
    .update({ join_code: codeRes.data as string })
    .eq('id', session.id);
  if (codeUpd.error) throw new Error(`backfill join_code failed: ${codeUpd.error.message}`);
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
  test('writes spotlight_target_model_id for a model in the session', async () => {
    const admin = getAdminClient();
    await admin
      .from('models')
      .delete()
      .eq('session_id', fx.session.id)
      .eq('owner_profile_id', fx.alice.id);
    const modelId = await seedParticipantModel(fx.alice, fx.session.stageIds.individual_model);

    currentClient = await signInAs(fx.facilitator);
    const result = await setSpotlightAction(fx.session.id, modelId);
    expect(result).toEqual({ ok: true });

    const sessRes = await admin
      .from('sessions')
      .select('spotlight_target_model_id')
      .eq('id', fx.session.id)
      .single();
    expect(sessRes.data?.spotlight_target_model_id).toBe(modelId);

    await admin.from('sessions').update({ spotlight_target_model_id: null }).eq('id', fx.session.id);
    await admin.from('models').delete().eq('id', modelId);
  });

  test('spotlights a facilitator-owned room canvas', async () => {
    const { modelId } = await seedRoomModel(fx.session.stageIds.shared_model, 0);

    currentClient = await signInAs(fx.facilitator);
    const result = await setSpotlightAction(fx.session.id, modelId);
    expect(result).toEqual({ ok: true });

    const admin = getAdminClient();
    const sessRes = await admin
      .from('sessions')
      .select('spotlight_target_model_id')
      .eq('id', fx.session.id)
      .single();
    expect(sessRes.data?.spotlight_target_model_id).toBe(modelId);

    await admin.from('sessions').update({ spotlight_target_model_id: null }).eq('id', fx.session.id);
    await admin.from('models').delete().eq('id', modelId);
  });

  test('works with no current stage set — spotlight is decoupled from stage lifecycle', async () => {
    // A model on a session whose current_stage_id is NULL is still
    // spotlightable: presenting after the timer stops must work.
    const admin = getAdminClient();
    const modelRes = await admin
      .from('models')
      .insert({
        owner_profile_id: fx.facilitator.id,
        session_id: fx.blankStageSession.id,
        stage_id: fx.blankStageSession.stageIds.individual_model,
        title: 'blank-stage model',
        canvas_state: { groups: [], bricks: [] },
      })
      .select('id')
      .single();
    if (modelRes.error || !modelRes.data) {
      throw new Error(`seed blank-stage model failed: ${modelRes.error?.message}`);
    }
    const modelId = modelRes.data.id as string;

    currentClient = await signInAs(fx.facilitator);
    const result = await setSpotlightAction(fx.blankStageSession.id, modelId);
    expect(result).toEqual({ ok: true });

    await admin
      .from('sessions')
      .update({ spotlight_target_model_id: null })
      .eq('id', fx.blankStageSession.id);
    await admin.from('models').delete().eq('id', modelId);
  });

  test('rejects a model that belongs to another session', async () => {
    const admin = getAdminClient();
    const modelRes = await admin
      .from('models')
      .insert({
        owner_profile_id: fx.facilitator.id,
        session_id: fx.blankStageSession.id,
        stage_id: fx.blankStageSession.stageIds.individual_model,
        title: 'other-session model',
        canvas_state: { groups: [], bricks: [] },
      })
      .select('id')
      .single();
    if (modelRes.error || !modelRes.data) {
      throw new Error(`seed other-session model failed: ${modelRes.error?.message}`);
    }
    const foreignModelId = modelRes.data.id as string;

    currentClient = await signInAs(fx.facilitator);
    const result = await setSpotlightAction(fx.session.id, foreignModelId);
    expect(result).toEqual({ ok: false, code: 'target_not_in_session' });

    await admin.from('models').delete().eq('id', foreignModelId);
  });

  test('rejects a soft-deleted model', async () => {
    const admin = getAdminClient();
    const modelId = await seedParticipantModel(fx.alice, fx.session.stageIds.individual_model);
    await admin.from('models').update({ deleted_at: new Date().toISOString() }).eq('id', modelId);

    currentClient = await signInAs(fx.facilitator);
    const result = await setSpotlightAction(fx.session.id, modelId);
    expect(result).toEqual({ ok: false, code: 'target_not_in_session' });

    await admin.from('models').delete().eq('id', modelId);
  });

  test('clears spotlight when targetModelId is null', async () => {
    const admin = getAdminClient();
    const modelId = await seedParticipantModel(fx.alice, fx.session.stageIds.individual_model);

    currentClient = await signInAs(fx.facilitator);
    const setRes = await setSpotlightAction(fx.session.id, modelId);
    expect(setRes).toEqual({ ok: true });

    const clearRes = await setSpotlightAction(fx.session.id, null);
    expect(clearRes).toEqual({ ok: true });

    const sessRes = await admin
      .from('sessions')
      .select('spotlight_target_model_id')
      .eq('id', fx.session.id)
      .single();
    expect(sessRes.data?.spotlight_target_model_id).toBeNull();

    await admin.from('models').delete().eq('id', modelId);
  });

  test('rejects non-facilitator caller', async () => {
    const admin = getAdminClient();
    const modelId = await seedParticipantModel(fx.alice, fx.session.stageIds.individual_model);

    currentClient = await signInAs(fx.alice);
    const result = await setSpotlightAction(fx.session.id, modelId);
    expect(result).toEqual({ ok: false, code: 'not_facilitator' });

    await admin.from('models').delete().eq('id', modelId);
  });

  test('returns unauthenticated when no caller', async () => {
    currentClient = null;
    const result = await setSpotlightAction(fx.session.id, null);
    expect(result).toEqual({ ok: false, code: 'unauthenticated' });
  });
});

describe('getSpotlightBannerAction', () => {
  test('returns banner state for a personal canvas (presenter = owner, isRoom false)', async () => {
    const admin = getAdminClient();
    const modelId = await seedParticipantModel(fx.alice, fx.session.stageIds.individual_model);
    currentClient = await signInAs(fx.facilitator);
    expect(await setSpotlightAction(fx.session.id, modelId)).toEqual({ ok: true });

    // A viewer who is neither the facilitator nor the owner sees the banner.
    currentClient = await signInAs(fx.bob);
    const result = await getSpotlightBannerAction(fx.session.id);
    expect(result).toEqual({
      modelId,
      url: `/app/designs/${modelId}`,
      presenterLabel: fx.alice.email,
      isRoom: false,
      facilitatorName: fx.facilitator.email,
    });

    await admin.from('sessions').update({ spotlight_target_model_id: null }).eq('id', fx.session.id);
    await admin.from('models').delete().eq('id', modelId);
  });

  test('hides from the facilitator (they drive the spotlight)', async () => {
    const admin = getAdminClient();
    const modelId = await seedParticipantModel(fx.alice, fx.session.stageIds.individual_model);
    currentClient = await signInAs(fx.facilitator);
    expect(await setSpotlightAction(fx.session.id, modelId)).toEqual({ ok: true });

    const result = await getSpotlightBannerAction(fx.session.id);
    expect(result).toBeNull();

    await admin.from('sessions').update({ spotlight_target_model_id: null }).eq('id', fx.session.id);
    await admin.from('models').delete().eq('id', modelId);
  });

  test('hides from the owner of a personal canvas (they are already on it)', async () => {
    const admin = getAdminClient();
    const modelId = await seedParticipantModel(fx.alice, fx.session.stageIds.individual_model);
    currentClient = await signInAs(fx.facilitator);
    expect(await setSpotlightAction(fx.session.id, modelId)).toEqual({ ok: true });

    currentClient = await signInAs(fx.alice);
    const result = await getSpotlightBannerAction(fx.session.id);
    expect(result).toBeNull();

    await admin.from('sessions').update({ spotlight_target_model_id: null }).eq('id', fx.session.id);
    await admin.from('models').delete().eq('id', modelId);
  });

  test('returns room title + isRoom=true for a room canvas, shown to any non-facilitator', async () => {
    const { modelId, roomTitle } = await seedRoomModel(fx.session.stageIds.shared_model, 0);
    currentClient = await signInAs(fx.facilitator);
    expect(await setSpotlightAction(fx.session.id, modelId)).toEqual({ ok: true });

    currentClient = await signInAs(fx.alice);
    const result = await getSpotlightBannerAction(fx.session.id);
    expect(result).toEqual({
      modelId,
      url: `/app/designs/${modelId}`,
      presenterLabel: roomTitle,
      isRoom: true,
      facilitatorName: fx.facilitator.email,
    });

    const admin = getAdminClient();
    await admin.from('sessions').update({ spotlight_target_model_id: null }).eq('id', fx.session.id);
    await admin.from('models').delete().eq('id', modelId);
  });

  test('returns null when no spotlight is set', async () => {
    const admin = getAdminClient();
    await admin.from('sessions').update({ spotlight_target_model_id: null }).eq('id', fx.session.id);

    currentClient = await signInAs(fx.bob);
    const result = await getSpotlightBannerAction(fx.session.id);
    expect(result).toBeNull();
  });

  test('returns null when the spotlit model was deleted (FK clears the pointer)', async () => {
    const admin = getAdminClient();
    const modelId = await seedParticipantModel(fx.alice, fx.session.stageIds.individual_model);
    currentClient = await signInAs(fx.facilitator);
    expect(await setSpotlightAction(fx.session.id, modelId)).toEqual({ ok: true });

    await admin.from('models').delete().eq('id', modelId);

    currentClient = await signInAs(fx.bob);
    const result = await getSpotlightBannerAction(fx.session.id);
    expect(result).toBeNull();
  });

  test('returns null when no caller', async () => {
    currentClient = null;
    const result = await getSpotlightBannerAction(fx.session.id);
    expect(result).toBeNull();
  });
});

// ── invite / cancel / resend ────────────────────────────────────────────────
// These hit the local Supabase Auth API (createUser, signInWithOtp,
// inviteUserByEmail). Mail goes to Inbucket on :54324 — we don't assert on
// delivery here (Task 17 e2e covers that). The asserts target the action's
// return shape and the session_invitations row state.

/**
 * Generate a fresh @brick-think.test email local part for an invite test.
 * Keeps emails unique per test so the unique-open-invite index doesn't
 * collide across runs (cleanupTestUser in afterAll removes any auth.users
 * row that was created, but session_invitations rows survive cascade-deletes
 * of the inviter and we don't want leaks from a previous run to interfere).
 */
function freshInviteEmail(): string {
  return `invite-${crypto.randomUUID().slice(0, 8)}@brick-think.test`;
}

/** Delete any session_invitations rows for the fixture session — keeps state clean per test. */
async function clearInvitations(): Promise<void> {
  const admin = getAdminClient();
  await admin.from('session_invitations').delete().eq('session_id', fx.session.id);
}

describe('inviteParticipantsByEmailAction', () => {
  test('rejects over-cap (26 emails) with over_cap', async () => {
    currentClient = await signInAs(fx.facilitator);
    const emails = Array.from({ length: 26 }, () => freshInviteEmail());
    const result = await inviteParticipantsByEmailAction(fx.session.id, emails);
    expect(result).toEqual({ ok: false, code: 'over_cap' });
  });

  test('marks invalid emails as invalid_email and processes the rest', async () => {
    await clearInvitations();
    const goodEmail = freshInviteEmail();
    currentClient = await signInAs(fx.facilitator);
    const result = await inviteParticipantsByEmailAction(fx.session.id, [
      'not-an-email',
      goodEmail,
    ]);
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`);
    expect(result.results[0]).toEqual({ email: 'not-an-email', status: 'invalid_email' });
    expect(result.results[1]?.email).toBe(goodEmail);
    expect(result.results[1]?.status).toBe('sent_invite');
  });

  test('dedupes case-insensitively', async () => {
    await clearInvitations();
    const email = freshInviteEmail();
    const upper = email.toUpperCase();
    currentClient = await signInAs(fx.facilitator);
    const result = await inviteParticipantsByEmailAction(fx.session.id, [email, upper]);
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`);
    expect(result.results[0]?.email).toBe(email);
    expect(result.results[0]?.status).toBe('sent_invite');
    expect(result.results[1]?.email).toBe(email);
    expect(result.results[1]?.status).toBe('duplicate');
  });

  test('returns already_member for an active participant', async () => {
    await clearInvitations();
    await ensureActiveParticipant(fx.alice);
    currentClient = await signInAs(fx.facilitator);
    const result = await inviteParticipantsByEmailAction(fx.session.id, [fx.alice.email]);
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`);
    expect(result.results[0]).toEqual({
      email: fx.alice.email.toLowerCase(),
      status: 'already_member',
    });
    // No audit row should be written for already_member.
    const admin = getAdminClient();
    const { count } = await admin
      .from('session_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', fx.session.id)
      .eq('email', fx.alice.email.toLowerCase());
    expect(count).toBe(0);
  });

  test('writes a session_invitations row for a brand-new email (sent_invite)', async () => {
    await clearInvitations();
    const email = freshInviteEmail();
    currentClient = await signInAs(fx.facilitator);
    const result = await inviteParticipantsByEmailAction(fx.session.id, [email]);
    if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`);
    expect(result.results[0]).toEqual({ email, status: 'sent_invite' });

    const admin = getAdminClient();
    const row = await admin
      .from('session_invitations')
      .select('email, invited_by, claimed_at')
      .eq('session_id', fx.session.id)
      .eq('email', email)
      .single();
    expect(row.error).toBeNull();
    expect(row.data?.email).toBe(email);
    expect(row.data?.invited_by).toBe(fx.facilitator.id);
    expect(row.data?.claimed_at).toBeNull();
  });

  test('returns sent_magiclink when the email already has a profile but no participant row', async () => {
    await clearInvitations();
    // Create a fresh user so we control their participation state.
    const newcomer = await createTestUser();
    try {
      currentClient = await signInAs(fx.facilitator);
      const result = await inviteParticipantsByEmailAction(fx.session.id, [newcomer.email]);
      if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`);
      expect(result.results[0]).toEqual({
        email: newcomer.email.toLowerCase(),
        status: 'sent_magiclink',
      });

      const admin = getAdminClient();
      const row = await admin
        .from('session_invitations')
        .select('email, invited_by')
        .eq('session_id', fx.session.id)
        .eq('email', newcomer.email.toLowerCase())
        .single();
      expect(row.error).toBeNull();
      expect(row.data?.email).toBe(newcomer.email.toLowerCase());
      expect(row.data?.invited_by).toBe(fx.facilitator.id);
    } finally {
      await cleanupTestUser(newcomer.id);
    }
  });

  test('rejects non-facilitator caller with not_facilitator', async () => {
    currentClient = await signInAs(fx.alice);
    const result = await inviteParticipantsByEmailAction(fx.session.id, [freshInviteEmail()]);
    expect(result).toEqual({ ok: false, code: 'not_facilitator' });
  });

  test('returns unauthenticated when no caller', async () => {
    currentClient = null;
    const result = await inviteParticipantsByEmailAction(fx.session.id, [freshInviteEmail()]);
    expect(result).toEqual({ ok: false, code: 'unauthenticated' });
  });
});

describe('cancelInvitationAction', () => {
  test('deletes a pending invitation when caller is facilitator', async () => {
    await clearInvitations();
    const admin = getAdminClient();
    const email = freshInviteEmail();
    const insertRes = await admin
      .from('session_invitations')
      .insert({ session_id: fx.session.id, email, invited_by: fx.facilitator.id })
      .select('id')
      .single();
    if (insertRes.error || !insertRes.data) {
      throw new Error(`seed invite failed: ${insertRes.error?.message}`);
    }
    const invitationId = insertRes.data.id as string;

    currentClient = await signInAs(fx.facilitator);
    const result = await cancelInvitationAction(invitationId);
    expect(result).toEqual({ ok: true });

    const after = await admin
      .from('session_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('id', invitationId);
    expect(after.count).toBe(0);
  });

  test('rejects an already-claimed invitation with already_claimed', async () => {
    await clearInvitations();
    const admin = getAdminClient();
    const insertRes = await admin
      .from('session_invitations')
      .insert({
        session_id: fx.session.id,
        email: freshInviteEmail(),
        invited_by: fx.facilitator.id,
        claimed_at: new Date().toISOString(),
        claimed_by_profile_id: fx.alice.id,
      })
      .select('id')
      .single();
    if (insertRes.error || !insertRes.data) {
      throw new Error(`seed claimed invite failed: ${insertRes.error?.message}`);
    }
    const invitationId = insertRes.data.id as string;

    currentClient = await signInAs(fx.facilitator);
    const result = await cancelInvitationAction(invitationId);
    expect(result).toEqual({ ok: false, code: 'already_claimed' });

    // Cleanup since we left it behind.
    await admin.from('session_invitations').delete().eq('id', invitationId);
  });

  test('rejects non-facilitator caller', async () => {
    await clearInvitations();
    const admin = getAdminClient();
    const insertRes = await admin
      .from('session_invitations')
      .insert({
        session_id: fx.session.id,
        email: freshInviteEmail(),
        invited_by: fx.facilitator.id,
      })
      .select('id')
      .single();
    if (insertRes.error || !insertRes.data) {
      throw new Error(`seed invite failed: ${insertRes.error?.message}`);
    }
    const invitationId = insertRes.data.id as string;

    currentClient = await signInAs(fx.alice);
    const result = await cancelInvitationAction(invitationId);
    expect(result).toEqual({ ok: false, code: 'not_facilitator' });

    await admin.from('session_invitations').delete().eq('id', invitationId);
  });

  test('rejects unknown invitation id with invitation_not_found', async () => {
    currentClient = await signInAs(fx.facilitator);
    const result = await cancelInvitationAction('00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ ok: false, code: 'invitation_not_found' });
  });
});

describe('resendInvitationAction', () => {
  test('replays the original email through inviteParticipantsByEmailAction and keeps the audit row idempotent', async () => {
    await clearInvitations();
    const admin = getAdminClient();
    const email = freshInviteEmail();
    const insertRes = await admin
      .from('session_invitations')
      .insert({ session_id: fx.session.id, email, invited_by: fx.facilitator.id })
      .select('id')
      .single();
    if (insertRes.error || !insertRes.data) {
      throw new Error(`seed invite failed: ${insertRes.error?.message}`);
    }
    const invitationId = insertRes.data.id as string;

    currentClient = await signInAs(fx.facilitator);
    const result = await resendInvitationAction(invitationId);
    expect(result).toEqual({ ok: true });

    // Unique-open-invite partial index makes the audit insert a no-op
    // (23505 swallowed) — exactly one row should still exist.
    const after = await admin
      .from('session_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', fx.session.id)
      .eq('email', email)
      .is('claimed_at', null);
    expect(after.count).toBe(1);
  });
});
