import { describe, it, expect } from 'vitest';
import { ttlToExpiresAt } from './ttl';

describe('ttlToExpiresAt', () => {
  const now = new Date('2026-05-13T00:00:00Z');

  it.each([
    ['1d', '2026-05-14T00:00:00.000Z'],
    ['7d', '2026-05-20T00:00:00.000Z'],
    ['30d', '2026-06-12T00:00:00.000Z'],
  ] as const)('maps %s to a future ISO timestamp', (ttl, expected) => {
    const result = ttlToExpiresAt(ttl, now);
    expect(result?.toISOString()).toBe(expected);
  });

  it('returns null for "never"', () => {
    expect(ttlToExpiresAt('never', now)).toBeNull();
  });
});
