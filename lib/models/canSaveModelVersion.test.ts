import { describe, expect, it } from 'vitest';

import { canSaveModelVersion } from './canSaveModelVersion';

describe('canSaveModelVersion', () => {
  it('allows version saving on a personal design (not in a session)', () => {
    expect(canSaveModelVersion({ inSession: false })).toBe(true);
  });

  it('hides version saving on any session canvas (individual, skill-building, or room-backed)', () => {
    expect(canSaveModelVersion({ inSession: true })).toBe(false);
  });
});
