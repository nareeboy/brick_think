import { describe, it, expect } from 'vitest';

import { extractColorFromCode, nextColorVariant } from './color-from-code';

describe('extractColorFromCode', () => {
  it('extracts red from block-red-medium-left', () => {
    expect(extractColorFromCode('block-red-medium-left')).toBe('red');
  });

  it('returns empty string for window-arched-1x2 (no colour token)', () => {
    expect(extractColorFromCode('window-arched-1x2')).toBe('');
  });

  it('returns empty string for connector-bracket (no colour token)', () => {
    expect(extractColorFromCode('connector-bracket')).toBe('');
  });

  it('extracts green from block-green-medium-right', () => {
    expect(extractColorFromCode('block-green-medium-right')).toBe('green');
  });

  it('extracts navy from block-navy-medium-left', () => {
    expect(extractColorFromCode('block-navy-medium-left')).toBe('navy');
  });

  it('returns empty string for an empty string', () => {
    expect(extractColorFromCode('')).toBe('');
  });

  it('extracts color when code ends with colour token', () => {
    expect(extractColorFromCode('something-red')).toBe('red');
  });

  it('extracts color when code starts with colour token', () => {
    expect(extractColorFromCode('red-brick')).toBe('red');
  });
});

describe('nextColorVariant', () => {
  it('returns a different block-*-medium-left variant for block-red-medium-left', () => {
    const next = nextColorVariant('block-red-medium-left');
    expect(next).not.toBeNull();
    expect(next).toMatch(/^block-[a-z]+-medium-left$/);
    expect(next).not.toBe('block-red-medium-left');
  });

  it('cycling all variants of block-red-medium-left eventually returns to itself', () => {
    let code = 'block-red-medium-left';
    const seen = new Set<string>();
    seen.add(code);
    // There are a finite number of variants; cycle until we wrap back to start.
    for (let i = 0; i < 20; i++) {
      const next = nextColorVariant(code);
      if (next === null) break;
      if (next === 'block-red-medium-left') return; // wrapped back — test passes
      seen.add(next);
      code = next;
    }
    // If we exit the loop without returning, we never cycled back.
    expect.fail('cycling did not return to the original brick-red-medium-left');
  });

  it('returns null for connector-bracket (no colour token)', () => {
    expect(nextColorVariant('connector-bracket')).toBeNull();
  });

  it('returns null for window-arched-1x2 (no colour token)', () => {
    expect(nextColorVariant('window-arched-1x2')).toBeNull();
  });

  it('does not confuse block-*-medium-left with blockarch-*-medium-left skeletons', () => {
    const next = nextColorVariant('block-red-medium-left');
    expect(next).not.toMatch(/^blockarch-/);
  });
});
