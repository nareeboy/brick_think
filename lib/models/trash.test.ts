import { describe, expect, it } from 'vitest';

import { TRASH_RETENTION_DAYS, formatDaysRemaining } from './trash';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(now: Date, days: number): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

describe('formatDaysRemaining', () => {
  const now = new Date('2026-05-13T12:00:00Z');

  it('shows the full retention window for a freshly trashed item', () => {
    const label = formatDaysRemaining(daysAgo(now, 0), TRASH_RETENTION_DAYS, now);
    expect(label).toBe(`Auto-deletes in ${TRASH_RETENTION_DAYS} days`);
  });

  it('counts down by full days', () => {
    expect(formatDaysRemaining(daysAgo(now, 7), TRASH_RETENTION_DAYS, now)).toBe(
      'Auto-deletes in 23 days',
    );
    expect(formatDaysRemaining(daysAgo(now, 29), TRASH_RETENTION_DAYS, now)).toBe(
      'Auto-deletes in 1 day',
    );
  });

  it('shows "<1 day" once less than a full day remains', () => {
    expect(formatDaysRemaining(daysAgo(now, 29.5), TRASH_RETENTION_DAYS, now)).toBe(
      'Auto-deletes in <1 day',
    );
  });

  it('reports "Purging soon" once the window has elapsed', () => {
    expect(formatDaysRemaining(daysAgo(now, 30), TRASH_RETENTION_DAYS, now)).toBe('Purging soon');
    expect(formatDaysRemaining(daysAgo(now, 45), TRASH_RETENTION_DAYS, now)).toBe('Purging soon');
  });

  it('exposes the retention constant', () => {
    expect(TRASH_RETENTION_DAYS).toBe(30);
  });
});
