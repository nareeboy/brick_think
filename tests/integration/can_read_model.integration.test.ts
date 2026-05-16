// Integration coverage for the worker-callable membership SQL functions
// added in 20260516210000_can_read_model.sql. These run against the local
// Supabase stack via `pnpm test:integration`.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

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

interface Fixture {
  owner: TestUser;
  member: TestUser;
  outsider: TestUser;
  org: TestOrg;
  outsiderOrg: TestOrg;
  session: TestSession;
}

let fx: Fixture;

beforeAll(async () => {
  const owner = await createTestUser();
  const member = await createTestUser();
  const outsider = await createTestUser();
  const org = await createTestOrg({ ownerId: owner.id });
  await addOrgMember({ orgId: org.id, profileId: member.id, role: 'member' });
  const outsiderOrg = await createTestOrg({ ownerId: outsider.id });
  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: owner.id,
    title: 'can_read_model fixture',
  });
  fx = { owner, member, outsider, org, outsiderOrg, session };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.owner.id);
  await cleanupTestUser(fx.member.id);
  await cleanupTestUser(fx.outsider.id);
});

async function callCanRead(profileId: string, modelId: string): Promise<boolean> {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc('can_read_model', {
    p_profile_id: profileId,
    p_model_id: modelId,
  });
  if (error) throw new Error(`can_read_model rpc failed: ${error.message}`);
  return Boolean(data);
}

async function insertPersonalModel(ownerId: string): Promise<string> {
  const admin = getAdminClient();
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: ownerId,
      title: 'personal',
      canvas_state: EMPTY_CANVAS_STATE,
    })
    .select('id')
    .single();
  if (res.error || !res.data) {
    throw new Error(`insertPersonalModel failed: ${res.error?.message}`);
  }
  return res.data.id as string;
}

async function insertOrgModel(ownerId: string, orgId: string): Promise<string> {
  const admin = getAdminClient();
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: ownerId,
      org_id: orgId,
      title: 'org',
      canvas_state: EMPTY_CANVAS_STATE,
    })
    .select('id')
    .single();
  if (res.error || !res.data) {
    throw new Error(`insertOrgModel failed: ${res.error?.message}`);
  }
  return res.data.id as string;
}

async function insertSessionModel(
  ownerId: string,
  sessionId: string,
  stageId: string,
): Promise<string> {
  const admin = getAdminClient();
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: ownerId,
      session_id: sessionId,
      stage_id: stageId,
      title: 'session',
      canvas_state: EMPTY_CANVAS_STATE,
    })
    .select('id')
    .single();
  if (res.error || !res.data) {
    throw new Error(`insertSessionModel failed: ${res.error?.message}`);
  }
  return res.data.id as string;
}

describe('public.can_read_model', () => {
  test('owner can read their own personal model', async () => {
    const modelId = await insertPersonalModel(fx.owner.id);
    expect(await callCanRead(fx.owner.id, modelId)).toBe(true);
  });

  test('stranger cannot read a personal model', async () => {
    const modelId = await insertPersonalModel(fx.owner.id);
    expect(await callCanRead(fx.outsider.id, modelId)).toBe(false);
  });

  test('org member can read an org-shared model', async () => {
    const modelId = await insertOrgModel(fx.owner.id, fx.org.id);
    expect(await callCanRead(fx.member.id, modelId)).toBe(true);
  });

  test('outsider cannot read an org-shared model', async () => {
    const modelId = await insertOrgModel(fx.owner.id, fx.org.id);
    expect(await callCanRead(fx.outsider.id, modelId)).toBe(false);
  });

  test('session org member can read a session-scoped model', async () => {
    const modelId = await insertSessionModel(
      fx.owner.id,
      fx.session.id,
      fx.session.stageIds.shared_model,
    );
    expect(await callCanRead(fx.member.id, modelId)).toBe(true);
  });

  test('non-member cannot read a session-scoped model', async () => {
    // Different stage from the prior test to avoid the
    // models_session_stage_owner_active_idx unique constraint (one model
    // per session+stage+owner triple).
    const modelId = await insertSessionModel(
      fx.owner.id,
      fx.session.id,
      fx.session.stageIds.system_model,
    );
    expect(await callCanRead(fx.outsider.id, modelId)).toBe(false);
  });

  test('soft-deleted models return false', async () => {
    const modelId = await insertPersonalModel(fx.owner.id);
    const admin = getAdminClient();
    const upd = await admin
      .from('models')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', modelId);
    expect(upd.error).toBeNull();
    expect(await callCanRead(fx.owner.id, modelId)).toBe(false);
  });

  test('unknown model id returns false', async () => {
    expect(
      await callCanRead(fx.owner.id, '00000000-0000-0000-0000-000000000000'),
    ).toBe(false);
  });
});
