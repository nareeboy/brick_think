import { describe, it, expect } from 'vitest';

import { patternForColor } from './patterns';

// KNOWN_COLORS sourced from color-from-code.ts — kept in sync manually here
// so that drift is caught by the cross-check test below.
const KNOWN_COLORS = [
  'red',
  'green',
  'navy',
  'blue',
  'yellow',
  'pink',
  'grey',
  'white',
  'black',
  'orange',
  'brown',
];

describe('patternForColor', () => {
  it('returns diagonal-up for red', () => {
    expect(patternForColor('red')).toBe('diagonal-up');
  });

  it('returns cross-hatch for green', () => {
    expect(patternForColor('green')).toBe('cross-hatch');
  });

  it('returns solid for empty string', () => {
    expect(patternForColor('')).toBe('solid');
  });

  it('returns solid for an unknown colour token', () => {
    expect(patternForColor('puce')).toBe('solid');
  });

  it('every known colour token has a non-solid mapping in COLOR_PATTERN', () => {
    for (const color of KNOWN_COLORS) {
      const pattern = patternForColor(color);
      expect(
        pattern,
        `colour '${color}' falls back to solid — add it to COLOR_PATTERN in patterns.ts`,
      ).not.toBe('solid');
    }
  });
});
