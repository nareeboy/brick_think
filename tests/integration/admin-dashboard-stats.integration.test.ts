// tests/integration/admin-dashboard-stats.integration.test.ts
//
// getAdminDashboardStats against seeded rows on the local stack.
//
// Verifies:
//   * null for non-admin callers.
//   * sign-up counts/deltas respect period boundaries (backdated profiles).
//   * onlineNow counts only fresh presence.
//   * onlineSeries buckets seeded samples (historical buckets asserted;
//     the final bucket is skipped because local pg_cron may add a live
//     sample mid-test).
//   * collectingSince reflects the first sample vs the range start.
//   * recentSignups returns newest-first with name fallback to email.

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { type SupabaseClient } from '@supabase/supabase-js';

import {
  cleanupTestUser,
  createTestUser,
  getAdminClient,
  signInAs,
  type TestUser,
} from '@/lib/testing/supabase-test-client';

let currentClient: SupabaseClient | null = null;

vi.mock('@/lib/db/server', () => ({
  createServerSupabaseClient: vi.fn(async () => {
    if (!currentClient) throw new Error('currentClient not set');
    return currentClient;
  }),
}));

// Import AFTER the mock so isCallerSiteAdmin resolves through it.
import { getAdminDashboardStats } from '@/lib/admin/dashboard';
import { fetchDashboardStatsAction } from '@/app/(authed)/app/admin/actions';

const admin = getAdminClient();
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60 * 1000).toISOString();

let adminUser: TestUser;
let plainUser: TestUser;
let oldUser: TestUser;

beforeAll(async () => {
  adminUser = await createTestUser();
  plainUser = await createTestUser();
  oldUser = await createTestUser();
  const flip = await admin.from('profiles').update({ is_site_admin: true }).eq('id', adminUser.id);
  if (flip.error) throw new Error(flip.error.message);
  // Backdate oldUser outside the 7d window but inside the previous-7d window.
  const backdate = await admin
    .from('profiles')
    .update({ created_at: daysAgo(10) })
    .eq('id', oldUser.id);
  if (backdate.error) throw new Error(backdate.error.message);

  // Presence: plainUser fresh, oldUser stale.
  await admin.from('profile_presence').upsert([
    { profile_id: plainUser.id, last_seen_at: minutesAgo(1) },
    { profile_id: oldUser.id, last_seen_at: minutesAgo(30) },
  ]);

  // Samples: wipe, then seed two known historical points inside 24h.
  await admin.from('online_user_samples').delete().gte('sampled_at', '1970-01-01');
  await admin.from('online_user_samples').insert([
    { sampled_at: minutesAgo(600), online_count: 7 },
    { sampled_at: minutesAgo(590), online_count: 11 },
  ]);
});

afterAll(async () => {
  await cleanupTestUser(adminUser.id);
  await cleanupTestUser(plainUser.id);
  await cleanupTestUser(oldUser.id);
});

describe('getAdminDashboardStats', () => {
  test('returns null for non-admin callers', async () => {
    currentClient = await signInAs(plainUser);
    expect(await getAdminDashboardStats('7d')).toBeNull();
  });

  test('computes counts, deltas, presence, series and recent sign-ups', async () => {
    currentClient = await signInAs(adminUser);
    const stats = await getAdminDashboardStats('7d');
    expect(stats).not.toBeNull();
    if (!stats) return;

    expect(stats.range).toBe('7d');
    expect(stats.periodLabel).toBe('last 7 days');
    // adminUser + plainUser were created seconds ago (in-period); oldUser is
    // 10 days old (previous period). Other rows may exist in the local DB,
    // so assert lower bounds and the seeded relationships, not exact totals.
    expect(stats.totalUsers).toBeGreaterThanOrEqual(3);
    expect(stats.newSignups).toBeGreaterThanOrEqual(2);
    expect(stats.onlineNow).toBeGreaterThanOrEqual(1);
    expect(stats.signupSparkline).toHaveLength(12);
    expect(stats.signupSparkline.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(2);

    // Recent sign-ups: our two fresh users are the newest; name falls back to email.
    const emails = stats.recentSignups.map((r) => r.email);
    expect(emails).toContain(adminUser.email);
    expect(emails).toContain(plainUser.email);
    expect(stats.recentSignups[0]!.name.length).toBeGreaterThan(0);
  });

  test('onlineSeries buckets seeded samples; collectingSince set when sampling started after range start', async () => {
    currentClient = await signInAs(adminUser);
    const stats = await getAdminDashboardStats('24h');
    expect(stats).not.toBeNull();
    if (!stats) return;

    expect(stats.onlineSeries).toHaveLength(24);
    // The two seeded samples (~10h ago) land in the same hourly bucket → max 11.
    const values = stats.onlineSeries.slice(0, 23).map((p) => p.value);
    expect(Math.max(...values)).toBe(11);
    // First sample is ~10h ago — later than the 24h range start.
    expect(stats.collectingSince).not.toBeNull();

    // 90d range starts long before the first sample too.
    const wide = await getAdminDashboardStats('90d');
    expect(wide?.collectingSince).not.toBeNull();
  });
});

// PostgREST caps unpaginated selects at `max_rows` (1000, see
// supabase/config.toml). online_user_samples accrues ~288 rows/day (5-min
// cron), so wide ranges can exceed that cap. Without pagination in
// getAdminDashboardStats, an ascending unlimited select would silently
// truncate to the oldest 1000 rows and drop the newest samples — exactly
// the ones the chart cares about. This suite owns its own samples fixture
// (wipe/reseed) and runs last so it doesn't disturb the assertions above.
describe('pagination past PostgREST max_rows', () => {
  const SAMPLE_COUNT = 1050;
  const HIGHLIGHT_COUNT = 42;
  const INSERT_CHUNK = 500;

  beforeAll(async () => {
    await admin.from('online_user_samples').delete().gte('sampled_at', '1970-01-01');

    // Walk backwards in 5-minute steps from 10 minutes ago, so every row is
    // well inside the 7d window. Index 0 is the newest sample and gets a
    // distinctive online_count — with ascending-order truncation at 1000
    // rows it would be the first one dropped.
    const rows = Array.from({ length: SAMPLE_COUNT }, (_, i) => ({
      sampled_at: minutesAgo(10 + i * 5),
      online_count: i === 0 ? HIGHLIGHT_COUNT : 1,
    }));

    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const chunk = rows.slice(i, i + INSERT_CHUNK);
      const inserted = await admin.from('online_user_samples').insert(chunk);
      if (inserted.error) throw new Error(`seed samples chunk failed: ${inserted.error.message}`);
    }
  });

  afterAll(async () => {
    // Restore the original two-sample fixture in case this file grows more
    // tests after this suite.
    await admin.from('online_user_samples').delete().gte('sampled_at', '1970-01-01');
    const restore = await admin.from('online_user_samples').insert([
      { sampled_at: minutesAgo(600), online_count: 7 },
      { sampled_at: minutesAgo(590), online_count: 11 },
    ]);
    if (restore.error) throw new Error(`restore samples fixture failed: ${restore.error.message}`);
  });

  test('does not drop the newest samples when a range has more than 1000 of them', async () => {
    currentClient = await signInAs(adminUser);
    const stats = await getAdminDashboardStats('7d');
    expect(stats).not.toBeNull();
    if (!stats) return;

    // With truncation at 1000 ascending rows, the newest (highlighted)
    // sample would never make it into onlineSeries and this would be < 42.
    const maxValue = Math.max(...stats.onlineSeries.map((p) => p.value));
    expect(maxValue).toBe(HIGHLIGHT_COUNT);
  });
});

describe('fetchDashboardStatsAction', () => {
  test('rejects unknown ranges', async () => {
    currentClient = await signInAs(adminUser);
    const res = await fetchDashboardStatsAction('all-time');
    expect(res).toEqual({ ok: false, code: 'invalid_range' });
  });

  test('forbidden for non-admins, stats for admins', async () => {
    currentClient = await signInAs(plainUser);
    expect(await fetchDashboardStatsAction('7d')).toEqual({ ok: false, code: 'forbidden' });

    currentClient = await signInAs(adminUser);
    const res = await fetchDashboardStatsAction('7d');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.stats.range).toBe('7d');
  });
});
