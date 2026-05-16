import { describe, expect, it } from 'vitest';

import { PRESENCE_PALETTE, colorForUser } from './presence-colors';

describe('PRESENCE_PALETTE', () => {
  it('has exactly 12 distinct hex colors', () => {
    expect(PRESENCE_PALETTE).toHaveLength(12);
    expect(new Set(PRESENCE_PALETTE).size).toBe(12);
    for (const c of PRESENCE_PALETTE) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('colorForUser', () => {
  it('is deterministic for the same input', () => {
    expect(colorForUser('user-abc')).toBe(colorForUser('user-abc'));
  });

  it('always returns a color from PRESENCE_PALETTE', () => {
    for (let i = 0; i < 100; i++) {
      expect(PRESENCE_PALETTE).toContain(colorForUser(`u${i}`));
    }
  });

  it('reaches every palette entry given enough inputs', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      seen.add(colorForUser(`u${i}`));
    }
    expect(seen.size).toBe(PRESENCE_PALETTE.length);
  });

  it('produces different colors for different ids (sample check)', () => {
    expect(colorForUser('u1')).not.toBe(colorForUser('u2'));
  });
});
