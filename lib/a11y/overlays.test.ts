import { describe, expect, test } from 'vitest';

import { resolveBrickOverlays } from './overlays';

describe('resolveBrickOverlays', () => {
  test('no session force: follows personal preference, no toggle', () => {
    expect(
      resolveBrickOverlays({ sessionForced: false, personalPref: true, viewerToggle: false }),
    ).toEqual({ overlaysOn: true, showToggle: false });

    expect(
      resolveBrickOverlays({ sessionForced: false, personalPref: false, viewerToggle: true }),
    ).toEqual({ overlaysOn: false, showToggle: false });
  });

  test('session forced on: viewer toggle governs and the toggle is shown', () => {
    // Default (viewer has not opted out) → overlays on.
    expect(
      resolveBrickOverlays({ sessionForced: true, personalPref: false, viewerToggle: true }),
    ).toEqual({ overlaysOn: true, showToggle: true });

    // Viewer opted out → overlays off, but the toggle stays present so it's reversible.
    expect(
      resolveBrickOverlays({ sessionForced: true, personalPref: false, viewerToggle: false }),
    ).toEqual({ overlaysOn: false, showToggle: true });
  });

  test('session force ignores the personal preference when on', () => {
    // Personal pref off but viewer toggle on (the default) → still on under force.
    expect(
      resolveBrickOverlays({ sessionForced: true, personalPref: false, viewerToggle: true })
        .overlaysOn,
    ).toBe(true);
    // Personal pref on but viewer explicitly opted out → off.
    expect(
      resolveBrickOverlays({ sessionForced: true, personalPref: true, viewerToggle: false })
        .overlaysOn,
    ).toBe(false);
  });
});
