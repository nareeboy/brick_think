import { describe, it, expect } from 'vitest';

import { brickToCell, BRICK_UNIT } from './grid';

describe('BRICK_UNIT', () => {
  it('is 32', () => {
    expect(BRICK_UNIT).toBe(32);
  });
});

describe('brickToCell', () => {
  it('clamps (0, 0) to row 1, col 1', () => {
    expect(brickToCell({ x: 0, y: 0 })).toEqual({ row: 1, col: 1 });
  });

  it('maps (256, 160) to row 5, col 8', () => {
    expect(brickToCell({ x: 256, y: 160 })).toEqual({ row: 5, col: 8 });
  });

  it('clamps negative coords to row 1, col 1', () => {
    expect(brickToCell({ x: -100, y: -50 })).toEqual({ row: 1, col: 1 });
  });

  it('rounds to nearest integer cell', () => {
    // x=48, y=48: 48/32 = 1.5 → rounds to 2
    expect(brickToCell({ x: 48, y: 48 })).toEqual({ row: 2, col: 2 });
  });

  it('handles exactly one BRICK_UNIT', () => {
    expect(brickToCell({ x: BRICK_UNIT, y: BRICK_UNIT })).toEqual({ row: 1, col: 1 });
  });
});
