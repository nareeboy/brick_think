import { describe, expect, it } from 'vitest';

import { isValidFontChoice, isValidFooter, isValidHexColour, isValidName } from './validate';

describe('branding validators', () => {
  it('isValidHexColour', () => {
    expect(isValidHexColour('#1d4ed8')).toBe(true);
    expect(isValidHexColour('#FFF')).toBe(false);
    expect(isValidHexColour('blue')).toBe(false);
    expect(isValidHexColour(123)).toBe(false);
  });

  it('isValidName', () => {
    expect(isValidName('Acme')).toBe(true);
    expect(isValidName('   ')).toBe(false);
    expect(isValidName('x'.repeat(81))).toBe(false);
  });

  it('isValidFooter', () => {
    expect(isValidFooter(null)).toBe(true);
    expect(isValidFooter('')).toBe(true);
    expect(isValidFooter('hello@acme.com')).toBe(true);
    expect(isValidFooter('x'.repeat(161))).toBe(false);
  });

  it('isValidFontChoice', () => {
    expect(isValidFontChoice({ kind: 'curated', key: 'geist' })).toBe(true);
    expect(isValidFontChoice({ kind: 'curated', key: 'nope' })).toBe(false);
    expect(isValidFontChoice({ kind: 'custom', path: 'u/p/heading.ttf' })).toBe(true);
    expect(isValidFontChoice({ kind: 'custom', path: '' })).toBe(false);
    expect(isValidFontChoice({ kind: 'other' })).toBe(false);
  });
});
