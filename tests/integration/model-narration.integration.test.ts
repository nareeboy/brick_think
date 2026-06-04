import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
import { getModelNarration } from '@/lib/sessions/modelNarration';
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

interface Fixture {
  owner: TestUser;
  member: TestUser;
  outsider: TestUser;
  org: TestOrg;
  session: TestSession;
  modelId: string;
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
    title: 'narration fixture',
  });
  const admin = getAdminClient();
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: owner.id,
      session_id: session.id,
      stage_id: session.stageIds.individual_model,
      title: 'narration model',
      canvas_state: EMPTY_CANVAS_STATE,
    })
    .select('id')
    .single();
  if (res.error || !res.data) throw new Error(`model insert failed: ${res.error?.message}`);
  fx = { owner, member, outsider, org, session, modelId: res.data.id as string };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.owner.id);
  await cleanupTestUser(fx.member.id);
  await cleanupTestUser(fx.outsider.id);
});

describe('model_narrations table', () => {
  test('service role can insert one narration per model and the unique constraint holds', async () => {
    const admin = getAdminClient();
    const ins = await admin.from('model_narrations').insert({
      model_id: fx.modelId,
      profile_id: fx.owner.id,
      stage_type: 'individual_model',
      transcript_raw: 'hello world',
      transcript: 'Hello world.',
      cleaned: true,
      cleanup_status: 'succeeded',
      duration_ms: 4200,
    });
    expect(ins.error).toBeNull();

    const dup = await admin.from('model_narrations').insert({
      model_id: fx.modelId,
      profile_id: fx.owner.id,
      stage_type: 'individual_model',
      transcript_raw: 'again',
      transcript: 'Again.',
    });
    expect(dup.error).not.toBeNull(); // unique (model_id) violation
  });
});

describe('getModelNarration read gate', () => {
  test('owner reads their narration', async () => {
    const n = await getModelNarration(fx.modelId, fx.owner.id);
    expect(n?.transcript).toBe('Hello world.');
  });
  test('org member (same org as session) reads it', async () => {
    // member is in the same org as the session facilitator — can_read_model grants access
    const n = await getModelNarration(fx.modelId, fx.member.id);
    expect(n?.transcript).toBe('Hello world.');
  });
  test('outsider gets null (no read access)', async () => {
    const n = await getModelNarration(fx.modelId, fx.outsider.id);
    expect(n).toBeNull();
  });
  test('authorised owner gets null when no narration row exists', async () => {
    // Insert a second model owned by fx.owner using a different stage (skill_building) to avoid
    // the unique constraint on (session, stage, owner) that individual_model already occupies.
    // No narration row is created for this model.
    const admin = getAdminClient();
    const res = await admin
      .from('models')
      .insert({
        owner_profile_id: fx.owner.id,
        session_id: fx.session.id,
        stage_id: fx.session.stageIds.skill_building,
        title: 'narration model (no narration)',
        canvas_state: EMPTY_CANVAS_STATE,
      })
      .select('id')
      .single();
    if (res.error || !res.data)
      throw new Error(`second model insert failed: ${res.error?.message}`);
    const newModelId = res.data.id as string;

    // Owner can read the model, but there is no narration row — expect null.
    const n = await getModelNarration(newModelId, fx.owner.id);
    expect(n).toBeNull();
  });
});
