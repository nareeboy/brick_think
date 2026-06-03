// Integration coverage for `createSession` server action.
//
// Regression test for Plan A Task 16 bug: createSession was inserting
// rows with join_code = NULL, breaking the entire participant-join flow
// for any session created after the join-code migration shipped. The
// migration's UPDATE backfill only ran once against pre-existing rows;
// new sessions had to mint their own code at insert time.
//
// Strategy mirrors my-designs-actions.integration.test.ts: vi.mock the
// Next.js plumbing (`next/cache`, `next/navigation`, and the cookie-based
// `createServerSupabaseClient`) so the action can be imported and invoked
// from Vitest. The mocked client returns a real supabase-js anon client
// signed in as the test user — so the action's RPC + INSERT runs against
// the local Supabase stack with the real RLS gates.

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  cleanupTestUser,
  createTestOrg,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestOrg,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

let currentClient: SupabaseClient | null = null;
const redirects: Array<string | undefined> = [];

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: (url?: string) => {
    redirects.push(url);
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
import { createSession } from '@/app/(authed)/app/sessions/actions';

interface Fixture {
  facilitator: TestUser;
  org: TestOrg;
}

let fx: Fixture;

beforeAll(async () => {
  const facilitator = await createTestUser();
  const org = await createTestOrg({ ownerId: facilitator.id });
  fx = { facilitator, org };
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.facilitator.id);
});

describe('createSession', () => {
  test('mints a join_code on the new session row', async () => {
    currentClient = await signInAs(fx.facilitator);

    const form = new FormData();
    form.set('title', 'Plan A Task 16 regression');
    form.set('orgId', fx.org.id);

    // createSession ends in a redirect() — catch the sentinel.
    let threw = false;
    try {
      await createSession(form);
    } catch (err) {
      threw = true;
      const msg = (err as Error).message ?? '';
      expect(msg.startsWith('__redirect__:/app/sessions/')).toBe(true);
    }
    expect(threw).toBe(true);

    // The redirect URL carries the new session id — pull it out and
    // verify the row was inserted with a join_code (admin client to
    // sidestep the SELECT RLS test surface, which isn't the subject).
    const last = redirects[redirects.length - 1] ?? '';
    const match = /^\/app\/sessions\/([0-9a-f-]+)$/.exec(last);
    if (!match) throw new Error(`unexpected redirect path: ${last}`);
    const sessionId = match[1] as string;

    const admin = getAdminClient();
    const row = await admin.from('sessions').select('join_code').eq('id', sessionId).single();
    expect(row.error).toBeNull();
    expect(row.data?.join_code).not.toBeNull();
    // generate_join_code emits a 6-char Crockford-style base32 string
    // (alphabet: 23456789ABCDEFGHJKMNPQRSTVWXYZ — uppercase, no 0/1/I/L/O/U).
    expect(row.data?.join_code).toMatch(/^[2-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/);
  });
});
