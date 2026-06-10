import { describe, expect, it } from 'vitest';

import { CURATED_FONT_KEYS, curatedFontByKey } from './curatedFonts';

describe('curated fonts', () => {
  it('exposes the expected keys', () => {
    expect(CURATED_FONT_KEYS).toContain('fraunces');
    expect(CURATED_FONT_KEYS).toContain('geist');
  });

  it('looks up by key', () => {
    expect(curatedFontByKey('geist')?.family).toBe('Geist');
    expect(curatedFontByKey('nope')).toBeNull();
  });
});
