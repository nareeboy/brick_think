import { describe, it, expect } from 'vitest';

import { CANONICAL_BRICKS } from './canonical';
import { KNOWN_BRICK_CODES, isKnownBrickCode } from './manifest';

describe('brick manifest', () => {
  it('contains every code from CANONICAL_BRICKS', () => {
    for (const b of CANONICAL_BRICKS) {
      expect(KNOWN_BRICK_CODES.has(b.code)).toBe(true);
    }
    expect(KNOWN_BRICK_CODES.size).toBe(CANONICAL_BRICKS.length);
  });

  it('isKnownBrickCode returns true for canonical entries and false otherwise', () => {
    expect(isKnownBrickCode(CANONICAL_BRICKS[0]!.code)).toBe(true);
    expect(isKnownBrickCode('not-a-real-brick')).toBe(false);
  });
});
