import type Konva from 'konva';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { CanvasState } from '@/lib/models/types';

const TRANSPARENT_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const toDataURL = vi.fn(() => TRANSPARENT_1X1);
const getClientRect = vi.fn(() => ({ x: 0, y: 0, width: 100, height: 50 }));

const fakeLayer = {
  toDataURL,
  add() {},
  destroy() {},
  draw() {},
  getChildren() {
    return [{ getClientRect }];
  },
};

const fakeStage = {
  getLayers() {
    return [fakeLayer];
  },
  destroy() {},
};

vi.mock('konva', () => ({
  default: {
    Stage: vi.fn(() => fakeStage),
    Layer: vi.fn(() => fakeLayer),
    Image: vi.fn(() => ({ getClientRect })),
  },
}));

beforeEach(() => {
  toDataURL.mockClear();
  getClientRect.mockClear();
});

const sampleState: CanvasState = {
  groups: [{ id: 'g1', name: 'Layer 1', collapsed: false, visible: true }],
  bricks: [
    {
      id: 'b1',
      groupId: 'g1',
      code: 'a',
      image: '/bricks/a.png',
      width: 180,
      height: 156,
      x: 200,
      y: 200,
      rotation: 0,
      visible: true,
    },
  ],
};

import { renderCanvasToPngBlob } from './png';

describe('renderCanvasToPngBlob — stage mode', () => {
  it('calls toDataURL with the padded bbox and returns image/png', async () => {
    const blob = await renderCanvasToPngBlob({
      canvasState: sampleState,
      stage: fakeStage as unknown as Konva.Stage,
      padding: 10,
      pixelRatio: 2,
    });
    expect(blob.type).toBe('image/png');
    expect(toDataURL).toHaveBeenCalledTimes(1);
    const firstCall = toDataURL.mock.calls[0];
    expect(firstCall).toBeDefined();
    const arg = (firstCall as unknown as [Record<string, number>])[0];
    expect(arg.x).toBe(-10);
    expect(arg.y).toBe(-10);
    expect(arg.width).toBe(120);
    expect(arg.height).toBe(70);
    expect(arg.pixelRatio).toBe(2);
  });
});

describe('renderCanvasToPngBlob — empty canvas', () => {
  it('returns a 1x1 transparent PNG without touching Konva', async () => {
    const blob = await renderCanvasToPngBlob({
      canvasState: { groups: [], bricks: [] },
    });
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
    expect(toDataURL).not.toHaveBeenCalled();
  });
});
