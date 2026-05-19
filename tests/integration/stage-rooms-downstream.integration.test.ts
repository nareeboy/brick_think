import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { CanvasState } from '@/lib/models/types';
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

// Import AFTER mocks are registered.
import {
  setDownstreamStageRooms,
  setSharedModelRooms,
} from '@/app/(authed)/app/sessions/stage-room-actions';

interface Fixture {
  facilitator: TestUser;
  alice: TestUser;
  bob: TestUser;
  carol: TestUser;
  outsider: TestUser;
  org: TestOrg;
  session: TestSession;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const alice = await createTestUser();
  const bob = await createTestUser();
  const carol = await createTestUser();
  const outsider = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  await addOrgMember({ orgId: org.id, profileId: alice.id, role: 'member' });
  await addOrgMember({ orgId: org.id, profileId: bob.id, role: 'member' });
  await addOrgMember({ orgId: org.id, profileId: carol.id, role: 'member' });
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'downstream-rooms fixture',
  });
  fx = { facilitator, alice, bob, carol, outsider, org, session };
  await seedIndividualModel(fx.alice, ALICE_CANVAS);
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.alice.id);
  await cleanupTestUser(fx.bob.id);
  await cleanupTestUser(fx.carol.id);
  await cleanupTestUser(fx.outsider.id);
});

const ALICE_CANVAS: CanvasState = {
  groups: [{ id: 'g_a', name: 'Build', collapsed: false, visible: true }],
  bricks: [
    {
      id: 'b_a',
      groupId: 'g_a',
      code: 'red',
      image: '/bricks/red.png',
      width: 60,
      height: 40,
      x: 0,
      y: 0,
      rotation: 0,
      visible: true,
    },
  ],
};

async function seedIndividualModel(owner: TestUser, canvas: CanvasState): Promise<void> {
  const admin = getAdminClient();
  const res = await admin.from('models').insert({
    owner_profile_id: owner.id,
    session_id: fx.session.id,
    stage_id: fx.session.stageIds.individual_model,
    title: 'individual',
    canvas_state: canvas,
  });
  if (res.error) throw new Error(`seedIndividualModel: ${res.error.message}`);
}

async function wipeAllRooms(): Promise<void> {
  const admin = getAdminClient();
  await admin
    .from('stage_rooms')
    .delete()
    .in('stage_id', [
      fx.session.stageIds.shared_model,
      fx.session.stageIds.system_model,
      fx.session.stageIds.guiding_principles,
    ]);
}

async function setupSharedRooms(): Promise<{ roomIds: string[] }> {
  await wipeAllRooms();
  currentClient = await signInAs(fx.facilitator);
  const res = await setSharedModelRooms({
    stageId: fx.session.stageIds.shared_model,
    rooms: [
      { title: 'Team A', profileIds: [fx.alice.id, fx.bob.id] },
      { title: 'Team B', profileIds: [fx.carol.id] },
    ],
  });
  if (!res.ok) throw new Error(`setupSharedRooms failed: ${res.code}`);
  return res.data;
}

describe('setDownstreamStageRooms (integration)', () => {
  test('non-facilitator caller is refused', async () => {
    await setupSharedRooms();
    currentClient = await signInAs(fx.alice);
    const res = await setDownstreamStageRooms({
      stageId: fx.session.stageIds.system_model,
      rooms: [{ sourceRoomIds: ['00000000-0000-0000-0000-000000000000'] }],
    });
    expect(res).toEqual({ ok: false, code: 'not_facilitator' });
  });

  test('empty rooms refused', async () => {
    currentClient = await signInAs(fx.facilitator);
    const res = await setDownstreamStageRooms({
      stageId: fx.session.stageIds.system_model,
      rooms: [],
    });
    expect(res).toEqual({ ok: false, code: 'empty_partition' });
  });

  test('a room with no sources refused', async () => {
    currentClient = await signInAs(fx.facilitator);
    const res = await setDownstreamStageRooms({
      stageId: fx.session.stageIds.system_model,
      rooms: [{ sourceRoomIds: [] }],
    });
    expect(res).toEqual({ ok: false, code: 'empty_sources' });
  });

  test('refuses unsupported stage type (shared_model)', async () => {
    currentClient = await signInAs(fx.facilitator);
    const res = await setDownstreamStageRooms({
      stageId: fx.session.stageIds.shared_model,
      rooms: [{ sourceRoomIds: ['00000000-0000-0000-0000-000000000000'] }],
    });
    expect(res).toEqual({ ok: false, code: 'unsupported_stage_type' });
  });

  test('refuses a source room that is not on the upstream stage', async () => {
    const { roomIds } = await setupSharedRooms();
    // shared_model rooms are valid upstream for system_model. To trigger
    // unknown_source_room, pass a real UUID that doesn't belong to the
    // upstream stage — use one of system_model's own (after seeding) or just
    // a brand-new uuid. The action's source-stage filter will reject it.
    currentClient = await signInAs(fx.facilitator);
    const res = await setDownstreamStageRooms({
      stageId: fx.session.stageIds.system_model,
      rooms: [{ sourceRoomIds: ['11111111-1111-1111-1111-111111111111'] }],
    });
    expect(res).toEqual({ ok: false, code: 'unknown_source_room' });
    // Touch roomIds so it isn't flagged unused.
    expect(roomIds.length).toBeGreaterThan(0);
  });

  test('system_model: creates rooms, composes canvas from upstream, writes sources', async () => {
    const { roomIds: sharedRoomIds } = await setupSharedRooms();
    expect(sharedRoomIds).toHaveLength(2);

    currentClient = await signInAs(fx.facilitator);
    const res = await setDownstreamStageRooms({
      stageId: fx.session.stageIds.system_model,
      rooms: [{ title: 'Combined', sourceRoomIds: sharedRoomIds }],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.roomIds).toHaveLength(1);

    const admin = getAdminClient();
    const systemRoomId = res.data.roomIds[0]!;
    const sourcesRes = await admin
      .from('stage_room_sources')
      .select('source_room_id')
      .eq('room_id', systemRoomId);
    expect(sourcesRes.data).toHaveLength(2);
    const sourceIds = (sourcesRes.data ?? []).map((s) => s.source_room_id).sort();
    expect(sourceIds).toEqual([...sharedRoomIds].sort());

    const modelRes = await admin
      .from('models')
      .select('id, canvas_state')
      .eq('room_id', systemRoomId)
      .single();
    const canvas = modelRes.data?.canvas_state as unknown as CanvasState;
    // Each lane group is "{laneLabel}'s Build"; we expect at least one lane
    // worth of group rename since Team A's canvas was seeded with alice's bricks.
    expect(canvas.groups.length).toBeGreaterThanOrEqual(1);
    expect(canvas.groups.some((g) => /Team A/.test(g.name))).toBe(true);
  });

  test('transitive can_edit_room: shared_model member can edit downstream room', async () => {
    const { roomIds: sharedRoomIds } = await setupSharedRooms();
    currentClient = await signInAs(fx.facilitator);
    const sysRes = await setDownstreamStageRooms({
      stageId: fx.session.stageIds.system_model,
      rooms: [{ sourceRoomIds: [sharedRoomIds[0]!] }], // Team A only (alice + bob)
    });
    if (!sysRes.ok) throw new Error(sysRes.code);
    const sysRoomId = sysRes.data.roomIds[0]!;

    const admin = getAdminClient();
    const sysModelRes = await admin
      .from('models')
      .select('id')
      .eq('room_id', sysRoomId)
      .single();
    const sysModelId = sysModelRes.data?.id as string;

    const aliceCheck = await admin.rpc('can_edit_room', {
      p_profile_id: fx.alice.id,
      p_model_id: sysModelId,
    });
    expect(aliceCheck.data).toBe(true);
    const carolCheck = await admin.rpc('can_edit_room', {
      p_profile_id: fx.carol.id,
      p_model_id: sysModelId,
    });
    expect(carolCheck.data).toBe(false);
  });

  test('two-hop transitive: guiding_principles ← system_model ← shared_model', async () => {
    const { roomIds: sharedRoomIds } = await setupSharedRooms();
    currentClient = await signInAs(fx.facilitator);

    const sysRes = await setDownstreamStageRooms({
      stageId: fx.session.stageIds.system_model,
      rooms: [{ sourceRoomIds: [sharedRoomIds[0]!] }],
    });
    if (!sysRes.ok) throw new Error(sysRes.code);

    const gpRes = await setDownstreamStageRooms({
      stageId: fx.session.stageIds.guiding_principles,
      rooms: [{ sourceRoomIds: sysRes.data.roomIds }],
    });
    expect(gpRes.ok).toBe(true);
    if (!gpRes.ok) return;
    const gpRoomId = gpRes.data.roomIds[0]!;

    const admin = getAdminClient();
    const gpModelRes = await admin
      .from('models')
      .select('id')
      .eq('room_id', gpRoomId)
      .single();
    const gpModelId = gpModelRes.data?.id as string;

    const aliceCheck = await admin.rpc('can_edit_room', {
      p_profile_id: fx.alice.id,
      p_model_id: gpModelId,
    });
    expect(aliceCheck.data).toBe(true);
    const carolCheck = await admin.rpc('can_edit_room', {
      p_profile_id: fx.carol.id,
      p_model_id: gpModelId,
    });
    expect(carolCheck.data).toBe(false);
    // Outsider not in any org room.
    const outsiderCheck = await admin.rpc('can_edit_room', {
      p_profile_id: fx.outsider.id,
      p_model_id: gpModelId,
    });
    expect(outsiderCheck.data).toBe(false);
  });
});
