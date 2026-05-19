// tests/integration/models-realtime.integration.test.ts
//
// Locks in: with `public.models` in the supabase_realtime publication and
// REPLICA IDENTITY FULL, a session-org-member NON-OWNER subscribed to
// model:${id} receives the UPDATE payload with the new canvas_state.
//
// Sibling pattern: stage-controller.integration.test.ts (test-client fixture +
// real local Supabase + Realtime). Polyfill in tests/integration/setup.ts
// provides globalThis.WebSocket for supabase-js's RealtimeClient.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { RealtimeChannel } from '@supabase/supabase-js';

import {
  addOrgMember,
  cleanupTestUser,
  createTestOrg,
  createTestSession,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestSession,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

interface Fixture {
  facilitator: TestUser;
  participant: TestUser;
  session: TestSession;
  modelId: string;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const participant = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  await addOrgMember({ orgId: org.id, profileId: participant.id, role: 'member' });
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
  });

  // Pick an individual_model stage for the participant to own a model on.
  const admin = getAdminClient();
  const { data: stages } = await admin
    .from('stages')
    .select('id, stage_type')
    .eq('session_id', session.id)
    .eq('stage_type', 'individual_model');
  const stageId = stages?.[0]?.id;
  if (!stageId) throw new Error('individual_model stage missing in fixture');

  const { data: inserted } = await admin
    .from('models')
    .insert({
      title: 'live-test',
      canvas_state: { groups: [], bricks: [] },
      owner_profile_id: participant.id,
      session_id: session.id,
      stage_id: stageId,
    })
    .select('id')
    .single();
  if (!inserted) throw new Error('model insert failed');

  fx = { facilitator, participant, session, modelId: inserted.id };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
  await cleanupTestUser(fx.participant.id);
});

describe('models Realtime delivery', () => {
  test('non-owner session-org-member receives canvas_state UPDATE within 3s', async () => {
    // 1. Facilitator (non-owner, session-org-member) subscribes.
    const facClient = await signInAs(fx.facilitator);
    const { data: sessionData } = await facClient.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('no facilitator JWT');
    facClient.realtime.setAuth(token);

    const received: Array<{ canvas_state: unknown; title: string }> = [];
    const channel: RealtimeChannel = facClient
      .channel(`model:${fx.modelId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'models', filter: `id=eq.${fx.modelId}` },
        (payload) => {
          const next = (payload as unknown as { new?: { canvas_state: unknown; title: string } })
            .new;
          if (next) received.push(next);
        },
      );

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('subscribe timeout')), 5000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timer);
            resolve();
          }
        });
      });

      // 2. Owner (participant) updates canvas_state via service role (mirrors PATCH /api/models).
      const admin = getAdminClient();
      const newState = {
        groups: [{ id: 'g1', name: 'g', collapsed: false, visible: true }],
        bricks: [],
      };
      const { error } = await admin
        .from('models')
        .update({ canvas_state: newState, title: 'updated-title' })
        .eq('id', fx.modelId);
      expect(error).toBeNull();

      // 3. Within 3s, the facilitator's subscription must see it.
      await expectEventually(() => received.length >= 1, 3000);
      expect(received[0]!.title).toBe('updated-title');
      expect((received[0]!.canvas_state as { groups: unknown[] }).groups).toHaveLength(1);
    } finally {
      await facClient.removeChannel(channel);
    }
  });
});

async function expectEventually(cond: () => boolean, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!cond()) {
    if (Date.now() > deadline) throw new Error(`condition not met within ${timeoutMs}ms`);
    await new Promise((r) => setTimeout(r, 50));
  }
}
