// tests/integration/admin-presence.integration.test.ts
//
// Integration coverage for the presence heartbeat + online samples tables.
//
// Verifies:
//   * touch_presence() upserts exactly one row for the caller and bumps it.
//   * anon cannot execute touch_presence (grant is authenticated-only).
//   * RLS — non-admins read neither profile_presence nor online_user_samples;
//     site admins read both.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  makeAnonClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

const admin = getAdminClient();
let adminUser: TestUser;
let plainUser: TestUser;

beforeAll(async () => {
  adminUser = await createTestUser();
  plainUser = await createTestUser();
  const flip = await admin.from('profiles').update({ is_site_admin: true }).eq('id', adminUser.id);
  if (flip.error) throw new Error(`Could not flip is_site_admin: ${flip.error.message}`);
});

afterAll(async () => {
  await cleanupTestUser(adminUser.id);
  await cleanupTestUser(plainUser.id);
});

describe('touch_presence()', () => {
  test('upserts one row for the caller and bumps last_seen_at on repeat', async () => {
    const client = await signInAs(plainUser);

    const first = await client.rpc('touch_presence');
    expect(first.error).toBeNull();

    const after1 = await admin
      .from('profile_presence')
      .select('last_seen_at')
      .eq('profile_id', plainUser.id)
      .single();
    expect(after1.error).toBeNull();
    const t1 = new Date(after1.data!.last_seen_at).getTime();

    await new Promise((r) => setTimeout(r, 50));
    const second = await client.rpc('touch_presence');
    expect(second.error).toBeNull();

    const rows = await admin
      .from('profile_presence')
      .select('last_seen_at')
      .eq('profile_id', plainUser.id);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(1);
    expect(new Date(rows.data![0]!.last_seen_at).getTime()).toBeGreaterThan(t1);
  });

  test('anon cannot execute touch_presence', async () => {
    const anon = makeAnonClient();
    const res = await anon.rpc('touch_presence');
    expect(res.error).not.toBeNull();
  });
});

describe('RLS', () => {
  test('non-admin reads neither presence nor samples; admin reads both', async () => {
    // Seed one row in each table via the service-role client (bypasses RLS).
    const seedPresence = await admin
      .from('profile_presence')
      .upsert({ profile_id: adminUser.id, last_seen_at: new Date().toISOString() });
    expect(seedPresence.error).toBeNull();
    const seedSample = await admin
      .from('online_user_samples')
      .insert({ sampled_at: '2026-01-01T00:00:00Z', online_count: 3 });
    expect(seedSample.error).toBeNull();

    const plain = await signInAs(plainUser);
    const p1 = await plain.from('profile_presence').select('profile_id');
    expect(p1.error).toBeNull();
    expect(p1.data).toHaveLength(0);
    const s1 = await plain.from('online_user_samples').select('online_count');
    expect(s1.error).toBeNull();
    expect(s1.data).toHaveLength(0);

    const adminClient = await signInAs(adminUser);
    const p2 = await adminClient.from('profile_presence').select('profile_id');
    expect(p2.error).toBeNull();
    expect(p2.data!.length).toBeGreaterThanOrEqual(1);
    const s2 = await adminClient
      .from('online_user_samples')
      .select('online_count')
      .eq('sampled_at', '2026-01-01T00:00:00+00:00');
    expect(s2.error).toBeNull();
    expect(s2.data).toHaveLength(1);

    // Clean up the fixed-key sample so reruns don't collide.
    await admin.from('online_user_samples').delete().eq('sampled_at', '2026-01-01T00:00:00+00:00');
  });

  test('authenticated user cannot write presence directly (no INSERT/UPDATE policy)', async () => {
    const plain = await signInAs(plainUser);
    const ins = await plain
      .from('profile_presence')
      .insert({ profile_id: plainUser.id, last_seen_at: new Date().toISOString() });
    expect(ins.error).not.toBeNull();
  });
});
