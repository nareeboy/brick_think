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
import { setSharedModelRooms } from '@/app/(authed)/app/sessions/stage-room-actions';

interface Fixture {
  facilitator: TestUser;
  alice: TestUser;
  bob: TestUser;
  outsider: TestUser;
  org: TestOrg;
  session: TestSession;
}

let fx: Fixture;

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
    title: 'rooms fixture',
  });
  fx = { facilitator, alice, bob, outsider, org, session };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.alice.id);
  await cleanupTestUser(fx.bob.id);
  await cleanupTestUser(fx.outsider.id);
});

const ALICE_CANVAS: CanvasState = {
  groups: [{ id: 'g_alice', name: 'Build', collapsed: false, visible: true }],
  bricks: [
    {
      id: 'b_alice',
      groupId: 'g_alice',
      code: 'red',
      image: '/bricks/red.png',
      width: 50,
      height: 50,
      x: 0,
      y: 100,
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

async function wipeRooms(): Promise<void> {
  const admin = getAdminClient();
  await admin.from('stage_rooms').delete().eq('stage_id', fx.session.stageIds.shared_model);
}

describe('setSharedModelRooms (integration)', () => {
  test('non-facilitator caller is refused', async () => {
    currentClient = await signInAs(fx.alice);
    const res = await setSharedModelRooms({
      stageId: fx.session.stageIds.shared_model,
      rooms: [{ profileIds: [fx.alice.id] }],
    });
    expect(res).toEqual({ ok: false, code: 'not_facilitator' });
  });

  test('duplicate profile across partitions is refused', async () => {
    currentClient = await signInAs(fx.facilitator);
    const res = await setSharedModelRooms({
      stageId: fx.session.stageIds.shared_model,
      rooms: [{ profileIds: [fx.alice.id] }, { profileIds: [fx.alice.id, fx.bob.id] }],
    });
    expect(res).toEqual({ ok: false, code: 'duplicate_member' });
  });

  test('unknown member id (not an org member) is refused', async () => {
    currentClient = await signInAs(fx.facilitator);
    const res = await setSharedModelRooms({
      stageId: fx.session.stageIds.shared_model,
      rooms: [{ profileIds: [fx.outsider.id] }],
    });
    expect(res).toEqual({ ok: false, code: 'unknown_member' });
  });

  test('empty rooms list is refused', async () => {
    currentClient = await signInAs(fx.facilitator);
    const res = await setSharedModelRooms({
      stageId: fx.session.stageIds.shared_model,
      rooms: [],
    });
    expect(res).toEqual({ ok: false, code: 'empty_partition' });
  });

  test('creates rooms, materialises canvas, and enrolls members', async () => {
    await wipeRooms();
    await seedIndividualModel(fx.alice, ALICE_CANVAS);

    currentClient = await signInAs(fx.facilitator);
    const res = await setSharedModelRooms({
      stageId: fx.session.stageIds.shared_model,
      rooms: [{ title: 'Team A', profileIds: [fx.alice.id] }, { profileIds: [fx.bob.id] }],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.roomIds).toHaveLength(2);

    const admin = getAdminClient();
    const roomsRes = await admin
      .from('stage_rooms')
      .select('id, position, title')
      .eq('stage_id', fx.session.stageIds.shared_model)
      .order('position');
    expect(roomsRes.data).toHaveLength(2);
    expect(roomsRes.data?.[0]?.title).toBe('Team A');
    expect(roomsRes.data?.[1]?.title).toBeNull();

    // Each room has exactly one models row owned by the facilitator, with
    // room_id set.
    const modelsRes = await admin
      .from('models')
      .select('id, owner_profile_id, room_id, canvas_state')
      .in('room_id', res.data.roomIds);
    expect(modelsRes.data).toHaveLength(2);
    for (const m of modelsRes.data ?? []) {
      expect(m.owner_profile_id).toBe(fx.facilitator.id);
    }
    // Alice's room got her individual_model bricks composed in.
    const aliceRoomModel = modelsRes.data?.find((m) => m.room_id === res.data.roomIds[0]);
    const canvas = aliceRoomModel?.canvas_state as unknown as CanvasState;
    expect(canvas.groups).toHaveLength(1);
    expect(canvas.groups[0]?.name).toMatch(/Build$/);
    expect(canvas.bricks).toHaveLength(1);

    // Memberships are recorded.
    const memRes = await admin
      .from('stage_room_members')
      .select('room_id, profile_id, stage_id')
      .in('room_id', res.data.roomIds);
    expect(memRes.data).toHaveLength(2);

    // can_edit_room: Alice can edit her room, Bob cannot.
    const aliceCanEdit = await admin.rpc('can_edit_room', {
      p_profile_id: fx.alice.id,
      p_model_id: aliceRoomModel?.id ?? '',
    });
    expect(aliceCanEdit.data).toBe(true);
    const bobCanEdit = await admin.rpc('can_edit_room', {
      p_profile_id: fx.bob.id,
      p_model_id: aliceRoomModel?.id ?? '',
    });
    expect(bobCanEdit.data).toBe(false);
  });

  test('session facilitator can edit every room even when not a room member', async () => {
    await wipeRooms();
    currentClient = await signInAs(fx.facilitator);
    const res = await setSharedModelRooms({
      stageId: fx.session.stageIds.shared_model,
      rooms: [{ profileIds: [fx.alice.id] }, { profileIds: [fx.bob.id] }],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const admin = getAdminClient();
    const modelsRes = await admin
      .from('models')
      .select('id, room_id')
      .in('room_id', res.data.roomIds);
    expect(modelsRes.data).toHaveLength(2);

    // The facilitator partitioned alice and bob into rooms but never added
    // themselves to either — they are not in stage_room_members at all.
    const memRes = await admin
      .from('stage_room_members')
      .select('profile_id')
      .in('room_id', res.data.roomIds)
      .eq('profile_id', fx.facilitator.id);
    expect(memRes.data).toHaveLength(0);

    // Yet the facilitator must still be able to live-edit every room canvas in
    // their session — they orchestrate all rooms. can_edit_room is the gate
    // both the design page (liveMode) and the Yjs worker (WS upgrade) consult,
    // so it must grant the session facilitator.
    for (const m of modelsRes.data ?? []) {
      const facCanEdit = await admin.rpc('can_edit_room', {
        p_profile_id: fx.facilitator.id,
        p_model_id: m.id,
      });
      expect(facCanEdit.error).toBeNull();
      expect(facCanEdit.data).toBe(true);
    }
  });

  test('subsequent call replaces prior rooms entirely', async () => {
    await wipeRooms();
    currentClient = await signInAs(fx.facilitator);

    const first = await setSharedModelRooms({
      stageId: fx.session.stageIds.shared_model,
      rooms: [{ profileIds: [fx.alice.id, fx.bob.id] }],
    });
    expect(first.ok).toBe(true);

    const second = await setSharedModelRooms({
      stageId: fx.session.stageIds.shared_model,
      rooms: [{ profileIds: [fx.alice.id] }, { profileIds: [fx.bob.id] }],
    });
    expect(second.ok).toBe(true);

    const admin = getAdminClient();
    const roomsRes = await admin
      .from('stage_rooms')
      .select('id')
      .eq('stage_id', fx.session.stageIds.shared_model);
    expect(roomsRes.data).toHaveLength(2);

    // The first call's room_ids should be gone.
    if (first.ok) {
      const prior = await admin.from('stage_rooms').select('id').in('id', first.data.roomIds);
      expect(prior.data).toHaveLength(0);
    }
  });
});
