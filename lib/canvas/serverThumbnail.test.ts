import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import {
  memoiseBrickImageResolver,
  renderCanvasThumbnailPng,
  THUMBNAIL_MAX_HEIGHT,
  THUMBNAIL_MAX_WIDTH,
} from './serverThumbnail';
import type { CanvasState } from '@/lib/models/types';

function canvasWith(brickCount: number): CanvasState {
  const groupId = 'group-1';
  return {
    groups: [{ id: groupId, name: 'Model', collapsed: false, visible: true }],
    bricks: Array.from({ length: brickCount }, (_, i) => {
      const def = CANONICAL_BRICKS[i % CANONICAL_BRICKS.length]!;
      return {
        id: `brick-${i}`,
        groupId,
        code: def.code,
        name: def.name,
        image: def.image,
        width: def.width,
        height: def.height,
        x: 120 + (i % 3) * 210,
        y: 120 + Math.floor(i / 3) * 190,
        rotation: 0,
        visible: true,
      };
    }),
  };
}

describe('renderCanvasThumbnailPng', () => {
  it('rasterises a brick canvas to a PNG that fits the design-card box', async () => {
    const png = await renderCanvasThumbnailPng({ canvasState: canvasWith(6) });
    expect(png).not.toBeNull();

    const meta = await sharp(png!).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBeLessThanOrEqual(THUMBNAIL_MAX_WIDTH);
    expect(meta.height).toBeLessThanOrEqual(THUMBNAIL_MAX_HEIGHT);
    // A real render, not a blank tile.
    expect(png!.byteLength).toBeGreaterThan(1_000);
  }, 30_000);

  it('returns null for a canvas with no bricks', async () => {
    const png = await renderCanvasThumbnailPng({
      canvasState: { groups: [], bricks: [] },
    });
    expect(png).toBeNull();
  });

  it('returns null when every brick is hidden', async () => {
    const canvas = canvasWith(3);
    canvas.bricks = canvas.bricks.map((b) => ({ ...b, visible: false }));
    const png = await renderCanvasThumbnailPng({ canvasState: canvas });
    expect(png).toBeNull();
  });

  it('reuses a shared resolver across canvases so brick files are read once', async () => {
    const reads: string[] = [];
    const resolveBrickImage = async (p: string): Promise<string> => {
      reads.push(p);
      // 1x1 transparent PNG.
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    };
    const memo = memoiseBrickImageResolver(resolveBrickImage);
    await renderCanvasThumbnailPng({ canvasState: canvasWith(3), resolveBrickImage: memo });
    await renderCanvasThumbnailPng({ canvasState: canvasWith(3), resolveBrickImage: memo });
    expect(reads).toHaveLength(3);
  }, 30_000);
});
