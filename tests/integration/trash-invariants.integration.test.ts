// Trash invariants. Closes the manual-acceptance and RLS-tightening punch
// list at:
//   docs/superpowers/followups/2026-05-13-soft-delete-trash-followups.md
//     #1 collapse-dual-SELECT-policies → covered here + the migration
//        20260514150000_collapse_models_rls.sql
//     #2 manual-acceptance steps 5–8   → autosave-on-trashed,
//        restore-preserves-versions, purge-cascades, cron-purge
//     #3 model_versions defence-in-depth → "owner cannot SELECT versions
//        of a trashed model" test below
//
// Runs via `pnpm test:integration` against the local Supabase stack.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
import {
  addOrgMember,
  cleanupTestUser,
  createTestOrg,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestOrg,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

interface Fixture {
  owner: TestUser;
  orgMember: TestUser;
  org: TestOrg;
}

let fx: Fixture;

beforeAll(async () => {
  const owner = await createTestUser();
  const orgMember = await createTestUser();
  const org = await createTestOrg({ ownerId: owner.id });
  await addOrgMember({ orgId: org.id, profileId: orgMember.id, role: 'member' });
  fx = { owner, orgMember, org };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.owner.id);
  await cleanupTestUser(fx.orgMember.id);
});

// Helper: seed a personal (non-org, non-session) model. Optionally pre-trashed.
async function seedPersonalModel(opts: {
  ownerId: string;
  title?: string;
  trashed?: boolean;
}): Promise<string> {
  const admin = getAdminClient();
  const res = await admin
    .from('models')
    .insert({
      owner_profile_id: opts.ownerId,
      title: opts.title ?? 'fixture',
      canvas_state: EMPTY_CANVAS_STATE,
      deleted_at: opts.trashed ? new Date().toISOString() : null,
    })
    .select('id')
    .single();
  if (res.error || !res.data) {
    throw new Error(`seedPersonalModel failed: ${res.error?.message}`);
  }
  return res.data.id as string;
}

async function seedVersion(modelId: string, label: string, createdBy: string): Promise<string> {
  const admin = getAdminClient();
  const res = await admin
    .from('model_versions')
    .insert({
      model_id: modelId,
      label,
      canvas_state: EMPTY_CANVAS_STATE,
      created_by: createdBy,
    })
    .select('id')
    .single();
  if (res.error || !res.data) {
    throw new Error(`seedVersion failed: ${res.error?.message}`);
  }
  return res.data.id as string;
}

describe('Consolidated SELECT policy on models', () => {
  test('owner SEES their own trashed model (collapsed dual-policy behaviour)', async () => {
    const modelId = await seedPersonalModel({
      ownerId: fx.owner.id,
      title: 'owner-trashed',
      trashed: true,
    });
    const ownerClient = await signInAs(fx.owner);
    const res = await ownerClient
      .from('models')
      .select('id, deleted_at')
      .eq('id', modelId)
      .maybeSingle();
    expect(res.error).toBeNull();
    expect(res.data?.id).toBe(modelId);
    expect(res.data?.deleted_at).not.toBeNull();
  });

  test('org member cannot SELECT a trashed org-shared model', async () => {
    // Owner soft-deletes a model that was shared into the org. Org members
    // should no longer see it in any list query. Seed directly via admin
    // because the UI path doesn't currently let you mark an org_id and
    // a deleted_at in one shot.
    const admin = getAdminClient();
    const insRes = await admin
      .from('models')
      .insert({
        owner_profile_id: fx.owner.id,
        org_id: fx.org.id,
        title: 'trashed-org-model',
        canvas_state: EMPTY_CANVAS_STATE,
        deleted_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (insRes.error || !insRes.data) {
      throw new Error(`seed failed: ${insRes.error?.message}`);
    }
    const modelId = insRes.data.id as string;

    const memberClient = await signInAs(fx.orgMember);
    const res = await memberClient.from('models').select('id').eq('id', modelId).maybeSingle();
    expect(res.error).toBeNull();
    // RLS filters the row out for the org member; the active branch of the
    // SELECT policy requires deleted_at IS NULL.
    expect(res.data).toBeNull();
  });
});

describe('Tightened SELECT on model_versions', () => {
  test('owner cannot SELECT versions of their trashed model', async () => {
    const modelId = await seedPersonalModel({
      ownerId: fx.owner.id,
      title: 'will-trash',
      trashed: false,
    });
    await seedVersion(modelId, 'v1', fx.owner.id);
    await seedVersion(modelId, 'v2', fx.owner.id);

    // Trash it now.
    const admin = getAdminClient();
    const trashRes = await admin
      .from('models')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', modelId);
    expect(trashRes.error).toBeNull();

    const ownerClient = await signInAs(fx.owner);
    const res = await ownerClient.from('model_versions').select('id').eq('model_id', modelId);
    expect(res.error).toBeNull();
    // Tightened policy: versions of trashed models are invisible.
    expect(res.data ?? []).toHaveLength(0);
  });

  test('restore preserves version history (RLS lets versions back through)', async () => {
    const modelId = await seedPersonalModel({
      ownerId: fx.owner.id,
      title: 'will-trash-then-restore',
      trashed: false,
    });
    await seedVersion(modelId, 'snapshot-1', fx.owner.id);
    await seedVersion(modelId, 'snapshot-2', fx.owner.id);

    const admin = getAdminClient();
    // Trash → restore.
    await admin.from('models').update({ deleted_at: new Date().toISOString() }).eq('id', modelId);
    await admin.from('models').update({ deleted_at: null }).eq('id', modelId);

    const ownerClient = await signInAs(fx.owner);
    const res = await ownerClient
      .from('model_versions')
      .select('id, label')
      .eq('model_id', modelId);
    expect(res.error).toBeNull();
    expect(res.data ?? []).toHaveLength(2);
    const labels = (res.data ?? []).map((r) => r.label).sort();
    expect(labels).toEqual(['snapshot-1', 'snapshot-2']);
  });
});

describe('Soft delete & cascade behaviour', () => {
  test('autosave PATCH on a trashed model is refused by the trigger', async () => {
    const modelId = await seedPersonalModel({
      ownerId: fx.owner.id,
      title: 'pre-trashed',
      trashed: true,
    });

    const ownerClient = await signInAs(fx.owner);
    // Simulates what the autosave PATCH does: blind UPDATE of canvas_state
    // without a `.is('deleted_at', null)` filter. Prior to the
    // reject_update_to_trashed_model trigger this snuck through because
    // the soft-delete policy's WITH CHECK (deleted_at IS NOT NULL) accepted
    // any new row whose deleted_at stayed non-null. The trigger compares
    // OLD and NEW and refuses when both are trashed.
    const updateRes = await ownerClient
      .from('models')
      .update({ canvas_state: { groups: [], bricks: [{ id: 'b1' }] } })
      .eq('id', modelId)
      .select('id');
    expect(updateRes.error).not.toBeNull();
    // P0001 = generic raise_exception from plpgsql.
    expect(updateRes.error?.code).toBe('P0001');

    // Confirm the canvas_state didn't change.
    const admin = getAdminClient();
    const verify = await admin.from('models').select('canvas_state').eq('id', modelId).single();
    expect(verify.data?.canvas_state).toEqual(EMPTY_CANVAS_STATE);
  });

  test('hard-delete a model cascades to its model_versions', async () => {
    const modelId = await seedPersonalModel({
      ownerId: fx.owner.id,
      title: 'cascade-test',
      trashed: false,
    });
    await seedVersion(modelId, 'will-cascade-1', fx.owner.id);
    await seedVersion(modelId, 'will-cascade-2', fx.owner.id);

    const admin = getAdminClient();
    const delRes = await admin.from('models').delete().eq('id', modelId).select('id');
    expect(delRes.error).toBeNull();
    expect(delRes.data ?? []).toHaveLength(1);

    const versionsAfter = await admin.from('model_versions').select('id').eq('model_id', modelId);
    expect(versionsAfter.error).toBeNull();
    expect(versionsAfter.data ?? []).toHaveLength(0);
  });
});

describe('purge_expired_trashed_models()', () => {
  test('removes rows trashed more than 30 days ago, leaves recent ones', async () => {
    const admin = getAdminClient();

    // 31 days back — should be purged.
    const oldRes = await admin
      .from('models')
      .insert({
        owner_profile_id: fx.owner.id,
        title: 'old-trash',
        canvas_state: EMPTY_CANVAS_STATE,
        deleted_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();
    if (oldRes.error || !oldRes.data) {
      throw new Error(`seed-old failed: ${oldRes.error?.message}`);
    }
    const oldId = oldRes.data.id as string;

    // 1 day back — should survive.
    const recentRes = await admin
      .from('models')
      .insert({
        owner_profile_id: fx.owner.id,
        title: 'recent-trash',
        canvas_state: EMPTY_CANVAS_STATE,
        deleted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();
    if (recentRes.error || !recentRes.data) {
      throw new Error(`seed-recent failed: ${recentRes.error?.message}`);
    }
    const recentId = recentRes.data.id as string;

    // Invoke the cron function manually — tests the function body, not
    // the pg_cron scheduler.
    const rpcRes = await admin.rpc('purge_expired_trashed_models');
    expect(rpcRes.error).toBeNull();

    const oldLookup = await admin.from('models').select('id').eq('id', oldId).maybeSingle();
    expect(oldLookup.error).toBeNull();
    expect(oldLookup.data).toBeNull();

    const recentLookup = await admin.from('models').select('id').eq('id', recentId).maybeSingle();
    expect(recentLookup.error).toBeNull();
    expect(recentLookup.data?.id).toBe(recentId);

    // Cleanup the surviving recent row to keep the fixture clean.
    await admin.from('models').delete().eq('id', recentId);
  });
});
