// Integration coverage for account deletion — lib/account/delete.ts and the
// deleteAccountAction wrapper on /app/account. This is the destructive,
// admin-reachable path (lib/admin/deleteUser.ts in the premium overlay reuses
// the same module), previously untested.
//
// Verifies:
//   * preDeleteAccount inventories owned orgs correctly: orgs with other
//     members are blocking, solo orgs are queued for hard-delete, and owned
//     thumbnail blobs are listed with their full `${userId}/...` keys.
//   * performAccountDelete removes thumbnails + avatar from storage, deletes
//     sole-owner orgs, and deletes the auth user (profiles row cascades).
//   * FK semantics from 20260516120000_profile_fk_set_null.sql: a session
//     facilitated in someone else's org survives the delete with
//     facilitator_id nulled (collaborative history preserved), while
//     organisations.owner_id stays NOT NULL — so the DB itself blocks the
//     auth delete if a caller ignores the blockingOrgs contract.
//   * deleteAccountAction gates: mismatched confirmation email → typed
//     invalid_input; owned org with members → typed blocked (nothing
//     deleted); clean account → deletes and redirects to /sign-in.

import { afterAll, describe, expect, test, vi } from 'vitest';

import {
  addOrgMember,
  cleanupTestUser,
  createTestOrg,
  createTestSession,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';
import type { SupabaseClient } from '@supabase/supabase-js';

let currentClient: SupabaseClient | null = null;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (url?: string) => {
    throw new Error(`__redirect__:${url ?? ''}`);
  },
}));
vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set');
    return currentClient;
  }),
}));

// Import AFTER mocks are registered. lib/account/delete.ts itself uses the
// real service-role client against the local stack (env from .env.test).
import { performAccountDelete, preDeleteAccount } from '@/lib/account/delete';
import { deleteAccountAction } from '@/app/(authed)/app/account/actions';

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const createdUsers: TestUser[] = [];

async function newUser(): Promise<TestUser> {
  const user = await createTestUser();
  createdUsers.push(user);
  return user;
}

async function uploadBlob(bucket: string, path: string): Promise<void> {
  const admin = getAdminClient();
  const res = await admin.storage
    .from(bucket)
    .upload(path, PNG_BYTES, { contentType: 'image/png', upsert: true });
  if (res.error) throw new Error(`test upload to ${bucket}/${path} failed: ${res.error.message}`);
}

async function authUserExists(userId: string): Promise<boolean> {
  const admin = getAdminClient();
  const res = await admin.auth.admin.getUserById(userId);
  return !res.error && !!res.data.user;
}

afterAll(async () => {
  // Safe for users the tests already deleted — cleanupTestUser swallows the
  // admin.deleteUser error for missing users.
  for (const user of createdUsers) {
    await cleanupTestUser(user.id);
  }
});

describe('preDeleteAccount', () => {
  test('inventories blocking orgs, solo orgs, and owned thumbnails', async () => {
    const owner = await newUser();
    const member = await newUser();
    const soloOrg = await createTestOrg({ ownerId: owner.id });
    const sharedOrg = await createTestOrg({ ownerId: owner.id });
    await addOrgMember({ orgId: sharedOrg.id, profileId: member.id, role: 'member' });
    await uploadBlob('model-thumbnails', `${owner.id}/thumb-test.png`);

    const plan = await preDeleteAccount(owner.id);

    expect(plan.blockingOrgs).toEqual([
      { id: sharedOrg.id, name: sharedOrg.name, slug: sharedOrg.slug, reason: 'has_members' },
    ]);
    expect(plan.soloEmptyOrgIds).toEqual([soloOrg.id]);
    expect(plan.thumbnailPaths).toContain(`${owner.id}/thumb-test.png`);
  });

  test('returns an empty inventory for a user with no orgs or blobs', async () => {
    const loner = await newUser();
    const plan = await preDeleteAccount(loner.id);
    expect(plan).toEqual({ blockingOrgs: [], soloEmptyOrgIds: [], thumbnailPaths: [] });
  });
});

describe('performAccountDelete', () => {
  test('removes storage objects, sole-owner orgs, and the auth user', async () => {
    const user = await newUser();
    const org = await createTestOrg({ ownerId: user.id });
    await uploadBlob('model-thumbnails', `${user.id}/thumb-a.png`);
    await uploadBlob('avatars', `${user.id}/avatar.png`);

    const plan = await preDeleteAccount(user.id);
    expect(plan.blockingOrgs).toEqual([]);
    await performAccountDelete(user.id, plan);

    const admin = getAdminClient();
    expect(await authUserExists(user.id)).toBe(false);

    const profile = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle();
    expect(profile.data).toBeNull();

    const orgRow = await admin.from('organisations').select('id').eq('id', org.id).maybeSingle();
    expect(orgRow.data).toBeNull();

    const thumbs = await admin.storage.from('model-thumbnails').list(user.id);
    expect(thumbs.data ?? []).toEqual([]);
    const avatars = await admin.storage.from('avatars').list(user.id);
    expect(avatars.data ?? []).toEqual([]);
  });

  test('a session facilitated in someone else’s org survives with facilitator nulled', async () => {
    // sessions.facilitator_id is ON DELETE SET NULL (20260516120000) so the
    // org keeps its session history when the facilitator leaves.
    const facilitator = await newUser();
    const orgOwner = await newUser();
    const org = await createTestOrg({ ownerId: orgOwner.id });
    await addOrgMember({ orgId: org.id, profileId: facilitator.id, role: 'member' });
    const session = await createTestSession({ orgId: org.id, facilitatorId: facilitator.id });

    const plan = await preDeleteAccount(facilitator.id);
    expect(plan.blockingOrgs).toEqual([]); // the org is not theirs — not flagged
    await performAccountDelete(facilitator.id, plan);

    expect(await authUserExists(facilitator.id)).toBe(false);
    const admin = getAdminClient();
    const row = await admin
      .from('sessions')
      .select('id, facilitator_id')
      .eq('id', session.id)
      .single();
    expect(row.data?.facilitator_id).toBeNull();
  });

  test('the DB blocks the auth delete when a caller ignores blockingOrgs', async () => {
    // organisations.owner_id is deliberately NOT NULL + NO ACTION: an org
    // without an owner is broken (RLS keys off it). If a caller violates the
    // "refuse on blockingOrgs" contract, the FK is the backstop.
    const owner = await newUser();
    const member = await newUser();
    await createTestOrg({ ownerId: owner.id });
    const badPlan = { blockingOrgs: [], soloEmptyOrgIds: [], thumbnailPaths: [] };
    const sharedOrg = await createTestOrg({ ownerId: owner.id });
    await addOrgMember({ orgId: sharedOrg.id, profileId: member.id, role: 'member' });

    await expect(performAccountDelete(owner.id, badPlan)).rejects.toThrow(
      /Failed to delete auth user/,
    );
    expect(await authUserExists(owner.id)).toBe(true);
  });
});

describe('deleteAccountAction', () => {
  test('rejects a mismatched confirmation email without deleting anything', async () => {
    const user = await newUser();
    currentClient = await signInAs(user);

    const result = await deleteAccountAction('someone-else@brick-think.test');
    expect(result.kind).toBe('invalid_input');
    expect(await authUserExists(user.id)).toBe(true);
  });

  test('returns blocked when an owned org still has other members', async () => {
    const owner = await newUser();
    const member = await newUser();
    const org = await createTestOrg({ ownerId: owner.id });
    await addOrgMember({ orgId: org.id, profileId: member.id, role: 'member' });
    currentClient = await signInAs(owner);

    const result = await deleteAccountAction(owner.email);
    expect(result.kind).toBe('blocked');
    if (result.kind === 'blocked') {
      expect(result.reasons.map((r) => r.id)).toEqual([org.id]);
    }
    expect(await authUserExists(owner.id)).toBe(true);
  });

  test('deletes a clean account end-to-end and redirects to sign-in', async () => {
    const user = await newUser();
    const org = await createTestOrg({ ownerId: user.id });
    currentClient = await signInAs(user);

    await expect(deleteAccountAction(user.email)).rejects.toThrow(
      '__redirect__:/sign-in?reason=account_deleted',
    );

    const admin = getAdminClient();
    expect(await authUserExists(user.id)).toBe(false);
    const orgRow = await admin.from('organisations').select('id').eq('id', org.id).maybeSingle();
    expect(orgRow.data).toBeNull();
  });

  test('confirmation email match is case- and whitespace-insensitive', async () => {
    const user = await newUser();
    currentClient = await signInAs(user);

    await expect(deleteAccountAction(`  ${user.email.toUpperCase()}  `)).rejects.toThrow(
      '__redirect__:/sign-in?reason=account_deleted',
    );
    expect(await authUserExists(user.id)).toBe(false);
  });
});
