import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  CURATED_FONTS,
  CURATED_FONT_KEYS,
  curatedFontByKey,
  curatedFontFilePath,
} from './curatedFonts';

describe('curated fonts', () => {
  it('exposes the expected keys', () => {
    expect(CURATED_FONT_KEYS).toContain('fraunces');
    expect(CURATED_FONT_KEYS).toContain('geist');
  });

  it('looks up by key', () => {
    expect(curatedFontByKey('geist')?.family).toBe('Geist');
    expect(curatedFontByKey('nope')).toBeNull();
  });

  it('references font files that exist on disk', () => {
    for (const font of CURATED_FONTS) {
      for (const file of font.files) {
        expect(existsSync(curatedFontFilePath(file.rel)), file.rel).toBe(true);
      }
    }
  });
});
