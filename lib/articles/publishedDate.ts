// Pure helpers for the CMS "edit published date" feature. Kept out of the
// 'use server' actions module so they can be plain (non-async) exports and
// unit-tested without a database.

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

// `value` is the raw `<input type="date">` string. Empty means "leave the
// stored date as-is" and is therefore valid. A non-empty value must be a
// strict YYYY-MM-DD that round-trips to a real calendar day (rejects e.g.
// 2026-02-30).
export function isValidPublishedDateInput(value: string): boolean {
  if (value.length === 0) return true;
  if (!YYYY_MM_DD.test(value)) return false;
  // Regex guarantees three all-digit segments, so Number() never yields NaN here.
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Store at noon UTC: the public render is date-only (en-GB) and the UK is
// GMT/BST, so noon guarantees the displayed calendar day never shifts across
// viewer timezones, and `published_at DESC` ordering stays stable.
export function publishedDateToInstant(value: string): string {
  return `${value}T12:00:00.000Z`;
}
