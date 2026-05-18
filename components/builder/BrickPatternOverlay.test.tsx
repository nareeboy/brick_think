import { describe, it, expect, vi } from 'vitest';

// react-konva uses ESM-only konva under the hood which can't be required in
// the vitest node environment. Stub the module so importing BrickPatternOverlay
// doesn't blow up; the pattern-generator helpers we actually test never touch
// the Konva runtime.
vi.mock('react-konva', () => ({
  Circle: () => null,
  Group: () => null,
  Line: () => null,
  Rect: () => null,
}));

import { __testing } from './BrickPatternOverlay';

const { horizontalLines, verticalLines, dots, checker } = __testing;

describe('BrickPatternOverlay pattern generators', () => {
  it('horizontalLines emits the expected number of lines for a 64px-tall brick', () => {
    // SPACING=8, y starts at 4, steps 4,12,20,28,36,44,52,60 → 8 lines
    expect(horizontalLines(180, 64)).toHaveLength(8);
  });

  it('verticalLines emits the expected number for a 180px-wide brick', () => {
    // SPACING=8, x starts at 4, steps 4,12,...,172 → 22 lines
    expect(verticalLines(180, 64)).toHaveLength(22);
  });

  it('dots emits a 2D grid of elements', () => {
    expect(dots(64, 64).length).toBeGreaterThan(0);
  });

  it('checker emits alternating cells', () => {
    expect(checker(64, 64).length).toBeGreaterThan(0);
  });

  it('horizontalLines returns empty array when height is zero', () => {
    expect(horizontalLines(180, 0)).toHaveLength(0);
  });
});
