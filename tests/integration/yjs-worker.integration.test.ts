// Integration coverage for the Yjs worker: auth handshake, dual-write
// persistence, and propagation between two clients on the same model.
// Spawns the worker as a child process so the upgrade handler runs through
// its production code path.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

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
import { mintYjsToken } from '@/lib/yjs/jwt';
import {
  addBrickToDoc,
  projectDocToCanvas,
} from '@/lib/yjs/canvas-codec';

import { startWorker, stopWorker } from './_helpers/worker';

const SECRET = 'a'.repeat(64);
const PORT = 11234;
const WS_BASE = `ws://localhost:${PORT}`;

interface Fixture {
  owner: TestUser;
  member: TestUser;
  outsider: TestUser;
  org: TestOrg;
  session: TestSession;
}

let fx: Fixture;

beforeAll(async () => {
  const owner = await createTestUser();
  const member = await createTestUser();
  const outsider = await createTestUser();
  const org = await createTestOrg({ ownerId: owner.id });
  await addOrgMember({ orgId: org.id, profileId: member.id, role: 'member' });
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: owner.id,
    title: 'yjs-worker fixture',
  });
  fx = { owner, member, outsider, org, session };
  await startWorker({
    port: PORT,
    secret: SECRET,
  });
}, 30_000);

afterAll(async () => {
  await stopWorker();
  if (!fx) return;
  await cleanupTestUser(fx.owner.id);
  await cleanupTestUser(fx.member.id);
  await cleanupTestUser(fx.outsider.id);
});

async function seedSessionModel(
  stageType:
    | 'shared_model'
    | 'system_model'
    | 'individual_model'
    | 'skill_building'
    | 'guiding_principles',
  ownerId: string = fx.owner.id,
): Promise<string> {
  const admin = getAdminClient();
  const stageId = fx.session.stageIds[stageType];
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: ownerId,
      session_id: fx.session.id,
      stage_id: stageId,
      title: `worker-${stageType}-${crypto.randomUUID().slice(0, 6)}`,
      canvas_state: EMPTY_CANVAS_STATE,
    })
    .select('id')
    .single();
  if (res.error || !res.data) {
    throw new Error(`seedSessionModel failed: ${res.error?.message}`);
  }
  return res.data.id as string;
}

// Drive a WebsocketProvider against the worker and assert that it never
// completes a connection within `windowMs`. y-websocket's status events
// flap between 'connecting' and 'disconnected' across rejected reconnect
// attempts, so we observe `wsconnected` directly — it stays false when the
// upgrade keeps getting rejected.
async function expectRejected(
  provider: WebsocketProvider,
  windowMs = 2000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < windowMs) {
    if (provider.wsconnected) {
      throw new Error('expected rejection but provider connected');
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

function waitForSynced(provider: WebsocketProvider, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (provider.synced) {
      resolve();
      return;
    }
    const timer = setTimeout(() => reject(new Error('sync timeout')), timeoutMs);
    provider.once('synced', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('waitFor timeout');
}

describe('yjs worker', () => {
  test('two clients converge after edits + dual-write persists', async () => {
    const modelId = await seedSessionModel('shared_model');
    const tokenA = (
      await mintYjsToken({
        profileId: fx.owner.id,
        modelId,
        secret: SECRET,
        ttlSeconds: 60,
      })
    ).token;
    const tokenB = (
      await mintYjsToken({
        profileId: fx.member.id,
        modelId,
        secret: SECRET,
        ttlSeconds: 60,
      })
    ).token;

    const docA = new Y.Doc();
    const providerA = new WebsocketProvider(WS_BASE + '/yjs', modelId, docA, {
      params: { token: tokenA },
      connect: true,
      WebSocketPolyfill: (await import('ws')).WebSocket as never,
    });
    const docB = new Y.Doc();
    const providerB = new WebsocketProvider(WS_BASE + '/yjs', modelId, docB, {
      params: { token: tokenB },
      connect: true,
      WebSocketPolyfill: (await import('ws')).WebSocket as never,
    });

    try {
      await waitForSynced(providerA);
      await waitForSynced(providerB);

      addBrickToDoc(docA, {
        id: 'b1',
        groupId: 'g1',
        code: 'C',
        image: 'x.png',
        width: 80,
        height: 32,
        x: 100,
        y: 100,
        rotation: 0,
        visible: true,
      });

      await waitFor(() => projectDocToCanvas(docB).bricks.length === 1, 4000);
      expect(projectDocToCanvas(docB).bricks[0]?.id).toBe('b1');

      // Wait > debounce so persistence fires.
      await new Promise((r) => setTimeout(r, 1500));

      const admin = getAdminClient();
      const { data: yjsRow } = await admin
        .from('yjs_documents')
        .select('name, bytes')
        .eq('name', modelId)
        .maybeSingle();
      expect(yjsRow?.name).toBe(modelId);
      expect((yjsRow?.bytes ?? 0) as number).toBeGreaterThan(0);

      const { data: modelRow } = await admin
        .from('models')
        .select('canvas_state')
        .eq('id', modelId)
        .single();
      const persisted = modelRow?.canvas_state as {
        bricks: { id: string }[];
      } | null;
      expect(persisted?.bricks?.[0]?.id).toBe('b1');
    } finally {
      providerA.destroy();
      providerB.destroy();
    }
  }, 30_000);

  test('rejects upgrade when token modelId mismatches path', async () => {
    const modelId = await seedSessionModel('system_model');
    const otherModelId = '00000000-0000-0000-0000-000000000001';
    const { token } = await mintYjsToken({
      profileId: fx.owner.id,
      modelId: otherModelId,
      secret: SECRET,
      ttlSeconds: 60,
    });
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(WS_BASE + '/yjs', modelId, doc, {
      params: { token },
      connect: true,
      WebSocketPolyfill: (await import('ws')).WebSocket as never,
    });
    try {
      await expectRejected(provider);
    } finally {
      provider.destroy();
    }
  }, 10_000);

  test('rejects upgrade when token signed with wrong secret', async () => {
    const modelId = await seedSessionModel('individual_model');
    const { token } = await mintYjsToken({
      profileId: fx.owner.id,
      modelId,
      secret: 'b'.repeat(64),
      ttlSeconds: 60,
    });
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(WS_BASE + '/yjs', modelId, doc, {
      params: { token },
      connect: true,
      WebSocketPolyfill: (await import('ws')).WebSocket as never,
    });
    try {
      await expectRejected(provider);
    } finally {
      provider.destroy();
    }
  }, 10_000);

  test('rejects upgrade when user is not a member of the model org', async () => {
    // Distinct stage so the unique (session, stage, owner) constraint
    // doesn't collide with the propagation test that also seeded shared_model.
    const modelId = await seedSessionModel('skill_building');
    const { token } = await mintYjsToken({
      profileId: fx.outsider.id,
      modelId,
      secret: SECRET,
      ttlSeconds: 60,
    });
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(WS_BASE + '/yjs', modelId, doc, {
      params: { token },
      connect: true,
      WebSocketPolyfill: (await import('ws')).WebSocket as never,
    });
    try {
      await expectRejected(provider);
    } finally {
      provider.destroy();
    }
  }, 10_000);
});
