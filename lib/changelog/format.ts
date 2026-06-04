// lib/changelog/format.ts
import type { ChangelogMonthGroup, PublicChangelogEntry } from './types';

export function formatChangelogDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ISO 8601 (yyyy-mm-dd) for <time> dateTime attributes.
export function isoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Use UTC parts so the bucket label matches the noon-UTC stored instant
  // regardless of server timezone.
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

function monthKey(iso: string): string {
  // yyyy-mm sort key (UTC) — lexicographically sortable, newest-first via reverse.
  return isoDate(iso).slice(0, 7);
}

// Groups published entries into "Month Year" buckets. Months are ordered
// newest-first; entries within each month are sorted newest-first by
// publishedAt (so grouping is order-independent of the input).
export function groupByMonth(entries: PublicChangelogEntry[]): ChangelogMonthGroup[] {
  const buckets = new Map<string, ChangelogMonthGroup>();
  for (const e of entries) {
    const key = monthKey(e.publishedAt);
    let group = buckets.get(key);
    if (!group) {
      group = { monthLabel: monthLabel(e.publishedAt), entries: [] };
      buckets.set(key, group);
    }
    group.entries.push(e);
  }
  for (const group of buckets.values()) {
    group.entries.sort((a, b) =>
      a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0,
    );
  }
  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([, group]) => group);
}
