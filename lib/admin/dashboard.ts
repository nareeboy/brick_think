import 'server-only';

import { isCallerSiteAdmin } from '@/lib/articles/admin';
import { getServiceSupabaseClient } from '@/lib/db/service';
import {
  bucketCounts,
  bucketMaxSeries,
  buildBuckets,
  deltaLabel,
  periodLabel,
  rangeStart,
  relativeTime,
} from './dashboardBuckets';
import type { DashboardRange, DashboardStats, RecentSignup } from './dashboardTypes';

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const SPARKLINE_BUCKETS = 12;
const RECENT_SIGNUPS_LIMIT = 6;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// PostgREST caps unpaginated selects at `max_rows` (1000, per
// supabase/config.toml). online_user_samples accrues ~288 rows/day (5-min
// cron), so wide ranges (30d/90d) blow past that cap; without pagination
// only the oldest 1000 rows would come back and the newest chart buckets
// would render as zeros. Same shape risk on the signup sparkline fetch.
const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  buildQuery: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${label} failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function countProfilesCreatedBetween(
  service: ReturnType<typeof getServiceSupabaseClient>,
  from: Date | null,
  to: Date | null,
): Promise<number> {
  let query = service.from('profiles').select('id', { count: 'exact', head: true });
  if (from) query = query.gte('created_at', from.toISOString());
  if (to) query = query.lt('created_at', to.toISOString());
  const { count, error } = await query;
  if (error) throw new Error(`profiles count failed: ${error.message}`);
  return count ?? 0;
}

type SignupRow = { created_at: string };
type SampleRow = { sampled_at: string; online_count: number };

/**
 * All dashboard aggregates for one range. Returns null when the caller is
 * not a site admin — the caller decides how to surface that.
 */
export async function getAdminDashboardStats(
  range: DashboardRange,
  now: Date = new Date(),
): Promise<DashboardStats | null> {
  if (!(await isCallerSiteAdmin())) return null;
  const service = getServiceSupabaseClient();

  const start = rangeStart(range, now);
  const prevStart = new Date(start.getTime() - (now.getTime() - start.getTime()));
  const onlineCutoff = new Date(now.getTime() - ONLINE_WINDOW_MS);

  const [totalUsers, newSignups, prevSignups, last30dSignups] = await Promise.all([
    countProfilesCreatedBetween(service, null, null),
    countProfilesCreatedBetween(service, start, null),
    countProfilesCreatedBetween(service, prevStart, start),
    countProfilesCreatedBetween(service, new Date(now.getTime() - THIRTY_DAYS_MS), null),
  ]);

  const [signupRows, onlineNowRes, sampleRows, firstSampleRes, recentRows] = await Promise.all([
    fetchAllRows<SignupRow>(
      (from, to) =>
        service
          .from('profiles')
          .select('created_at')
          .gte('created_at', start.toISOString())
          .order('created_at', { ascending: true })
          .range(from, to),
      'signup rows',
    ),
    service
      .from('profile_presence')
      .select('profile_id', { count: 'exact', head: true })
      .gt('last_seen_at', onlineCutoff.toISOString()),
    fetchAllRows<SampleRow>(
      (from, to) =>
        service
          .from('online_user_samples')
          .select('sampled_at, online_count')
          .gte('sampled_at', start.toISOString())
          .order('sampled_at', { ascending: true })
          .range(from, to),
      'samples',
    ),
    service
      .from('online_user_samples')
      .select('sampled_at')
      .order('sampled_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    service
      .from('profiles')
      .select('full_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(RECENT_SIGNUPS_LIMIT),
  ]);

  if (onlineNowRes.error) throw new Error(`online count failed: ${onlineNowRes.error.message}`);
  if (firstSampleRes.error) throw new Error(`first sample failed: ${firstSampleRes.error.message}`);
  if (recentRows.error) throw new Error(`recent signups failed: ${recentRows.error.message}`);

  const buckets = buildBuckets(range, now);
  const onlineSeries = bucketMaxSeries(
    buckets,
    sampleRows.map((row) => ({
      sampledAt: new Date(row.sampled_at),
      count: row.online_count,
    })),
  );

  const firstSampleAt = firstSampleRes.data ? new Date(firstSampleRes.data.sampled_at) : null;
  const collectingSince =
    firstSampleAt === null
      ? now.toISOString()
      : firstSampleAt.getTime() > start.getTime()
        ? firstSampleAt.toISOString()
        : null;

  const recentSignups: RecentSignup[] = (recentRows.data ?? []).map((row) => ({
    name: row.full_name?.trim() || row.email,
    email: row.email,
    joined: relativeTime(new Date(row.created_at), now),
  }));

  return {
    range,
    periodLabel: periodLabel(range),
    deltaLabel: deltaLabel(range),
    totalUsers,
    totalUsersDelta: last30dSignups,
    newSignups,
    newSignupsDelta: newSignups - prevSignups,
    signupSparkline: bucketCounts(
      SPARKLINE_BUCKETS,
      start,
      now,
      signupRows.map((row) => new Date(row.created_at)),
    ),
    onlineNow: onlineNowRes.count ?? 0,
    onlineSeries,
    collectingSince,
    recentSignups,
  };
}
