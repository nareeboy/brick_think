import { describe, expect, it } from 'vitest';

import { fitToBox, padBbox, unionRects } from './thumbnailBox';

describe('unionRects', () => {
  it('returns the single rect when given one', () => {
    const r = { x: 10, y: 20, width: 30, height: 40 };
    expect(unionRects([r])).toEqual(r);
  });

  it('takes the axis-aligned union of multiple rects', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 20, y: 5, width: 5, height: 30 };
    expect(unionRects([a, b])).toEqual({ x: 0, y: 0, width: 25, height: 35 });
  });

  it('throws on empty input — callers must guard for empty canvases', () => {
    expect(() => unionRects([])).toThrow();
  });

  it('handles a negative-origin rect in the union', () => {
    const a = { x: -10, y: -5, width: 30, height: 20 };
    const b = { x: 20, y: 5, width: 5, height: 30 };
    expect(unionRects([a, b])).toEqual({ x: -10, y: -5, width: 35, height: 40 });
  });
});

describe('padBbox', () => {
  it('expands by ratio on all sides', () => {
    const r = { x: 0, y: 0, width: 100, height: 50 };
    // 8% padding: 8 on the width axis (so 4 each side); 4 on the height axis (so 2 each side)
    expect(padBbox(r, 0.08)).toEqual({ x: -4, y: -2, width: 108, height: 54 });
  });

  it('preserves non-zero origin', () => {
    const r = { x: 10, y: 20, width: 100, height: 50 };
    expect(padBbox(r, 0.08)).toEqual({ x: 6, y: 18, width: 108, height: 54 });
  });
});

describe('fitToBox', () => {
  it('scales down a wide rect to fit by width', () => {
    const r = { x: 0, y: 0, width: 800, height: 200 };
    const out = fitToBox(r, 400, 300);
    expect(out.scale).toBeCloseTo(0.5);
    expect(out.width).toBe(400);
    expect(out.height).toBe(100);
  });

  it('scales down a tall rect to fit by height', () => {
    const r = { x: 0, y: 0, width: 100, height: 900 };
    const out = fitToBox(r, 400, 300);
    expect(out.scale).toBeCloseTo(300 / 900);
    expect(out.width).toBeCloseTo(100 * (300 / 900));
    expect(out.height).toBe(300);
  });

  it('does not upscale: scale is clamped at 1', () => {
    const r = { x: 0, y: 0, width: 50, height: 50 };
    const out = fitToBox(r, 400, 300);
    expect(out.scale).toBe(1);
    expect(out.width).toBe(50);
    expect(out.height).toBe(50);
  });
});
