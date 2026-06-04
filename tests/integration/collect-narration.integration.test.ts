// Verifies the AI-report collector picks up a model's saved narration so it can
// be woven into the generated write-up. Runs against the local Supabase stack.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { getServiceSupabaseClient } from '@/lib/db/service';
import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
import { collectSession } from '@/lib/reports/collect';
import {
  cleanupTestUser,
  createTestOrg,
  createTestSession,
  createTestUser,
  getAdminClient,
  type TestOrg,
  type TestSession,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

interface Fixture {
  facilitator: TestUser;
  org: TestOrg;
  session: TestSession;
  modelId: string;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: facilitator.id,
    title: 'collect narration fixture',
  });
  const admin = getAdminClient();
  const model = await admin
    .from('models')
    .insert({
      owner_profile_id: facilitator.id,
      session_id: session.id,
      stage_id: session.stageIds.individual_model,
      title: 'narrated model',
      canvas_state: EMPTY_CANVAS_STATE,
    })
    .select('id')
    .single();
  if (model.error || !model.data) throw new Error(`model insert failed: ${model.error?.message}`);
  const modelId = model.data.id as string;

  const narration = await admin.from('model_narrations').insert({
    model_id: modelId,
    profile_id: facilitator.id,
    stage_type: 'individual_model',
    transcript_raw: 'this tower is my team',
    transcript: 'This tower is my team.',
    cleaned: true,
    cleanup_status: 'succeeded',
  });
  if (narration.error) throw new Error(`narration insert failed: ${narration.error.message}`);

  fx = { facilitator, org, session, modelId };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
});

describe('collectSession narration inclusion', () => {
  test('a model with a saved narration carries its transcript into the collected report data', async () => {
    const collected = await collectSession(getServiceSupabaseClient(), fx.session.id);
    expect(collected).not.toBeNull();
    const individual = collected!.modelsByStage.get('individual_model') ?? [];
    const model = individual.find((m) => m.id === fx.modelId);
    expect(model).toBeDefined();
    expect(model!.narration).toEqual({ transcript: 'This tower is my team.', cleaned: true });
  });
});
