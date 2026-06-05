// Integration test for the nav "active attended sessions" helper.
// Runs against the local Supabase stack via the user-scoped client so the
// "self read" RLS policy on session_participants and the
// is_session_participant OR-branch on sessions are exercised for real.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  cleanupTestUser,
  createTestOrg,
  createTestSession,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestOrg,
  type TestUser,
} from '@/lib/testing/supabase-test-client';
import { getMyActiveSessionsForNav } from '@/lib/sessions/navSessions';

async function addParticipant(sessionId: string, profileId: string, removed = false) {
  const admin = getAdminClient();
  const { error } = await admin.from('session_participants').insert({
    session_id: sessionId,
    profile_id: profileId,
    removed_at: removed ? new Date().toISOString() : null,
  });
  if (error) throw new Error(`addParticipant failed: ${error.message}`);
}

interface Fixture {
  facilitator: TestUser;
  attendee: TestUser;
  outsider: TestUser;
  org: TestOrg;
  liveSessionId: string;
  scheduledSessionId: string;
  completedSessionId: string;
  removedSessionId: string;
}

let fx: Fixture;
let attendeeClient: SupabaseClient;
let outsiderClient: SupabaseClient;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const attendee = await createTestUser();
  const outsider = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });

  const live = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'Live workshop',
    status: 'live',
  });
  const scheduled = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'Scheduled workshop',
    status: 'scheduled',
  });
  const completed = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'Completed workshop',
    status: 'completed',
  });
  const removed = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'Kicked workshop',
    status: 'live',
  });

  // attendee is an active participant of live + scheduled, a participant of a
  // completed session, and a removed participant of the "removed" session.
  await addParticipant(live.id, attendee.id);
  await addParticipant(scheduled.id, attendee.id);
  await addParticipant(completed.id, attendee.id);
  await addParticipant(removed.id, attendee.id, true);

  attendeeClient = await signInAs(attendee);
  outsiderClient = await signInAs(outsider);

  fx = {
    facilitator,
    attendee,
    outsider,
    org,
    liveSessionId: live.id,
    scheduledSessionId: scheduled.id,
    completedSessionId: completed.id,
    removedSessionId: removed.id,
  };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.attendee.id);
  await cleanupTestUser(fx.outsider.id);
});

describe('getMyActiveSessionsForNav', () => {
  test('returns only active, non-removed sessions the user attends', async () => {
    const rows = await getMyActiveSessionsForNav(attendeeClient, fx.attendee.id);
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual([fx.liveSessionId, fx.scheduledSessionId].sort());
    expect(ids).not.toContain(fx.completedSessionId);
    expect(ids).not.toContain(fx.removedSessionId);
  });

  test('carries the session title through', async () => {
    const rows = await getMyActiveSessionsForNav(attendeeClient, fx.attendee.id);
    const live = rows.find((r) => r.id === fx.liveSessionId);
    expect(live?.title).toBe('Live workshop');
  });

  test('a non-participant gets an empty list', async () => {
    const rows = await getMyActiveSessionsForNav(outsiderClient, fx.outsider.id);
    expect(rows).toEqual([]);
  });

  test('cannot read another user’s sessions even when passed their id (RLS self-read)', async () => {
    // Outsider's client + attendee's id: the self-read policy keys off
    // auth.uid(), so the userId arg can't be used to read someone else's rows.
    const rows = await getMyActiveSessionsForNav(outsiderClient, fx.attendee.id);
    expect(rows).toEqual([]);
  });
});
