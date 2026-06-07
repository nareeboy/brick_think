// Integration test for the nav "active attended sessions" helper.
// Runs against the local Supabase stack via the user-scoped client so the
// self-read RLS on session_participants, the is_session_participant OR-branch
// on sessions, and the org-membership read path are all exercised for real.
//
// The link surfaces a session when EITHER the user is an active joined
// participant of it (draft/scheduled/live) OR the user is a member of the
// session's org and the session is live — except the facilitator, who reaches
// their own sessions via Organisations and is excluded from the org path.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
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
  member: TestUser;
  dual: TestUser;
  outsider: TestUser;
  org: TestOrg;
  liveSessionId: string;
  liveSessionId2: string;
  scheduledSessionId: string;
  completedSessionId: string;
  removedSessionId: string;
}

let fx: Fixture;
let attendeeClient: SupabaseClient;
let memberClient: SupabaseClient;
let dualClient: SupabaseClient;
let facilitatorClient: SupabaseClient;
let outsiderClient: SupabaseClient;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const attendee = await createTestUser();
  const member = await createTestUser();
  const dual = await createTestUser();
  const outsider = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });

  // member + dual are team members of the org; attendee + outsider are not.
  await addOrgMember({ orgId: org.id, profileId: member.id, role: 'member' });
  await addOrgMember({ orgId: org.id, profileId: dual.id, role: 'member' });

  const live = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'Live workshop',
    status: 'live',
  });
  const live2 = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'Kicked workshop',
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

  // attendee: active participant of live + scheduled, participant of a
  // completed session, removed participant of the second live ("Kicked")
  // session — and is NOT an org member, so only the participant path applies.
  await addParticipant(live.id, attendee.id);
  await addParticipant(scheduled.id, attendee.id);
  await addParticipant(completed.id, attendee.id);
  await addParticipant(live2.id, attendee.id, true);

  // dual: org member AND a joined participant of the live session — used to
  // prove the union de-duplicates.
  await addParticipant(live.id, dual.id);

  attendeeClient = await signInAs(attendee);
  memberClient = await signInAs(member);
  dualClient = await signInAs(dual);
  facilitatorClient = await signInAs(facilitator);
  outsiderClient = await signInAs(outsider);

  fx = {
    facilitator,
    attendee,
    member,
    dual,
    outsider,
    org,
    liveSessionId: live.id,
    liveSessionId2: live2.id,
    scheduledSessionId: scheduled.id,
    completedSessionId: completed.id,
    removedSessionId: live2.id,
  };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.attendee.id);
  await cleanupTestUser(fx.member.id);
  await cleanupTestUser(fx.dual.id);
  await cleanupTestUser(fx.outsider.id);
});

describe('getMyActiveSessionsForNav — participant path', () => {
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

  test('a non-participant, non-member gets an empty list', async () => {
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

describe('getMyActiveSessionsForNav — org-member path', () => {
  test('an org member sees the org’s LIVE sessions without joining', async () => {
    const rows = await getMyActiveSessionsForNav(memberClient, fx.member.id);
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual([fx.liveSessionId, fx.liveSessionId2].sort());
  });

  test('an org member does NOT see scheduled or completed org sessions', async () => {
    const rows = await getMyActiveSessionsForNav(memberClient, fx.member.id);
    const ids = rows.map((r) => r.id);
    expect(ids).not.toContain(fx.scheduledSessionId);
    expect(ids).not.toContain(fx.completedSessionId);
  });

  test('the facilitator does NOT see their own live sessions via the org path', async () => {
    const rows = await getMyActiveSessionsForNav(facilitatorClient, fx.facilitator.id);
    expect(rows).toEqual([]);
  });

  test('de-duplicates a session the user both joined and is an org member of', async () => {
    const rows = await getMyActiveSessionsForNav(dualClient, fx.dual.id);
    const occurrences = rows.filter((r) => r.id === fx.liveSessionId).length;
    expect(occurrences).toBe(1);
  });
});
