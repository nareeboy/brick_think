import type Konva from 'konva';

import { loadBrickImage } from '@/lib/canvas/brickImage';
import type { CanvasState } from '@/lib/models/types';

export interface PngExportOptions {
  canvasState: CanvasState;
  /**
   * Optional: reuse an existing live Stage (Builder mode).
   * If omitted, the renderer creates an off-screen Stage from `canvasState`,
   * renders, and disposes it (My Designs card mode).
   */
  stage?: Konva.Stage;
  /** Padding around the brick bounding box, in stage units. Default 64. */
  padding?: number;
  /** Output pixel ratio multiplier. Default 2 (retina). */
  pixelRatio?: number;
}

// 1×1 transparent PNG. Falls out of the empty-canvas branch instead of an
// error so the user still gets a download artefact when they hit Export
// with nothing on the canvas.
const EMPTY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function base64ToBytes(b64: string): Uint8Array {
  // Works in Node (atob is global in Node 18+) and the browser.
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const meta = dataUrl.slice(5, comma); // strip leading "data:"
  const isBase64 = meta.endsWith(';base64');
  const mime = isBase64 ? meta.slice(0, -';base64'.length) : meta;
  const payload = dataUrl.slice(comma + 1);
  const bytes = isBase64
    ? base64ToBytes(payload)
    : new TextEncoder().encode(decodeURIComponent(payload));
  // bytes.buffer is ArrayBufferLike; Blob's payload typing wants ArrayBuffer.
  // The runtime is fine — the cast is purely to satisfy the strict DOM types.
  return new Blob([bytes.buffer as ArrayBuffer], { type: mime || 'application/octet-stream' });
}

function visibleBricks(state: CanvasState) {
  const groups = new Set(state.groups.filter((g) => g.visible).map((g) => g.id));
  return state.bricks.filter((b) => b.visible && groups.has(b.groupId));
}

function unionRects(rects: Array<{ x: number; y: number; width: number; height: number }>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.width > maxX) maxX = r.x + r.width;
    if (r.y + r.height > maxY) maxY = r.y + r.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export async function renderCanvasToPngBlob(opts: PngExportOptions): Promise<Blob> {
  const padding = opts.padding ?? 64;
  const pixelRatio = opts.pixelRatio ?? 2;
  const bricks = visibleBricks(opts.canvasState);

  if (bricks.length === 0) {
    return dataUrlToBlob(`data:image/png;base64,${EMPTY_PNG_BASE64}`);
  }

  if (opts.stage) {
    return renderFromStage(opts.stage, padding, pixelRatio);
  }
  return renderOffscreen(opts.canvasState, padding, pixelRatio);
}

function renderFromStage(stage: Konva.Stage, padding: number, pixelRatio: number): Blob {
  const layer = stage.getLayers()[0];
  if (!layer) throw new Error('Stage has no layers');
  const rects = layer
    .getChildren()
    .map((n) => n.getClientRect({ skipTransform: false, relativeTo: layer }));
  const bbox = unionRects(rects);
  const padded = {
    x: bbox.x - padding,
    y: bbox.y - padding,
    width: bbox.width + padding * 2,
    height: bbox.height + padding * 2,
  };
  const dataUrl = layer.toDataURL({ ...padded, pixelRatio });
  return dataUrlToBlob(dataUrl);
}

async function renderOffscreen(
  state: CanvasState,
  padding: number,
  pixelRatio: number,
): Promise<Blob> {
  // Lazy-load Konva so callers in the My Designs bundle pull it only when
  // a card-side PNG export is requested.
  const Konva = (await import('konva')).default;
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '-99999px';
  document.body.appendChild(container);
  try {
    const stage = new Konva.Stage({ container, width: 1, height: 1 });
    const layer = new Konva.Layer();
    stage.add(layer);

    const visibleGroupIds = new Set(state.groups.filter((g) => g.visible).map((g) => g.id));
    // Reverse to match Konva draw order convention (panel top→bottom).
    const visible = state.bricks
      .filter((b) => b.visible && visibleGroupIds.has(b.groupId))
      .slice()
      .reverse();

    await Promise.all(
      visible.map(async (b) => {
        const img = await loadBrickImage(b.image);
        const node = new Konva.Image({
          image: img,
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          offsetX: b.width / 2,
          offsetY: b.height / 2,
          rotation: b.rotation,
        });
        layer.add(node);
      }),
    );

    const rects = layer
      .getChildren()
      .map((n) => n.getClientRect({ skipTransform: false, relativeTo: layer }));
    const bbox = unionRects(rects);
    stage.size({
      width: Math.ceil(bbox.width + padding * 2),
      height: Math.ceil(bbox.height + padding * 2),
    });
    layer.draw();
    const padded = {
      x: bbox.x - padding,
      y: bbox.y - padding,
      width: bbox.width + padding * 2,
      height: bbox.height + padding * 2,
    };
    const dataUrl = layer.toDataURL({ ...padded, pixelRatio });
    stage.destroy();
    return dataUrlToBlob(dataUrl);
  } finally {
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
