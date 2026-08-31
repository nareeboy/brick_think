import { describe, expect, it } from 'vitest';

import { BRICK_EDGE_ANGLE_DEG, ISO_LATTICE_BACKGROUND_IMAGE } from './canvasGeometry';

describe('ISO_LATTICE_BACKGROUND_IMAGE', () => {
  const angles = [
    ...ISO_LATTICE_BACKGROUND_IMAGE.matchAll(/repeating-linear-gradient\((-?[\d.]+)deg/g),
  ].map((m) => Number(m[1]));

  it('is a mirrored pair of line gradients', () => {
    expect(angles).toHaveLength(2);
    // Supplementary CSS gradient angles produce mirror-image stripe
    // directions, so the lattice stays symmetric around the vertical axis.
    expect((angles[0] ?? 0) + (angles[1] ?? 0)).toBeCloseTo(180, 5);
  });

  it('matches the edge angle of the brick artwork', () => {
    // The brick PNGs (public/bricks/*.png) are rendered with their top/bottom
    // face edges rising at ~23.1° from horizontal, and BrickNode draws them at
    // an aspect-preserving width/height. A lattice at any other angle visibly
    // shears against every placed brick.
    expect(angles[0]).toBeCloseTo(BRICK_EDGE_ANGLE_DEG, 5);
    expect(BRICK_EDGE_ANGLE_DEG).toBeCloseTo(23.1, 5);
  });
});
