// Integration tests for the example-workshop seeder.
//
// Pattern follows stage-controller.integration.test.ts:
//   - server-action mocks come from setup.ts (_helpers/action-mocks.ts);
//     per-test identity via setActionClient()
//   - getServiceSupabaseClient() is NOT mocked — works against the real local stack
//   - getAdminClient() for post-action DB verification (bypasses RLS)
//
// Covers the auth gate (anonymous refused), the one-per-user rule for regular
// users, the shared demo participants, the site-admin escape hatch (unlimited
// seeding, so the report/billing test loop still works), and the happy path:
// one click seeds a completed session whose five stages all carry brick-filled
// models and narration transcripts, with rooms wired on the three
// collaborative stages.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { setActionClient } from './_helpers/action-mocks';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';
import { parseCanvasState } from '@/lib/models/canvasState';
import { CANONICAL_STAGE_TYPES, type StageType } from '@/lib/sessions/types';

import { createExampleWorkshopAction } from '@/app/(authed)/app/workshops/example-workshop-actions';

let adminUser: TestUser;
let regularUser: TestUser;
let otherUser: TestUser;
const seededParticipantIds: string[] = [];

// The action always finishes with redirect(), which the next/navigation mock
// throws as a sentinel. Returns the session id it redirected to.
async function seedAndFollowRedirect(): Promise<string> {
  try {
    await createExampleWorkshopAction();
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (!message.startsWith('__redirect__:')) throw err;
    const url = message.slice('__redirect__:'.length);
    expect(url).toMatch(/^\/app\/sessions\/[0-9a-f-]{36}$/);
    return url.split('/').pop()!;
  }
  throw new Error('expected createExampleWorkshopAction to redirect');
}

async function rosterFor(sessionId: string): Promise<Set<string>> {
  const { data } = await getAdminClient()
    .from('session_participants')
    .select('profile_id')
    .eq('session_id', sessionId);
  return new Set((data ?? []).map((r) => r.profile_id as string));
}

beforeAll(async () => {
  adminUser = await createTestUser();
  regularUser = await createTestUser();
  otherUser = await createTestUser();
  const admin = getAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ is_site_admin: true })
    .eq('id', adminUser.id);
  if (error) throw new Error(`failed to promote test admin: ${error.message}`);
});

afterAll(async () => {
  // Facilitators own the seeded orgs + sessions; deleting them first cascades
  // stages, rooms, models, and narrations, so the shared demo participants can
  // then be deleted without FK friction.
  await cleanupTestUser(adminUser.id).catch(() => {});
  await cleanupTestUser(regularUser.id).catch(() => {});
  await cleanupTestUser(otherUser.id).catch(() => {});
  for (const id of seededParticipantIds) {
    await cleanupTestUser(id).catch(() => {});
  }
});

describe('createExampleWorkshopAction — gate', () => {
  test('refuses anonymous callers', async () => {
    setActionClient('anon');
    const result = await createExampleWorkshopAction();
    expect(result).toEqual({ ok: false, code: 'unauthenticated' });
  });
});

describe('createExampleWorkshopAction — regular users', () => {
  test('seeds an example workshop for a signed-in non-admin', async () => {
    setActionClient(await signInAs(regularUser));
    const sessionId = await seedAndFollowRedirect();

    const admin = getAdminClient();
    const { data: session } = await admin
      .from('sessions')
      .select('status, facilitator_id, org_id')
      .eq('id', sessionId)
      .single();
    expect(session?.status).toBe('completed');
    expect(session?.facilitator_id).toBe(regularUser.id);

    const { data: org } = await admin
      .from('organisations')
      .select('owner_id, is_example')
      .eq('id', session!.org_id)
      .single();
    expect(org?.owner_id).toBe(regularUser.id);
    expect(org?.is_example).toBe(true);
  });

  test('reopens the existing example instead of seeding a second one', async () => {
    setActionClient(await signInAs(regularUser));
    const first = await seedAndFollowRedirect();
    const second = await seedAndFollowRedirect();
    expect(second).toBe(first);

    const { data: orgs } = await getAdminClient()
      .from('organisations')
      .select('id')
      .eq('owner_id', regularUser.id)
      .eq('is_example', true);
    expect(orgs).toHaveLength(1);
  });

  test('shares the same demo participants across different users', async () => {
    setActionClient(await signInAs(regularUser));
    const mine = await seedAndFollowRedirect();
    setActionClient(await signInAs(otherUser));
    const theirs = await seedAndFollowRedirect();
    expect(theirs).not.toBe(mine);

    const mineRoster = await rosterFor(mine);
    const theirsRoster = await rosterFor(theirs);
    expect(mineRoster.size).toBe(3);
    expect(theirsRoster).toEqual(mineRoster);
  });
});

describe('createExampleWorkshopAction — site admins', () => {
  test('seeds a fresh workshop on every click', async () => {
    setActionClient(await signInAs(adminUser));
    const first = await seedAndFollowRedirect();
    const second = await seedAndFollowRedirect();
    expect(second).not.toBe(first);
  });
});

describe('createExampleWorkshopAction — seeding', () => {
  test('seeds a fully filled completed workshop and redirects to it', async () => {
    setActionClient(await signInAs(adminUser));

    const sessionId = await seedAndFollowRedirect();

    const admin = getAdminClient();

    // Session is completed and facilitated by the caller.
    const { data: session } = await admin
      .from('sessions')
      .select('status, facilitator_id, org_id, join_code')
      .eq('id', sessionId)
      .single();
    expect(session?.status).toBe('completed');
    expect(session?.facilitator_id).toBe(adminUser.id);
    expect(session?.join_code).toBeTruthy();

    // All five canonical stages exist, completed, with a plausible timeline.
    const { data: stages } = await admin
      .from('stages')
      .select('id, stage_type, status, started_at, ended_at')
      .eq('session_id', sessionId);
    expect(stages).toHaveLength(CANONICAL_STAGE_TYPES.length);
    const stageByType = new Map(stages!.map((s) => [s.stage_type as StageType, s]));
    for (const stageType of CANONICAL_STAGE_TYPES) {
      const stage = stageByType.get(stageType);
      expect(stage?.status).toBe('completed');
      expect(stage?.started_at).toBeTruthy();
      expect(stage?.ended_at).toBeTruthy();
    }

    // Three seeded participants, enrolled in the org and on the roster.
    const { data: roster } = await admin
      .from('session_participants')
      .select('profile_id')
      .eq('session_id', sessionId);
    expect(roster).toHaveLength(3);
    seededParticipantIds.push(...roster!.map((r) => r.profile_id as string));

    const { data: memberships } = await admin
      .from('org_memberships')
      .select('profile_id')
      .eq('org_id', session!.org_id);
    const memberIds = new Set(memberships!.map((m) => m.profile_id as string));
    for (const id of seededParticipantIds) expect(memberIds.has(id)).toBe(true);

    // Every participant profile carries a display name (report attribution).
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', seededParticipantIds);
    for (const profile of profiles!) expect(profile.full_name).toBeTruthy();

    // Models: per-participant canvases on the two individual stages, room
    // canvases on the three collaborative stages — all with bricks placed.
    const { data: models } = await admin
      .from('models')
      .select('id, stage_id, room_id, owner_profile_id, canvas_state')
      .eq('session_id', sessionId);
    const modelsByType = new Map<StageType, NonNullable<typeof models>>();
    for (const model of models!) {
      const stage = stages!.find((s) => s.id === model.stage_id);
      expect(stage).toBeTruthy();
      const stageType = stage!.stage_type as StageType;
      const list = modelsByType.get(stageType) ?? [];
      list.push(model);
      modelsByType.set(stageType, list);
    }
    expect(modelsByType.get('skill_building')).toHaveLength(3);
    expect(modelsByType.get('individual_model')).toHaveLength(3);
    expect(modelsByType.get('shared_model')).toHaveLength(2);
    expect(modelsByType.get('system_model')).toHaveLength(1);
    expect(modelsByType.get('guiding_principles')).toHaveLength(1);

    for (const model of models!) {
      const canvas = parseCanvasState(model.canvas_state);
      expect(canvas.bricks.length).toBeGreaterThan(0);
    }
    for (const stageType of ['shared_model', 'system_model', 'guiding_principles'] as const) {
      for (const model of modelsByType.get(stageType)!) {
        expect(model.room_id).toBeTruthy();
      }
    }

    // Room wiring: shared rooms partition the participants; downstream rooms
    // compose upstream rooms via stage_room_sources.
    const sharedStageId = stageByType.get('shared_model')!.id;
    const systemStageId = stageByType.get('system_model')!.id;
    const guidingStageId = stageByType.get('guiding_principles')!.id;

    const { data: sharedMembers } = await admin
      .from('stage_room_members')
      .select('room_id, profile_id')
      .eq('stage_id', sharedStageId);
    expect(new Set(sharedMembers!.map((m) => m.profile_id as string)).size).toBe(3);

    const { data: rooms } = await admin
      .from('stage_rooms')
      .select('id, stage_id')
      .in('stage_id', [sharedStageId, systemStageId, guidingStageId]);
    const sharedRoomIds = rooms!
      .filter((r) => r.stage_id === sharedStageId)
      .map((r) => r.id as string);
    const systemRoomIds = rooms!
      .filter((r) => r.stage_id === systemStageId)
      .map((r) => r.id as string);
    const guidingRoomIds = rooms!
      .filter((r) => r.stage_id === guidingStageId)
      .map((r) => r.id as string);
    expect(sharedRoomIds).toHaveLength(2);
    expect(systemRoomIds).toHaveLength(1);
    expect(guidingRoomIds).toHaveLength(1);

    const { data: sources } = await admin
      .from('stage_room_sources')
      .select('room_id, source_room_id')
      .in('room_id', [...systemRoomIds, ...guidingRoomIds]);
    const systemSources = sources!
      .filter((s) => s.room_id === systemRoomIds[0])
      .map((s) => s.source_room_id as string);
    expect(new Set(systemSources)).toEqual(new Set(sharedRoomIds));
    const guidingSources = sources!
      .filter((s) => s.room_id === guidingRoomIds[0])
      .map((s) => s.source_room_id as string);
    expect(guidingSources).toEqual(systemRoomIds);

    // Narrations: every seeded model carries at least one substantial
    // transcript so the report pipeline has real material to work with.
    const { data: narrations } = await admin
      .from('model_narrations')
      .select('model_id, transcript, transcript_raw, cleanup_status')
      .in(
        'model_id',
        models!.map((m) => m.id as string),
      );
    const narratedModelIds = new Set(narrations!.map((n) => n.model_id as string));
    for (const model of models!) {
      expect(narratedModelIds.has(model.id as string)).toBe(true);
    }
    for (const narration of narrations!) {
      expect((narration.transcript as string).length).toBeGreaterThan(80);
      expect(narration.transcript_raw).toBe(narration.transcript);
    }
  });
});
