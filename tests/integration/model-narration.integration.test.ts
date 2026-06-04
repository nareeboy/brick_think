import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
import {
  combineNarrations,
  getCombinedNarrationsForModelIds,
  getMyNarration,
} from '@/lib/sessions/modelNarration';
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

describe('combineNarrations', () => {
  test('returns null for no entries', () => {
    expect(combineNarrations([])).toBeNull();
  });
  test('single speaker is verbatim, no attribution', () => {
    const c = combineNarrations([{ speakerName: 'Alice', transcript: 'Just me.', cleaned: true }]);
    expect(c).toEqual({ combinedText: 'Just me.', speakerCount: 1, anyCleaned: true });
  });
  test('multiple speakers are attributed and joined', () => {
    const c = combineNarrations([
      { speakerName: 'Alice', transcript: 'My bit.', cleaned: false },
      { speakerName: 'Bob', transcript: 'My bit too.', cleaned: true },
    ]);
    expect(c?.speakerCount).toBe(2);
    expect(c?.anyCleaned).toBe(true);
    expect(c?.combinedText).toBe('Alice:\nMy bit.\n\nBob:\nMy bit too.');
  });
});

describe('model_narrations per-speaker rows', () => {
  test('the owner can insert; a second insert by the SAME speaker on the model is rejected', async () => {
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
    expect(dup.error).not.toBeNull(); // unique (model_id, profile_id) violation
  });

  test('a DIFFERENT speaker can add their own narration to the same model', async () => {
    const admin = getAdminClient();
    const ins = await admin.from('model_narrations').insert({
      model_id: fx.modelId,
      profile_id: fx.member.id,
      stage_type: 'individual_model',
      transcript_raw: 'member view',
      transcript: 'Member view.',
      cleaned: false,
      cleanup_status: 'skipped',
    });
    expect(ins.error).toBeNull();
  });
});

describe('getMyNarration', () => {
  test('owner reads their OWN narration', async () => {
    const n = await getMyNarration(fx.modelId, fx.owner.id);
    expect(n?.transcript).toBe('Hello world.');
  });
  test('a different speaker reads their OWN narration on the same model', async () => {
    const n = await getMyNarration(fx.modelId, fx.member.id);
    expect(n?.transcript).toBe('Member view.');
  });
  test('outsider (no read access) gets null', async () => {
    const n = await getMyNarration(fx.modelId, fx.outsider.id);
    expect(n).toBeNull();
  });
});

describe('getCombinedNarrationsForModelIds', () => {
  test('combines every speaker on a model into one attributed transcript', async () => {
    const map = await getCombinedNarrationsForModelIds([fx.modelId]);
    const combined = map.get(fx.modelId);
    expect(combined?.speakerCount).toBe(2);
    expect(combined?.anyCleaned).toBe(true);
    expect(combined?.combinedText).toContain('Hello world.');
    expect(combined?.combinedText).toContain('Member view.');
  });
});
