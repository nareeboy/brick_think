import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
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
import { bringInPreviousModel } from '@/app/(authed)/app/sessions/stage-import-actions';

interface Fixture {
  facilitator: TestUser;
  participant: TestUser;
  outsider: TestUser;
  org: TestOrg;
  session: TestSession;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const participant = await createTestUser();
  const outsider = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  await addOrgMember({ orgId: org.id, profileId: participant.id, role: 'member' });
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'bring-in fixture',
  });
  fx = { facilitator, participant, outsider, org, session };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.participant.id);
  await cleanupTestUser(fx.outsider.id);
});

const POPULATED_CANVAS: CanvasState = {
  groups: [{ id: 'g_seed', name: 'Build', collapsed: false, visible: true }],
  bricks: [
    {
      id: 'b_seed',
      groupId: 'g_seed',
      code: 'red-2x2',
      image: '/bricks/red-2x2.png',
      width: 64,
      height: 64,
      x: 100,
      y: 200,
      rotation: 0,
      visible: true,
    },
  ],
};

async function insertSessionModel(args: {
  ownerProfileId: string;
  stageId: string;
  canvas: CanvasState;
}): Promise<string> {
  const admin = getAdminClient();
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: args.ownerProfileId,
      session_id: fx.session.id,
      stage_id: args.stageId,
      title: 'test',
      canvas_state: args.canvas,
    })
    .select('id')
    .single();
  if (res.error || !res.data) throw new Error(`insertSessionModel: ${res.error?.message}`);
  return res.data.id as string;
}

async function readCanvas(modelId: string): Promise<CanvasState> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('models')
    .select('canvas_state')
    .eq('id', modelId)
    .single();
  if (error || !data) throw new Error(`readCanvas: ${error?.message}`);
  return data.canvas_state as CanvasState;
}

async function countImports(targetModelId: string, profileId: string): Promise<number> {
  const admin = getAdminClient();
  const { count, error } = await admin
    .from('model_imports')
    .select('id', { count: 'exact', head: true })
    .eq('target_model_id', targetModelId)
    .eq('profile_id', profileId);
  if (error) throw new Error(`countImports: ${error.message}`);
  return count ?? 0;
}

async function cleanupModels(): Promise<void> {
  const admin = getAdminClient();
  await admin.from('model_imports').delete().eq('profile_id', fx.participant.id);
  await admin.from('models').delete().eq('session_id', fx.session.id);
}

describe('bringInPreviousModel (integration)', () => {
  test('system_model: copies canvas, writes audit row, fresh ids', async () => {
    await cleanupModels();
    await insertSessionModel({
      ownerProfileId: fx.facilitator.id,
      stageId: fx.session.stageIds.shared_model,
      canvas: POPULATED_CANVAS,
    });
    const targetId = await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.system_model,
      canvas: EMPTY_CANVAS_STATE,
    });
    currentClient = await signInAs(fx.participant);

    const res = await bringInPreviousModel(targetId);

    expect(res).toMatchObject({ ok: true, mode: 'server_copied' });
    const canvas = await readCanvas(targetId);
    expect(canvas.bricks).toHaveLength(1);
    expect(canvas.bricks[0]!.id).not.toBe(POPULATED_CANVAS.bricks[0]!.id);
    expect(canvas.groups[0]!.id).not.toBe(POPULATED_CANVAS.groups[0]!.id);
    expect(canvas.bricks[0]!.groupId).toBe(canvas.groups[0]!.id);
    expect(await countImports(targetId, fx.participant.id)).toBe(1);
  });

  test('shared_model: returns remapped source, writes audit row, does not mutate canvas', async () => {
    await cleanupModels();
    await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.individual_model,
      canvas: POPULATED_CANVAS,
    });
    const sharedId = await insertSessionModel({
      ownerProfileId: fx.facilitator.id,
      stageId: fx.session.stageIds.shared_model,
      canvas: EMPTY_CANVAS_STATE,
    });
    currentClient = await signInAs(fx.participant);

    const res = await bringInPreviousModel(sharedId);

    expect(res.ok).toBe(true);
    if (res.ok && res.mode === 'client_append') {
      expect(res.source.bricks).toHaveLength(1);
      expect(res.source.groups[0]!.name).toMatch(/Build$/);
    } else {
      throw new Error(`expected client_append mode, got ${JSON.stringify(res)}`);
    }
    const canvasAfter = await readCanvas(sharedId);
    expect(canvasAfter.bricks).toHaveLength(0);
    expect(await countImports(sharedId, fx.participant.id)).toBe(1);
  });

  test('individual_model: copies caller_own skill_building canvas (server_copied)', async () => {
    await cleanupModels();
    await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.skill_building,
      canvas: POPULATED_CANVAS,
    });
    const targetId = await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.individual_model,
      canvas: EMPTY_CANVAS_STATE,
    });
    currentClient = await signInAs(fx.participant);

    const res = await bringInPreviousModel(targetId);

    expect(res).toMatchObject({ ok: true, mode: 'server_copied' });
    const canvas = await readCanvas(targetId);
    expect(canvas.bricks).toHaveLength(1);
    expect(await countImports(targetId, fx.participant.id)).toBe(1);
  });

  test('guiding_principles: copies caller_own system_model canvas (server_copied)', async () => {
    await cleanupModels();
    await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.system_model,
      canvas: POPULATED_CANVAS,
    });
    const targetId = await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.guiding_principles,
      canvas: EMPTY_CANVAS_STATE,
    });
    currentClient = await signInAs(fx.participant);

    const res = await bringInPreviousModel(targetId);

    expect(res).toMatchObject({ ok: true, mode: 'server_copied' });
    const canvas = await readCanvas(targetId);
    expect(canvas.bricks).toHaveLength(1);
    expect(await countImports(targetId, fx.participant.id)).toBe(1);
  });

  test('rejects unsupported target stage (skill_building)', async () => {
    await cleanupModels();
    const targetId = await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.skill_building,
      canvas: EMPTY_CANVAS_STATE,
    });
    currentClient = await signInAs(fx.participant);

    const res = await bringInPreviousModel(targetId);
    expect(res).toEqual({ ok: false, code: 'unsupported_target_stage' });
  });

  test('source_not_found when no shared_model row exists for system_model target', async () => {
    await cleanupModels();
    const targetId = await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.system_model,
      canvas: EMPTY_CANVAS_STATE,
    });
    currentClient = await signInAs(fx.participant);

    const res = await bringInPreviousModel(targetId);
    expect(res).toEqual({ ok: false, code: 'source_not_found' });
  });

  test('source_not_found when source canvas is empty', async () => {
    await cleanupModels();
    await insertSessionModel({
      ownerProfileId: fx.facilitator.id,
      stageId: fx.session.stageIds.shared_model,
      canvas: EMPTY_CANVAS_STATE,
    });
    const targetId = await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.system_model,
      canvas: EMPTY_CANVAS_STATE,
    });
    currentClient = await signInAs(fx.participant);

    const res = await bringInPreviousModel(targetId);
    expect(res).toEqual({ ok: false, code: 'source_not_found' });
  });

  test('destination_not_empty when system_model already has bricks', async () => {
    await cleanupModels();
    await insertSessionModel({
      ownerProfileId: fx.facilitator.id,
      stageId: fx.session.stageIds.shared_model,
      canvas: POPULATED_CANVAS,
    });
    const targetId = await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.system_model,
      canvas: POPULATED_CANVAS,
    });
    currentClient = await signInAs(fx.participant);

    const res = await bringInPreviousModel(targetId);
    expect(res).toEqual({ ok: false, code: 'destination_not_empty' });
    expect(await countImports(targetId, fx.participant.id)).toBe(0);
  });

  test('already_imported on second shared_model call', async () => {
    await cleanupModels();
    await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.individual_model,
      canvas: POPULATED_CANVAS,
    });
    const sharedId = await insertSessionModel({
      ownerProfileId: fx.facilitator.id,
      stageId: fx.session.stageIds.shared_model,
      canvas: EMPTY_CANVAS_STATE,
    });
    currentClient = await signInAs(fx.participant);

    const first = await bringInPreviousModel(sharedId);
    expect(first.ok).toBe(true);
    const second = await bringInPreviousModel(sharedId);
    expect(second).toEqual({ ok: false, code: 'already_imported' });
    expect(await countImports(sharedId, fx.participant.id)).toBe(1);
  });

  test('rejects non-member with model_not_found', async () => {
    await cleanupModels();
    await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.individual_model,
      canvas: POPULATED_CANVAS,
    });
    const targetId = await insertSessionModel({
      ownerProfileId: fx.participant.id,
      stageId: fx.session.stageIds.system_model,
      canvas: EMPTY_CANVAS_STATE,
    });
    currentClient = await signInAs(fx.outsider);

    const res = await bringInPreviousModel(targetId);
    expect(res).toEqual({ ok: false, code: 'model_not_found' });
  });

  test('returns invalid_uuid for non-uuid input', async () => {
    currentClient = await signInAs(fx.participant);
    const res = await bringInPreviousModel('not-a-uuid');
    expect(res).toEqual({ ok: false, code: 'invalid_uuid' });
  });
});
