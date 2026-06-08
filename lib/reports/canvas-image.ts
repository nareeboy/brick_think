import { readFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { renderCanvasToSvgBlob } from '@/lib/exports/svg';
import type { CanvasState } from '@/lib/models/types';

/**
 * Resolve a brick image path (e.g. `/bricks/foo.png`) to a base64 data URI by
 * reading the asset from `public/` on the server. The SVG export embeds these
 * directly so the resulting document has no external references.
 */
async function resolveBrickImageFromPublic(imagePath: string): Promise<string> {
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
}

/**
 * Server-side canvas image source. Prefers a stored thumbnail; falls back to
 * rasterising the canvas's SVG export via sharp when no thumbnail exists.
 *
 * The PNG export pipeline at lib/exports/png.ts is client-side only (depends
 * on Konva.Stage), so we use SVG → sharp here.
 */
export async function getCanvasImageBuffer(args: {
  thumbnailUrl: string | null;
  canvasState: CanvasState;
  title?: string;
  maxWidth?: number;
}): Promise<Buffer | null> {
  const maxWidth = args.maxWidth ?? 960;

  if (args.thumbnailUrl) {
    try {
      const res = await fetch(args.thumbnailUrl);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > 0) return buf;
      }
    } catch {
      // fall through to SVG fallback
    }
  }

  if (args.canvasState.bricks.length === 0) return null;

  let svgText: string;
  try {
    const blob = await renderCanvasToSvgBlob({
      canvasState: args.canvasState,
      title: args.title ?? 'Canvas',
      resolveBrickImage: resolveBrickImageFromPublic,
    });
    svgText = await blob.text();
  } catch (err) {
    console.error('canvas-image: SVG render failed', err);
    return null;
  }

  try {
    return await sharp(Buffer.from(svgText))
      .resize({ width: maxWidth, withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch (err) {
    console.error('canvas-image: sharp rasterise failed', err);
    return null;
  }
}
