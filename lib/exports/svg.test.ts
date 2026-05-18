import { describe, it, expect, vi } from 'vitest';

import type { CanvasState } from '@/lib/models/types';

import { renderCanvasToSvgBlob } from './svg';

const stateWithRepeats: CanvasState = {
  groups: [{ id: 'g1', name: 'Layer 1', collapsed: false, visible: true }],
  bricks: [
    {
      id: 'b1',
      groupId: 'g1',
      code: 'a',
      image: '/bricks/a.png',
      width: 100,
      height: 100,
      x: 100,
      y: 100,
      rotation: 0,
      visible: true,
    },
    {
      id: 'b2',
      groupId: 'g1',
      code: 'a',
      image: '/bricks/a.png',
      width: 100,
      height: 100,
      x: 250,
      y: 100,
      rotation: 90,
      visible: true,
    },
    {
      id: 'b3',
      groupId: 'g1',
      code: 'b',
      image: '/bricks/b.png',
      width: 100,
      height: 100,
      x: 400,
      y: 100,
      rotation: 0,
      visible: false,
    },
  ],
};

const DATA_URI_A = 'data:image/png;base64,AAA';
const DATA_URI_B = 'data:image/png;base64,BBB';

function makeResolver() {
  return vi.fn(async (path: string) => {
    if (path === '/bricks/a.png') return DATA_URI_A;
    if (path === '/bricks/b.png') return DATA_URI_B;
    throw new Error(`unexpected ${path}`);
  });
}

describe('renderCanvasToSvgBlob', () => {
  it('produces an image/svg+xml blob', async () => {
    const blob = await renderCanvasToSvgBlob({
      canvasState: stateWithRepeats,
      title: 'My design',
      resolveBrickImage: makeResolver(),
    });
    expect(blob.type).toBe('image/svg+xml');
  });

  it('skips invisible bricks', async () => {
    const blob = await renderCanvasToSvgBlob({
      canvasState: stateWithRepeats,
      title: 'x',
      resolveBrickImage: makeResolver(),
    });
    const text = await blob.text();
    expect(text).toContain('id="b1"');
    expect(text).toContain('id="b2"');
    expect(text).not.toContain('id="b3"');
  });

  it('skips bricks in hidden groups', async () => {
    const hidden: CanvasState = {
      groups: [{ id: 'g1', name: 'Layer 1', collapsed: false, visible: false }],
      bricks: [stateWithRepeats.bricks[0]!],
    };
    const blob = await renderCanvasToSvgBlob({
      canvasState: hidden,
      title: 'x',
      resolveBrickImage: makeResolver(),
    });
    const text = await blob.text();
    expect(text).not.toContain('id="b1"');
  });

  it('dedupes brick images', async () => {
    const resolver = makeResolver();
    await renderCanvasToSvgBlob({
      canvasState: stateWithRepeats,
      title: 'x',
      resolveBrickImage: resolver,
    });
    // Three bricks share image "a", one image "b" (and the latter is hidden,
    // so the visible set is 2x "a"). The resolver still runs once per
    // distinct *visible* image path.
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(resolver).toHaveBeenCalledWith('/bricks/a.png');
  });

  it('escapes the title element', async () => {
    const blob = await renderCanvasToSvgBlob({
      canvasState: stateWithRepeats,
      title: 'My design <unsafe>',
      resolveBrickImage: makeResolver(),
    });
    const text = await blob.text();
    expect(text).toContain('<title>My design &lt;unsafe&gt;</title>');
  });

  it('positions bricks centred on (x, y) with rotation around the centre', async () => {
    const blob = await renderCanvasToSvgBlob({
      canvasState: {
        groups: stateWithRepeats.groups,
        bricks: [{ ...stateWithRepeats.bricks[0]!, x: 200, y: 200, rotation: 45 }],
      },
      title: 'x',
      resolveBrickImage: makeResolver(),
    });
    const text = await blob.text();
    // top-left = (x - w/2, y - h/2) = (150, 150); rotation centre = (200, 200).
    expect(text).toMatch(/x="150"/);
    expect(text).toMatch(/y="150"/);
    expect(text).toMatch(/transform="rotate\(45 200 200\)"/);
  });

  it('emits an empty-ish svg with default viewBox when nothing is visible', async () => {
    const blob = await renderCanvasToSvgBlob({
      canvasState: { groups: [], bricks: [] },
      title: 'empty',
      resolveBrickImage: makeResolver(),
    });
    const text = await blob.text();
    expect(text).toContain('<svg');
    expect(text).toContain('viewBox="0 0 100 100"');
    expect(text).not.toContain('<image');
  });
});
