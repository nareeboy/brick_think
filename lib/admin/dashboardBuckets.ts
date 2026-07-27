// Pure date/bucketing helpers for the admin dashboard. All math is UTC;
// display labels are en-GB. `now` is always injected for testability.

import type { DashboardRange, SeriesPoint } from './dashboardTypes';

export type Bucket = { start: Date; end: Date; label: string; longLabel: string };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const RANGE_MS: Record<DashboardRange, number> = {
  '24h': DAY_MS,
  '7d': 7 * DAY_MS,
  '30d': 30 * DAY_MS,
  '90d': 90 * DAY_MS,
};

const PERIOD_LABEL: Record<DashboardRange, string> = {
  '24h': 'today',
  '7d': 'last 7 days',
  '30d': 'last 30 days',
  '90d': 'last 90 days',
};

const DELTA_LABEL: Record<DashboardRange, string> = {
  '24h': 'vs yesterday',
  '7d': 'vs previous 7 days',
  '30d': 'vs previous 30 days',
  '90d': 'vs previous 90 days',
};

export function rangeStart(range: DashboardRange, now: Date): Date {
  return new Date(now.getTime() - RANGE_MS[range]);
}

export function periodLabel(range: DashboardRange): string {
  return PERIOD_LABEL[range];
}

export function deltaLabel(range: DashboardRange): string {
  return DELTA_LABEL[range];
}

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
});
const weekdayFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
});
const dayFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});
const weekdayDayFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

type BucketSpec = {
  count: number;
  label: (start: Date) => string;
  longLabel: (start: Date) => string;
};

const BUCKET_SPEC: Record<DashboardRange, BucketSpec> = {
  '24h': {
    count: 24,
    label: (s) => timeFmt.format(s),
    longLabel: (s) => `${weekdayDayFmt.format(s)}, ${timeFmt.format(s)}`,
  },
  '7d': {
    count: 7,
    label: (s) => weekdayFmt.format(s),
    longLabel: (s) => weekdayDayFmt.format(s),
  },
  '30d': {
    count: 30,
    label: (s) => dayFmt.format(s),
    longLabel: (s) => weekdayDayFmt.format(s),
  },
  '90d': {
    count: 13,
    label: (s) => dayFmt.format(s),
    longLabel: (s) => `Week commencing ${dayFmt.format(s)}`,
  },
};

export function buildBuckets(range: DashboardRange, now: Date): Bucket[] {
  const spec = BUCKET_SPEC[range];
  const start = rangeStart(range, now).getTime();
  const width = (now.getTime() - start) / spec.count;
  return Array.from({ length: spec.count }, (_, i) => {
    const bucketStart = new Date(start + i * width);
    const bucketEnd = new Date(i === spec.count - 1 ? now.getTime() : start + (i + 1) * width);
    return {
      start: bucketStart,
      end: bucketEnd,
      label: spec.label(bucketStart),
      longLabel: spec.longLabel(bucketStart),
    };
  });
}

export function bucketMaxSeries(
  buckets: Bucket[],
  samples: Array<{ sampledAt: Date; count: number }>,
): SeriesPoint[] {
  return buckets.map((bucket, i) => {
    let max = 0;
    const isLast = i === buckets.length - 1;
    for (const sample of samples) {
      const t = sample.sampledAt.getTime();
      if (t >= bucket.start.getTime() && t < bucket.end.getTime() + (isLast ? 1 : 0)) {
        if (sample.count > max) max = sample.count;
      }
    }
    return { label: bucket.label, longLabel: bucket.longLabel, value: max };
  });
}

export function bucketCounts(
  bucketCount: number,
  start: Date,
  end: Date,
  timestamps: Date[],
): number[] {
  const startMs = start.getTime();
  const width = (end.getTime() - startMs) / bucketCount;
  const counts = Array.from({ length: bucketCount }, () => 0);
  for (const ts of timestamps) {
    const i = Math.floor((ts.getTime() - startMs) / width);
    if (i >= 0 && i < bucketCount) counts[i] = (counts[i] ?? 0) + 1;
  }
  return counts;
}

export function relativeTime(from: Date, now: Date): string {
  const diffMs = now.getTime() - from.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return dayFmt.format(from);
}
