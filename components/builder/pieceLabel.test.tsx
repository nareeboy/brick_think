import { describe, expect, test } from 'vitest';

import { pieceLabel } from './LayersPanel';
import type { BrickInstance } from './builderState';

function brick(overrides: Partial<BrickInstance> = {}): BrickInstance {
  return {
    id: 'aaaa-bbbb-2525',
    groupId: 'g1',
    code: 'C1',
    image: 'x.png',
    width: 80,
    height: 32,
    x: 0,
    y: 0,
    rotation: 0,
    visible: true,
    ...overrides,
  };
}

describe('pieceLabel', () => {
  test('uses the custom name alone when set', () => {
    expect(pieceLabel(brick({ name: 'Roof tile' }))).toBe('Roof tile');
  });

  test('falls back to the generated label when name is empty or whitespace', () => {
    expect(pieceLabel(brick({ name: '   ' }))).toBe('C1 · 2525');
  });

  test('generated label ends with the last 4 id chars', () => {
    expect(pieceLabel(brick())).toMatch(/· 2525$/);
  });
});
