// lib/changelog/format.test.ts
import { describe, expect, test } from 'vitest';

import { formatChangelogDate, groupByMonth, isoDate } from './format';
import type { PublicChangelogEntry } from './types';

function entry(id: string, publishedAt: string): PublicChangelogEntry {
  return {
    id,
    title: `Entry ${id}`,
    bodyHtml: '<p>x</p>',
    category: 'feature',
    versionTag: null,
    publishedAt,
  };
}

describe('formatChangelogDate', () => {
  test('renders en-GB long date', () => {
    expect(formatChangelogDate('2026-06-04T12:00:00.000Z')).toBe('4 June 2026');
  });
  test('returns the input unchanged when unparseable', () => {
    expect(formatChangelogDate('not-a-date')).toBe('not-a-date');
  });
});

describe('isoDate', () => {
  test('returns yyyy-mm-dd', () => {
    expect(isoDate('2026-06-04T12:00:00.000Z')).toBe('2026-06-04');
  });
});

describe('groupByMonth', () => {
  test('groups entries under a "Month Year" label, months newest-first', () => {
    const groups = groupByMonth([
      entry('a', '2026-06-20T12:00:00.000Z'),
      entry('b', '2026-06-02T12:00:00.000Z'),
      entry('c', '2026-05-15T12:00:00.000Z'),
    ]);
    expect(groups.map((g) => g.monthLabel)).toEqual(['June 2026', 'May 2026']);
  });

  test('keeps entries newest-first within a month', () => {
    const groups = groupByMonth([
      entry('older', '2026-06-02T12:00:00.000Z'),
      entry('newer', '2026-06-20T12:00:00.000Z'),
    ]);
    expect(groups[0]!.entries.map((e) => e.id)).toEqual(['newer', 'older']);
  });

  test('returns [] for no entries', () => {
    expect(groupByMonth([])).toEqual([]);
  });
});
