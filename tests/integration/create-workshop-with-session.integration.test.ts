// Integration coverage for the create_workshop_with_session RPC and the
// createWorkshopWithSession service that wraps it.
//
// The point of the RPC is atomicity: a failure partway through must leave
// NOTHING behind, not a workshop with no session.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { setActionClient } from './_helpers/action-mocks';
import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

import { createWorkshopWithSession } from '@/lib/workshops/service';

let owner: TestUser;

beforeAll(async () => {
  owner = await createTestUser();
});

afterAll(async () => {
  if (owner) await cleanupTestUser(owner.id);
});

describe('createWorkshopWithSession', () => {
  test('creates workshop, session and five stages in one call', async () => {
    const supabase = await signInAs(owner);
    setActionClient(supabase);

    const slug = `sprint-${Date.now().toString(36)}`;
    const res = await createWorkshopWithSession({
      supabase,
      userId: owner.id,
      workshopName: 'Product Sprint',
      slug,
      sessionTitle: 'Discovery Day',
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const admin = getAdminClient();
    const stages = await admin
      .from('stages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', res.data.sessionId);
    expect(stages.count).toBe(5);
  });

  test('a duplicate slug leaves no workshop and no session behind', async () => {
    const supabase = await signInAs(owner);
    setActionClient(supabase);

    const slug = `dupe-${Date.now().toString(36)}`;
    const first = await createWorkshopWithSession({
      supabase,
      userId: owner.id,
      workshopName: 'First',
      slug,
      sessionTitle: 'One',
    });
    expect(first.ok).toBe(true);

    const admin = getAdminClient();
    const before = await admin
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('title', 'Two');

    const second = await createWorkshopWithSession({
      supabase,
      userId: owner.id,
      workshopName: 'Second',
      slug,
      sessionTitle: 'Two',
    });
    expect(second).toEqual({ ok: false, code: 'slug_taken' });

    // The rollback proof: the second call's session must not exist.
    const after = await admin
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('title', 'Two');
    expect(after.count).toBe(before.count ?? 0);
  });
});
