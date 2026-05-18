import { describe, expect, it } from 'vitest';
import { normaliseA11yPreferences, A11Y_PREFERENCES_DEFAULTS } from './preferences';

describe('normaliseA11yPreferences', () => {
  it('returns defaults when given null', () => {
    expect(normaliseA11yPreferences(null)).toEqual({ ...A11Y_PREFERENCES_DEFAULTS });
  });

  it('returns defaults when given an empty object', () => {
    expect(normaliseA11yPreferences({})).toEqual({ ...A11Y_PREFERENCES_DEFAULTS });
  });

  it('preserves colourblindMode: true when explicitly set', () => {
    expect(normaliseA11yPreferences({ colourblindMode: true })).toEqual({
      colourblindMode: true,
    });
  });

  it('falls back to default when colourblindMode is a non-boolean (string)', () => {
    expect(normaliseA11yPreferences({ colourblindMode: 'yes' })).toEqual({
      ...A11Y_PREFERENCES_DEFAULTS,
    });
  });

  it('returns defaults when given a non-object primitive (string)', () => {
    expect(normaliseA11yPreferences('garbage')).toEqual({ ...A11Y_PREFERENCES_DEFAULTS });
  });
});
