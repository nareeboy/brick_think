// Integration coverage for `createSession` server action.
//
// Regression test for Plan A Task 16 bug: createSession was inserting
// rows with join_code = NULL, breaking the entire participant-join flow
// for any session created after the join-code migration shipped. The
// migration's UPDATE backfill only ran once against pre-existing rows;
// new sessions had to mint their own code at insert time.
//
// Strategy mirrors my-designs-actions.integration.test.ts: the Next.js
// plumbing (`next/cache`, `next/navigation`, and the cookie-based
// `createServerSupabaseClient`) is mocked suite-wide in setup.ts (see
// _helpers/action-mocks.ts). The mocked client returns a real supabase-js
// anon client signed in as the test user — so the action's RPC + INSERT
// runs against the local Supabase stack with the real RLS gates.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { capturedRedirects, setActionClient } from './_helpers/action-mocks';
import {
  cleanupTestUser,
  createTestOrg,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestOrg,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

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
    setActionClient(await signInAs(fx.facilitator));

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
    const last = capturedRedirects[capturedRedirects.length - 1] ?? '';
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
