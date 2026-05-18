import type { BrickInstance } from '@/components/builder/builderState';

// Logical grid unit for AT row/col computation. NOT the same as Konva's
// stage units — this is a heuristic resolution for screen-reader navigation,
// designed so a typical "medium" brick spans ~5 logical cells.
export const BRICK_UNIT = 32;

export function brickToCell(b: Pick<BrickInstance, 'x' | 'y'>): { row: number; col: number } {
  return {
    row: Math.max(1, Math.round(b.y / BRICK_UNIT)),
    col: Math.max(1, Math.round(b.x / BRICK_UNIT)),
  };
}
