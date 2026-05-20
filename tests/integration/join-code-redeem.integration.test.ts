// Integration tests for redeemJoinCodeAction.
//
// Pattern follows scenarios.integration.test.ts:
//   - vi.mock('next/cache') + vi.mock('@/lib/db/server') before the action import
//   - getServiceSupabaseClient() is NOT mocked — works against the real local stack
//   - Per-test fixture via createTestUser / createTestOrg / createTestSession
//
// createTestSession does NOT set join_code — the column is nullable on
// insert and the SQL `generate_join_code()` only runs from the migration's
// backfill or future trigger work. For these tests we backfill via
// service-role UPDATE in beforeAll.
//
// One Cleanup wrinkle: `cleanupTestUser` only purges sessions facilitated
// by the user. Sessions a kicked / joined user merely participates in are
// fine — they cascade off the facilitator, which we delete first.

import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
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
      // Mimic the unauthenticated branch — a fresh anon client with no
      // session. The action only calls .auth.getUser(), which returns
      // { user: null } here, so the action short-circuits at the auth gate.
      return makeAnonClient();
    }
    return currentClient;
  }),
}));

import { redeemJoinCodeAction } from '@/app/(authed)/app/sessions/join-actions';

interface Fixture {
  facilitator: TestUser;
  participant: TestUser;
  kickedUser: TestUser;
  completedSessionUser: TestUser;
  org: TestOrg;
  // Active draft session — primary test target.
  session: TestSession;
  sessionCode: string;
  // Session for the kicked-user scenario — independent so cleanup is easy.
  kickedSession: TestSession;
  kickedSessionCode: string;
  // Session with status=completed for the session_completed branch.
  completedSession: TestSession;
  completedSessionCode: string;
}

let fx: Fixture;

async function setSessionJoinCode(sessionId: string): Promise<string> {
  const admin = getAdminClient();
  const codeRes = await admin.rpc('generate_join_code');
  if (codeRes.error || !codeRes.data) {
    throw new Error(`generate_join_code rpc failed: ${codeRes.error?.message}`);
  }
  const code = codeRes.data as string;
  const upd = await admin.from('sessions').update({ join_code: code }).eq('id', sessionId);
  if (upd.error) throw new Error(`backfill join_code failed: ${upd.error.message}`);
  return code;
}

beforeAll(async () => {
  const facilitator = await createTestUser();
  const participant = await createTestUser();
  const kickedUser = await createTestUser();
  const completedSessionUser = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });

  const session = await createTestSession({ orgId: org.id, facilitatorId: facilitator.id });
  const kickedSession = await createTestSession({ orgId: org.id, facilitatorId: facilitator.id });
  const completedSession = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    status: 'completed',
  });

  // Backfill join_codes. createTestSession doesn't set one (it would still
  // be NULL since the column has no default), so we generate via the RPC
  // and UPDATE via service role.
  const [sessionCode, kickedSessionCode, completedSessionCode] = await Promise.all([
    setSessionJoinCode(session.id),
    setSessionJoinCode(kickedSession.id),
    setSessionJoinCode(completedSession.id),
  ]);

  // Pre-seed a soft-deleted participant row for the kicked-user scenario
  // (sticky kick).
  const admin = getAdminClient();
  const seedKick = await admin.from('session_participants').insert({
    session_id: kickedSession.id,
    profile_id: kickedUser.id,
    removed_at: new Date().toISOString(),
    removed_by_profile_id: facilitator.id,
  });
  if (seedKick.error) throw new Error(`seed kicked row failed: ${seedKick.error.message}`);

  fx = {
    facilitator,
    participant,
    kickedUser,
    completedSessionUser,
    org,
    session,
    sessionCode,
    kickedSession,
    kickedSessionCode,
    completedSession,
    completedSessionCode,
  };
});

afterEach(() => {
  currentClient = null;
});

afterAll(async () => {
  if (!fx) return;
  // Order: notifications + session_participants cascade off sessions (which
  // cascade off the facilitator delete). Cleanup just removes the users in
  // dependency order; cleanupTestUser handles sessions + orgs + auth for
  // each one.
  await cleanupTestUser(fx.participant.id);
  await cleanupTestUser(fx.kickedUser.id);
  await cleanupTestUser(fx.completedSessionUser.id);
  await cleanupTestUser(fx.facilitator.id);
});

describe('redeemJoinCodeAction', () => {
  test('fresh redemption inserts participant + fires exactly one participant_joined notification', async () => {
    currentClient = await signInAs(fx.participant);
    const result = await redeemJoinCodeAction(fx.sessionCode);
    expect(result).toEqual({ ok: true, sessionId: fx.session.id });

    const admin = getAdminClient();

    const partRes = await admin
      .from('session_participants')
      .select('session_id, profile_id, removed_at')
      .eq('session_id', fx.session.id)
      .eq('profile_id', fx.participant.id)
      .single();
    expect(partRes.error).toBeNull();
    expect(partRes.data?.removed_at).toBeNull();

    const notifRes = await admin
      .from('notifications')
      .select('id, kind, recipient_profile_id, actor_profile_id, session_id, title')
      .eq('session_id', fx.session.id)
      .eq('kind', 'participant_joined');
    expect(notifRes.error).toBeNull();
    expect(notifRes.data?.length).toBe(1);
    const notif = notifRes.data?.[0];
    expect(notif?.recipient_profile_id).toBe(fx.facilitator.id);
    expect(notif?.actor_profile_id).toBe(fx.participant.id);
    expect(notif?.title).toMatch(/joined/i);
  });

  test('idempotent re-redemption: still ok, but no second notification', async () => {
    // Precondition: first test ran and inserted exactly one notification.
    currentClient = await signInAs(fx.participant);
    const result = await redeemJoinCodeAction(fx.sessionCode);
    expect(result).toEqual({ ok: true, sessionId: fx.session.id });

    const admin = getAdminClient();
    const notifRes = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', fx.session.id)
      .eq('kind', 'participant_joined');
    expect(notifRes.error).toBeNull();
    expect(notifRes.count).toBe(1);
  });

  test('kicked user (soft-deleted row) is refused with removed_by_facilitator', async () => {
    currentClient = await signInAs(fx.kickedUser);
    const result = await redeemJoinCodeAction(fx.kickedSessionCode);
    expect(result).toEqual({ ok: false, code: 'removed_by_facilitator' });

    // And no notification fired for the kicked attempt.
    const admin = getAdminClient();
    const notifRes = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', fx.kickedSession.id)
      .eq('kind', 'participant_joined');
    expect(notifRes.error).toBeNull();
    expect(notifRes.count).toBe(0);
  });

  test('completed session is refused with session_completed', async () => {
    currentClient = await signInAs(fx.completedSessionUser);
    const result = await redeemJoinCodeAction(fx.completedSessionCode);
    expect(result).toEqual({ ok: false, code: 'session_completed' });
  });

  test('unknown code returns code_not_found (well-shaped but unused)', async () => {
    currentClient = await signInAs(fx.participant);
    // Six chars all drawn from the alphabet but not assigned to any session
    // — keep collision probability laughable by picking a string that's
    // also not the backfilled code for the fixture session.
    const candidate = 'ZZZZZZ';
    expect(candidate).not.toBe(fx.sessionCode);
    expect(candidate).not.toBe(fx.kickedSessionCode);
    expect(candidate).not.toBe(fx.completedSessionCode);
    const result = await redeemJoinCodeAction(candidate);
    expect(result).toEqual({ ok: false, code: 'code_not_found' });
  });

  test('shape-invalid code returns code_not_found (no DB round-trip needed)', async () => {
    currentClient = await signInAs(fx.participant);
    // Too short.
    expect(await redeemJoinCodeAction('ABC')).toEqual({ ok: false, code: 'code_not_found' });
    // Right length, character outside the Crockford-trimmed alphabet ('O' / '0' / 'I' / 'L' / 'U' / '1' all excluded).
    expect(await redeemJoinCodeAction('ABCDE0')).toEqual({ ok: false, code: 'code_not_found' });
    expect(await redeemJoinCodeAction('IOIOIO')).toEqual({ ok: false, code: 'code_not_found' });
  });

  test('case-insensitive: lowercase code resolves the same session', async () => {
    // Use a fresh user so the idempotent branch doesn't mask the lookup.
    const lowercaseUser = await createTestUser();
    try {
      currentClient = await signInAs(lowercaseUser);
      const lower = fx.sessionCode.toLowerCase();
      const result = await redeemJoinCodeAction(lower);
      expect(result).toEqual({ ok: true, sessionId: fx.session.id });
    } finally {
      await cleanupTestUser(lowercaseUser.id);
    }
  });

  test('unauthenticated caller returns unauthenticated', async () => {
    // currentClient stays null → the mocked createServerSupabaseClient
    // returns a fresh anon client with no session, so auth.getUser() yields
    // { user: null } and the action short-circuits.
    currentClient = null;
    const result = await redeemJoinCodeAction(fx.sessionCode);
    expect(result).toEqual({ ok: false, code: 'unauthenticated' });
  });
});
