import { describe, expect, test } from 'vitest';

import {
  bucketCounts,
  bucketMaxSeries,
  buildBuckets,
  deltaLabel,
  periodLabel,
  rangeStart,
  relativeTime,
} from './dashboardBuckets';

const NOW = new Date('2026-07-27T12:30:00Z');

describe('rangeStart', () => {
  test('subtracts the range span from now', () => {
    expect(rangeStart('24h', NOW).toISOString()).toBe('2026-07-26T12:30:00.000Z');
    expect(rangeStart('7d', NOW).toISOString()).toBe('2026-07-20T12:30:00.000Z');
    expect(rangeStart('30d', NOW).toISOString()).toBe('2026-06-27T12:30:00.000Z');
    expect(rangeStart('90d', NOW).toISOString()).toBe('2026-04-28T12:30:00.000Z');
  });
});

describe('labels', () => {
  test('period and delta copy per range', () => {
    expect(periodLabel('24h')).toBe('today');
    expect(periodLabel('7d')).toBe('last 7 days');
    expect(deltaLabel('30d')).toBe('vs previous 30 days');
    expect(deltaLabel('24h')).toBe('vs yesterday');
  });
});

describe('buildBuckets', () => {
  test('24h → 24 hourly buckets ending at now', () => {
    const buckets = buildBuckets('24h', NOW);
    expect(buckets).toHaveLength(24);
    expect(buckets[23]!.end.toISOString()).toBe(NOW.toISOString());
    expect(buckets[0]!.start.toISOString()).toBe('2026-07-26T12:30:00.000Z');
    // Labels are the UTC hour of the bucket start.
    expect(buckets[0]!.label).toBe('12:30');
  });

  test('short labels per range', () => {
    // NOW = 2026-07-27T12:30:00Z (Monday)
    const buckets24h = buildBuckets('24h', NOW);
    expect(buckets24h[0]!.label).toBe('12:30');

    const buckets7d = buildBuckets('7d', NOW);
    // 7 days ago from 2026-07-27 (Mon) is 2026-07-20 (Mon)
    expect(buckets7d[0]!.label).toBe('Mon');
    expect(buckets7d[6]!.label).toBe('Sun');

    const buckets30d = buildBuckets('30d', NOW);
    // 30 days ago from 2026-07-27 is 2026-06-27
    expect(buckets30d[0]!.label).toBe('27 Jun');
    expect(buckets30d[29]!.label).toMatch(/\d+ Jul/);

    const buckets90d = buildBuckets('90d', NOW);
    // 90 days ago from 2026-07-27 is 2026-04-28
    expect(buckets90d[0]!.label).toBe('28 Apr');
  });

  test('7d → 7 daily buckets, 30d → 30, 90d → 13 weekly', () => {
    expect(buildBuckets('7d', NOW)).toHaveLength(7);
    expect(buildBuckets('30d', NOW)).toHaveLength(30);
    expect(buildBuckets('90d', NOW)).toHaveLength(13);
  });

  test('daily buckets label with en-GB weekday/date', () => {
    const buckets = buildBuckets('7d', NOW);
    // First bucket starts 2026-07-20T12:30Z; its label is the day it mostly covers.
    expect(buckets[6]!.longLabel).toContain('Jul');
  });
});

describe('bucketMaxSeries', () => {
  test('takes the max sample per bucket and zero-fills empty buckets', () => {
    const buckets = buildBuckets('24h', NOW);
    const series = bucketMaxSeries(buckets, [
      { sampledAt: new Date('2026-07-26T13:00:00Z'), count: 5 },
      { sampledAt: new Date('2026-07-26T13:20:00Z'), count: 9 },
      { sampledAt: new Date('2026-07-27T12:00:00Z'), count: 4 },
    ]);
    expect(series).toHaveLength(24);
    expect(series[0]!.value).toBe(9); // both 13:00 and 13:20 fall in bucket 0 (12:30–13:30)
    expect(series[23]!.value).toBe(4);
    expect(series[5]!.value).toBe(0);
  });

  test('ignores samples outside the buckets', () => {
    const buckets = buildBuckets('24h', NOW);
    const series = bucketMaxSeries(buckets, [
      { sampledAt: new Date('2026-07-20T00:00:00Z'), count: 99 },
    ]);
    expect(Math.max(...series.map((p) => p.value))).toBe(0);
  });

  test('sample exactly on bucket boundary goes into the later bucket (half-open intervals)', () => {
    const buckets = buildBuckets('24h', NOW);
    // bucket[0] is [start, end), bucket[1] is [end, next_end)
    // Place a sample exactly at bucket[0].end, which should fall into bucket[1]
    const boundaryTime = buckets[0]!.end;
    const series = bucketMaxSeries(buckets, [{ sampledAt: boundaryTime, count: 42 }]);
    expect(series[0]!.value).toBe(0); // bucket 0 should not have the sample
    expect(series[1]!.value).toBe(42); // bucket 1 should have it
  });
});

describe('bucketCounts', () => {
  test('counts timestamps into N equal buckets', () => {
    const start = new Date('2026-07-20T12:00:00Z');
    const end = new Date('2026-07-27T12:00:00Z');
    const counts = bucketCounts(12, start, end, [
      new Date('2026-07-20T12:00:01Z'),
      new Date('2026-07-20T13:00:00Z'),
      new Date('2026-07-27T11:59:59Z'),
    ]);
    expect(counts).toHaveLength(12);
    expect(counts[0]).toBe(2);
    expect(counts[11]).toBe(1);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
  });
});

describe('relativeTime', () => {
  test('minutes, hours, yesterday, days, then date', () => {
    expect(relativeTime(new Date('2026-07-27T12:18:00Z'), NOW)).toBe('12 min ago');
    expect(relativeTime(new Date('2026-07-27T10:30:00Z'), NOW)).toBe('2 h ago');
    expect(relativeTime(new Date('2026-07-26T12:00:00Z'), NOW)).toBe('yesterday');
    expect(relativeTime(new Date('2026-07-24T12:00:00Z'), NOW)).toBe('3 days ago');
    expect(relativeTime(new Date('2026-06-01T12:00:00Z'), NOW)).toBe('1 Jun');
  });

  test('clamps future/just-now to "just now"', () => {
    expect(relativeTime(new Date('2026-07-27T12:29:59Z'), NOW)).toBe('just now');
  });
});
