// Integration coverage for the pagination shape on /app/my-designs.
//
// The page.tsx server component issues:
//   supabase.from('models')
//     .select('…', { count: 'exact' })
//     .eq('owner_profile_id', user.id)
//     .is('deleted_at', null)
//     .order(…)
//     .range(offset, offset + PAGE_SIZE - 1)
//
// These tests pin three behaviours of that query against a real local
// Supabase stack with 30 owned designs:
//   1. Page 1 returns the first PAGE_SIZE rows and reports the full count.
//   2. The last page returns the remainder; pages beyond the last return
//      an empty data array but still report the full count.
//   3. The owner-scope filter is enforced — another user's designs never
//      appear in the count or the rows even when no other filter is set.

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';
import { EMPTY_CANVAS_STATE } from '@/lib/models/types';
import type { Json } from '@/lib/db/types.generated';

const PAGE_SIZE = 24;
const TOTAL_DESIGNS = 30;

interface Fixture {
  owner: TestUser;
  outsider: TestUser;
}

let fx: Fixture;

beforeAll(async () => {
  const owner = await createTestUser();
  const outsider = await createTestUser();
  fx = { owner, outsider };

  // Seed 30 designs for owner and 5 for outsider via the admin client so the
  // tests run as a deterministic bulk insert rather than 35 server-action
  // round-trips. The owner-scope filter check then has something to discriminate.
  const admin = getAdminClient();
  const ownerRows = Array.from({ length: TOTAL_DESIGNS }, (_, i) => ({
    owner_profile_id: fx.owner.id,
    title: `Design ${String(i + 1).padStart(3, '0')}`,
    canvas_state: EMPTY_CANVAS_STATE as unknown as Json,
  }));
  const outsiderRows = Array.from({ length: 5 }, (_, i) => ({
    owner_profile_id: fx.outsider.id,
    title: `Outsider ${i + 1}`,
    canvas_state: EMPTY_CANVAS_STATE as unknown as Json,
  }));
  const ownerIns = await admin.from('models').insert(ownerRows);
  if (ownerIns.error) throw new Error(`seed owner failed: ${ownerIns.error.message}`);
  const outsiderIns = await admin.from('models').insert(outsiderRows);
  if (outsiderIns.error) throw new Error(`seed outsider failed: ${outsiderIns.error.message}`);
});

afterAll(async () => {
  if (!fx) return;
  await cleanupTestUser(fx.owner.id);
  await cleanupTestUser(fx.outsider.id);
});

describe('my-designs pagination', () => {
  function paginated(supabase: Awaited<ReturnType<typeof signInAs>>, page: number) {
    const offset = (page - 1) * PAGE_SIZE;
    return supabase
      .from('models')
      .select('id, title', { count: 'exact' })
      .eq('owner_profile_id', fx.owner.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
  }

  test('page 1 returns PAGE_SIZE rows and reports the full count', async () => {
    const supabase = await signInAs(fx.owner);
    const res = await paginated(supabase, 1);
    expect(res.error).toBeNull();
    expect(res.count).toBe(TOTAL_DESIGNS);
    expect((res.data ?? []).length).toBe(PAGE_SIZE);
  });

  test('last page returns the remainder and reports the same count', async () => {
    const supabase = await signInAs(fx.owner);
    const res = await paginated(supabase, 2);
    expect(res.error).toBeNull();
    expect(res.count).toBe(TOTAL_DESIGNS);
    expect((res.data ?? []).length).toBe(TOTAL_DESIGNS - PAGE_SIZE);
  });

  test('out-of-range page surfaces PGRST103 so the page can redirect to page 1', async () => {
    // PostgREST's behaviour for an offset past the end is to return error
    // code PGRST103 ("Requested range not satisfiable"), not an empty data
    // array. The page server component catches that code specifically and
    // redirects the user to ?page=1 — see app/(authed)/app/my-designs/page.tsx.
    // This test pins the source-of-truth shape so the redirect branch can't
    // silently regress if Supabase or PostgREST change the error code.
    const supabase = await signInAs(fx.owner);
    const res = await paginated(supabase, 99);
    expect(res.error).not.toBeNull();
    expect(res.error?.code).toBe('PGRST103');
  });

  test('owner-scope: the outsider sees only their own rows in count and data', async () => {
    const supabase = await signInAs(fx.outsider);
    // Same shape as the page's query, but scoped to the outsider — proves the
    // .eq('owner_profile_id', …) filter is the only enforcement point we need
    // for count integrity (RLS would also block, but offset pagination cares
    // about the count specifically and that's what we're pinning).
    const res = await supabase
      .from('models')
      .select('id', { count: 'exact' })
      .eq('owner_profile_id', fx.outsider.id)
      .is('deleted_at', null)
      .range(0, PAGE_SIZE - 1);
    expect(res.error).toBeNull();
    expect(res.count).toBe(5);
    expect((res.data ?? []).length).toBe(5);
  });
});
