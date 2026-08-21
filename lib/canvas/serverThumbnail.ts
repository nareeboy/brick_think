// Server-side design-card thumbnail rendering.
//
// The normal thumbnail path is client-side: BuilderCanvas rasterises the live
// Konva layer and POSTs it to /api/models/[id]/thumbnail (see
// components/builder/useThumbnailCapture.ts). Canvases that are written
// straight to the database and never opened in the builder — the example
// workshop seeder — therefore have no thumbnail at all, and every card falls
// back to the empty dot-grid placeholder. This module closes that gap by
// rasterising a CanvasState without a browser: SVG export → sharp.
//
// Output is matched to the client capture so cards look the same either way:
// a transparent PNG that fits inside the same 400x300 box.
//
// Deliberately no `import 'server-only'`: node:fs + sharp already make this
// unbundlable for the browser, and the backfill script runs it under plain
// tsx, where the Next-provided `server-only` module doesn't resolve.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { renderCanvasToSvgBlob } from '@/lib/exports/svg';
import type { CanvasState } from '@/lib/models/types';

/** Matches the fitToBox() bounds BuilderCanvas uses for its own capture. */
export const THUMBNAIL_MAX_WIDTH = 400;
export const THUMBNAIL_MAX_HEIGHT = 300;

export type BrickImageResolver = (imagePath: string) => Promise<string>;

/**
 * Resolve a brick image path (e.g. `/bricks/foo.png`) to a base64 data URI by
 * reading the asset from `public/` on the server, so the SVG has no external
 * references for sharp to chase.
 */
export const resolveBrickImageFromPublic: BrickImageResolver = async (imagePath) => {
  // Brick paths are always app-absolute, e.g. "/bricks/block-green-medium-left.png".
  // Strip the leading slash so path.resolve keeps us inside `public/`.
  const rel = imagePath.replace(/^\/+/, '');
  const publicDir = path.resolve(process.cwd(), 'public');
  const abs = path.resolve(publicDir, rel);
  if (abs !== publicDir && !abs.startsWith(publicDir + path.sep)) {
    throw new Error(`Brick image path escapes public/: ${imagePath}`);
  }
  const buf = await readFile(abs);
  const ext = path.extname(rel).toLowerCase();
  const mime =
    ext === '.svg'
      ? 'image/svg+xml'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
};

/**
 * Wrap a resolver so each distinct brick image is read and base64-encoded once.
 * Brick PNGs run to ~400KB, so a caller rendering several canvases in a row
 * (the seeder renders ten) should share one memoised resolver and let it go
 * out of scope afterwards rather than caching at module scope forever.
 */
export function memoiseBrickImageResolver(resolve: BrickImageResolver): BrickImageResolver {
  const cache = new Map<string, Promise<string>>();
  return (imagePath) => {
    const hit = cache.get(imagePath);
    if (hit) return hit;
    const pending = resolve(imagePath);
    cache.set(imagePath, pending);
    return pending;
  };
}

/** A memoised public/ resolver, scoped to one batch of renders. */
export function createPublicBrickImageResolver(): BrickImageResolver {
  return memoiseBrickImageResolver(resolveBrickImageFromPublic);
}

/**
 * Rasterise a canvas to a card-sized transparent PNG. Returns null when there
 * is nothing to draw (no visible bricks) or when rendering fails — callers
 * treat a missing thumbnail as non-fatal, exactly as an un-captured model is
 * today.
 */
export async function renderCanvasThumbnailPng(args: {
  canvasState: CanvasState;
  resolveBrickImage?: BrickImageResolver;
}): Promise<Buffer | null> {
  const visibleGroupIds = new Set(
    args.canvasState.groups.filter((g) => g.visible).map((g) => g.id),
  );
  const hasVisibleBrick = args.canvasState.bricks.some(
    (b) => b.visible && visibleGroupIds.has(b.groupId),
  );
  if (!hasVisibleBrick) return null;

  let svgText: string;
  try {
    const blob = await renderCanvasToSvgBlob({
      canvasState: args.canvasState,
      title: 'Canvas',
      resolveBrickImage: args.resolveBrickImage ?? resolveBrickImageFromPublic,
    });
    svgText = await blob.text();
  } catch (err) {
    console.error('serverThumbnail: SVG render failed', err);
    return null;
  }

  try {
    return await sharp(Buffer.from(svgText))
      .resize({
        width: THUMBNAIL_MAX_WIDTH,
        height: THUMBNAIL_MAX_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
  } catch (err) {
    console.error('serverThumbnail: sharp rasterise failed', err);
    return null;
  }
}
