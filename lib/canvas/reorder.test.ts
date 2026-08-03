import { describe, expect, test } from 'vitest';

import { reorderBricksWithinGroups } from './reorder';

import type { BrickInstance } from '@/components/builder/builderState';

function brick(id: string, groupId = 'g1'): BrickInstance {
  return {
    id,
    groupId,
    code: 'C1',
    image: 'brick-1.png',
    width: 80,
    height: 32,
    x: 0,
    y: 0,
    rotation: 0,
    visible: true,
  };
}

function order(result: BrickInstance[] | null): string[] | null {
  return result ? result.map((b) => b.id) : null;
}

describe('reorderBricksWithinGroups', () => {
  // Array is z-order: index 0 = front-most (top of Layers panel).
  const abc = [brick('a'), brick('b'), brick('c')];

  test('forward moves a brick one step toward the front', () => {
    expect(order(reorderBricksWithinGroups(abc, ['b'], 'forward'))).toEqual(['b', 'a', 'c']);
  });

  test('backward moves a brick one step toward the back', () => {
    expect(order(reorderBricksWithinGroups(abc, ['b'], 'backward'))).toEqual(['a', 'c', 'b']);
  });

  test('front moves a brick to the top of its group', () => {
    expect(order(reorderBricksWithinGroups(abc, ['c'], 'front'))).toEqual(['c', 'a', 'b']);
  });

  test('back moves a brick to the bottom of its group', () => {
    expect(order(reorderBricksWithinGroups(abc, ['a'], 'back'))).toEqual(['b', 'c', 'a']);
  });

  test('front-most brick cannot move further forward → null', () => {
    expect(reorderBricksWithinGroups(abc, ['a'], 'forward')).toBeNull();
    expect(reorderBricksWithinGroups(abc, ['a'], 'front')).toBeNull();
  });

  test('back-most brick cannot move further back → null', () => {
    expect(reorderBricksWithinGroups(abc, ['c'], 'backward')).toBeNull();
    expect(reorderBricksWithinGroups(abc, ['c'], 'back')).toBeNull();
  });

  test('empty selection → null', () => {
    expect(reorderBricksWithinGroups(abc, [], 'forward')).toBeNull();
  });

  test('multi-selection keeps relative order and does not leapfrog itself', () => {
    const abcd = [brick('a'), brick('b'), brick('c'), brick('d')];
    expect(order(reorderBricksWithinGroups(abcd, ['b', 'c'], 'forward'))).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
    expect(order(reorderBricksWithinGroups(abcd, ['b', 'c'], 'backward'))).toEqual([
      'a',
      'd',
      'b',
      'c',
    ]);
    expect(order(reorderBricksWithinGroups(abcd, ['a', 'c'], 'back'))).toEqual([
      'b',
      'd',
      'a',
      'c',
    ]);
    expect(order(reorderBricksWithinGroups(abcd, ['b', 'd'], 'front'))).toEqual([
      'b',
      'd',
      'a',
      'c',
    ]);
  });

  test('a selected block already at the front stays put on forward', () => {
    const abcd = [brick('a'), brick('b'), brick('c'), brick('d')];
    expect(reorderBricksWithinGroups(abcd, ['a', 'b'], 'forward')).toBeNull();
  });

  test('reorder never crosses a group boundary', () => {
    const mixed = [brick('a', 'g1'), brick('b', 'g1'), brick('c', 'g2'), brick('d', 'g2')];
    // b is at the back of g1's run; forward within g1 only.
    expect(order(reorderBricksWithinGroups(mixed, ['b'], 'back'))).toBeNull();
    expect(order(reorderBricksWithinGroups(mixed, ['c'], 'forward'))).toBeNull();
    expect(order(reorderBricksWithinGroups(mixed, ['b'], 'forward'))).toEqual(['b', 'a', 'c', 'd']);
  });

  test('selection spanning two groups reorders each within its own run', () => {
    const mixed = [brick('a', 'g1'), brick('b', 'g1'), brick('c', 'g2'), brick('d', 'g2')];
    expect(order(reorderBricksWithinGroups(mixed, ['b', 'd'], 'front'))).toEqual([
      'b',
      'a',
      'd',
      'c',
    ]);
  });

  test('does not mutate the input array', () => {
    const input = [brick('a'), brick('b')];
    const snapshot = [...input];
    reorderBricksWithinGroups(input, ['b'], 'forward');
    expect(input).toEqual(snapshot);
  });
});
