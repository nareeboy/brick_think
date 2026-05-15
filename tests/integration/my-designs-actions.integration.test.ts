// Integration coverage for `createDesignAction`.
//
// Strategy: vi.mock the Next.js plumbing (`next/cache`, `next/navigation`,
// and the cookie-based `createServerSupabaseClient`) so the server action
// can be imported and invoked from Vitest. The mocked client returns a real
// supabase-js anon client signed in as the test user — so the action's
// SELECTs, INSERT, and the RLS that gates them all run against the local
// Supabase stack. End-to-end coverage (button click -> redirect to builder)
// is the Playwright suite (Task 14).
//
// Each test creates disposable users / org / session in `beforeAll` and
// cleans them up in `afterAll`, matching sessions-rls and the rest of the
// integration suite.

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import {
  cleanupTestUser,
  createTestOrg,
  createTestSession,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestOrg,
  type TestSession,
  type TestUser,
} from '@/lib/testing/supabase-test-client';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mocks must be declared before importing the action. vi.mock is hoisted
// above imports by Vitest, so the order in source is symbolic but the
// `currentClient` reference needs to be a module-level mutable.
let currentClient: SupabaseClient | null = null;
const redirects: Array<string | undefined> = [];

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: (url?: string) => {
    redirects.push(url);
    // Match Next's real behaviour: redirect() throws a sentinel so callers
    // bail out. We use a plain Error and let tests assert on .toThrow.
    throw new Error(`__redirect__:${url ?? ''}`);
  },
}));

vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) {
      throw new Error('Test bug: currentClient not set before action call');
    }
    return currentClient;
  }),
}));

// Import AFTER the mocks so the action picks them up.
import { createDesignAction } from '@/app/(authed)/app/my-designs/actions';

interface Fixture {
  owner: TestUser;
  outsider: TestUser;
  org: TestOrg;
  outsiderOrg: TestOrg;
  session: TestSession;
}

let fx: Fixture;

beforeAll(async () => {
  const owner = await createTestUser();
  const outsider = await createTestUser();

  const org = await createTestOrg({ ownerId: owner.id });
  // Outsider belongs to a separate org, never invited to `org`.
  const outsiderOrg = await createTestOrg({ ownerId: outsider.id });

  const session = await createTestSession({
    orgId: org.id,
    facilitatorId: owner.id,
    title: 'createDesignAction fixture',
  });

  fx = { owner, outsider, org, outsiderOrg, session };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.owner.id);
  await cleanupTestUser(fx.outsider.id);
});

describe('createDesignAction', () => {
  test('personal create (orgId=null, sessionId=null) yields a row with no context', async () => {
    currentClient = await signInAs(fx.owner);
    const id = await createDesignAction({ orgId: null, sessionId: null });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    // Read back via admin client to verify shape independent of RLS.
    const admin = getAdminClient();
    const verify = await admin
      .from('models')
      .select('id, owner_profile_id, org_id, session_id, stage_id')
      .eq('id', id)
      .single();
    expect(verify.error).toBeNull();
    expect(verify.data?.owner_profile_id).toBe(fx.owner.id);
    expect(verify.data?.org_id).toBeNull();
    expect(verify.data?.session_id).toBeNull();
    expect(verify.data?.stage_id).toBeNull();

    // Cleanup so future runs don't accumulate.
    await admin.from('models').delete().eq('id', id);
  });

  test('session-scoped create sets session_id + stage_id (skill_building, position 0) and leaves org_id null', async () => {
    currentClient = await signInAs(fx.owner);
    const id = await createDesignAction({
      orgId: fx.org.id,
      sessionId: fx.session.id,
    });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    const admin = getAdminClient();
    const verify = await admin
      .from('models')
      .select('id, owner_profile_id, org_id, session_id, stage_id')
      .eq('id', id)
      .single();
    expect(verify.error).toBeNull();
    expect(verify.data?.owner_profile_id).toBe(fx.owner.id);
    // org_id is intentionally null — models_context_exclusive forbids
    // (session_id, org_id) both being set, and the action hardcodes null.
    expect(verify.data?.org_id).toBeNull();
    expect(verify.data?.session_id).toBe(fx.session.id);
    // skill_building is CANONICAL_STAGE_TYPES[0], position=0 in stages table.
    expect(verify.data?.stage_id).toBe(fx.session.stageIds.skill_building);

    await admin.from('models').delete().eq('id', id);
  });

  test('throws when orgId belongs to an org the caller is not a member of', async () => {
    // outsider is not a member of `fx.org`. Construct a fake sessionId-shaped
    // UUID (it won't be reached — the membership check fails first).
    currentClient = await signInAs(fx.outsider);
    await expect(
      createDesignAction({
        orgId: fx.org.id,
        sessionId: fx.session.id,
      }),
    ).rejects.toThrow(/member/i);
  });
});
