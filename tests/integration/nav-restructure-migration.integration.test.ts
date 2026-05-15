// Verifies the invariants installed by 20260515000000_nav_restructure.sql:
//   1. profiles no longer has active_org_id column
//   2. handle_org_membership_removed() trigger no longer references the dropped
//      active_org_id column AND still nulls models.org_id for the leaving user
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
  type TestUser,
} from '@/lib/testing/supabase-test-client';

let probeUser: TestUser;

beforeAll(async () => {
  // We need a real auth.users + profiles row to SELECT against — the row
  // shape (Object.keys on a returned record) is what carries the column set.
  probeUser = await createTestUser();
});

afterAll(async () => {
  if (probeUser) {
    await cleanupTestUser(probeUser.id);
  }
});

describe('nav-restructure migration', () => {
  test('profiles row no longer exposes active_org_id', async () => {
    const admin = getAdminClient();
    const res = await admin
      .from('profiles')
      .select('*')
      .eq('id', probeUser.id)
      .single();

    expect(res.error).toBeNull();
    expect(res.data).not.toBeNull();
    // The column is dropped — its key must not appear on the returned row.
    expect(Object.keys(res.data ?? {})).not.toContain('active_org_id');
  });

  test('handle_org_membership_removed reverts org-shared models to personal and does not error after active_org_id drop', async () => {
    // This test pins the most behavior-changing part of the migration: the
    // rewritten trigger function. Before the rewrite, deleting a membership
    // would `update profiles set active_org_id = null where ...` — which
    // errors as `42703 column "active_org_id" does not exist` once Step 3
    // of the migration drops the column. The rewrite removes that statement
    // while preserving the models.org_id null-out for the leaving user.
    const admin = getAdminClient();

    // Two users: owner (A) and joining member (B).
    const owner = await createTestUser();
    const member = await createTestUser();
    let modelId: string | null = null;

    try {
      const org = await createTestOrg({ ownerId: owner.id });
      await addOrgMember({ orgId: org.id, profileId: member.id, role: 'member' });

      // Seed an org-shared model owned by B in that org. Session_id is
      // explicitly null to exercise the (org_id IS NOT NULL, session_id IS NULL)
      // shape that the trigger targets.
      const insertModel = await admin
        .from('models')
        .insert({
          owner_profile_id: member.id,
          org_id: org.id,
          session_id: null,
          title: 'org-shared by member',
          canvas_state: EMPTY_CANVAS_STATE,
        })
        .select('id')
        .single();
      expect(insertModel.error).toBeNull();
      modelId = insertModel.data?.id as string;

      // Act: remove B's membership. This fires handle_org_membership_removed
      // with old.org_id = org.id, old.profile_id = member.id.
      const deleteMembership = await admin
        .from('org_memberships')
        .delete()
        .eq('org_id', org.id)
        .eq('profile_id', member.id)
        .select('profile_id');

      // (1) The DELETE succeeded with no error: proves the rewritten function
      //     no longer references the dropped active_org_id column.
      expect(deleteMembership.error).toBeNull();
      expect(deleteMembership.data ?? []).toHaveLength(1);

      // (2) The leaving user's org-shared model is now personal (org_id = null):
      //     proves the model-revert block is still intact.
      const verify = await admin
        .from('models')
        .select('org_id, owner_profile_id')
        .eq('id', modelId)
        .single();
      expect(verify.error).toBeNull();
      expect(verify.data?.org_id).toBeNull();
      expect(verify.data?.owner_profile_id).toBe(member.id);
    } finally {
      // Order: the model FKs to profiles via owner_profile_id (NO ACTION), so
      // remove it before deleting the user. cleanupTestUser handles the rest.
      if (modelId) {
        await admin.from('models').delete().eq('id', modelId);
      }
      await cleanupTestUser(member.id);
      await cleanupTestUser(owner.id);
    }
  });
});
