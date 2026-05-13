// Pure helpers for the /app/designs/trash route. No DB access.

export const TRASH_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDaysRemaining(
  deletedAt: string,
  retentionDays: number,
  now: Date,
): string {
  const purgeAt = new Date(deletedAt).getTime() + retentionDays * DAY_MS;
  const msRemaining = purgeAt - now.getTime();
  if (msRemaining <= 0) return 'Purging soon';
  const fullDays = Math.floor(msRemaining / DAY_MS);
  if (fullDays === 0) return 'Auto-deletes in <1 day';
  if (fullDays === 1) return 'Auto-deletes in 1 day';
  return `Auto-deletes in ${fullDays} days`;
}
