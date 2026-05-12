import { describe, expect, it } from 'vitest';

import { parseCanvasState, serializeCanvasState } from './canvasState';
import { EMPTY_CANVAS_STATE } from './types';

describe('parseCanvasState', () => {
  it('returns empty state for null/undefined/empty inputs', () => {
    expect(parseCanvasState(null)).toEqual(EMPTY_CANVAS_STATE);
    expect(parseCanvasState(undefined)).toEqual(EMPTY_CANVAS_STATE);
    expect(parseCanvasState({})).toEqual(EMPTY_CANVAS_STATE);
  });

  it('passes through a valid state', () => {
    const valid = {
      groups: [{ id: 'g1', name: 'A', collapsed: false, visible: true }],
      bricks: [
        {
          id: 'b1',
          groupId: 'g1',
          code: 'X',
          image: '',
          width: 50,
          height: 50,
          x: 0,
          y: 0,
          rotation: 0,
          visible: true,
        },
      ],
    };
    expect(parseCanvasState(valid)).toEqual(valid);
  });

  it('drops bricks whose groupId is unknown', () => {
    const input = {
      groups: [{ id: 'g1', name: 'A', collapsed: false, visible: true }],
      bricks: [
        {
          id: 'b1', groupId: 'ghost', code: 'X', image: '',
          width: 50, height: 50, x: 0, y: 0, rotation: 0, visible: true,
        },
      ],
    };
    expect(parseCanvasState(input).bricks).toEqual([]);
  });

  it('falls back to empty state when groups field is malformed', () => {
    expect(parseCanvasState({ groups: 'not-an-array', bricks: [] }))
      .toEqual(EMPTY_CANVAS_STATE);
  });

  it('returns a distinct empty object per invalid call (no shared sentinel)', () => {
    const a = parseCanvasState({ groups: 'bad', bricks: [] });
    const b = parseCanvasState({ groups: 'bad', bricks: [] });
    expect(a).not.toBe(b);
    expect(a.groups).not.toBe(b.groups);
  });
});

describe('serializeCanvasState', () => {
  it('returns a fresh object whose arrays are independent of the input', () => {
    const original = {
      groups: [{ id: 'g1', name: 'A', collapsed: false, visible: true }],
      bricks: [
        {
          id: 'b1', groupId: 'g1', code: 'X', image: '',
          width: 50, height: 50, x: 0, y: 0, rotation: 0, visible: true,
        },
      ],
    };
    const cloned = serializeCanvasState(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.groups).not.toBe(original.groups);
    expect(cloned.bricks).not.toBe(original.bricks);
    expect(cloned.groups[0]).not.toBe(original.groups[0]);
    expect(cloned.bricks[0]).not.toBe(original.bricks[0]);
  });
});
