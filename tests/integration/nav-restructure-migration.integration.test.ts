// Verifies the invariants installed by 20260515000000_nav_restructure.sql:
//   1. profiles no longer has active_org_id column
//   2. sessions.org_id is NOT NULL (the migration codifies that all sessions
//      have an explicit org — there is no Personal session context)
//
// Runs via `pnpm test:integration` against the local Supabase stack.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  cleanupTestUser,
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

  test('inserting a session without org_id fails with not-null violation (23502)', async () => {
    const admin = getAdminClient();
    // Service role bypasses RLS; this only tests the column-level NOT NULL.
    // facilitator_id is also NOT NULL, so we supply that but deliberately
    // omit org_id to isolate the invariant we care about.
    const res = await admin
      .from('sessions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ facilitator_id: probeUser.id, title: 'no-org session' } as any)
      .select('id');

    expect(res.error).not.toBeNull();
    // 23502 = not_null_violation
    expect(res.error?.code).toBe('23502');
  });
});
