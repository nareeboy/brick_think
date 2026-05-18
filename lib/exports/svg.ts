import type { BrickInstance } from '@/components/builder/builderState';
import type { CanvasState } from '@/lib/models/types';

export interface SvgExportOptions {
  canvasState: CanvasState;
  title: string;
  /** Padding around the brick bounding box, in canvas units. Default 64. */
  padding?: number;
  /** Resolve a brick.image path to a base64 data URI. */
  resolveBrickImage: (imagePath: string) => Promise<string>;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface AxisAlignedBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function brickAabb(b: BrickInstance): AxisAlignedBBox {
  // Konva rotates around the brick's centre (offsetX/Y = w/2, h/2). The
  // axis-aligned bbox of a rotated rectangle expands by sin/cos.
  const rad = (b.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = b.width * cos + b.height * sin;
  const h = b.width * sin + b.height * cos;
  return {
    minX: b.x - w / 2,
    minY: b.y - h / 2,
    maxX: b.x + w / 2,
    maxY: b.y + h / 2,
  };
}

export async function renderCanvasToSvgBlob(opts: SvgExportOptions): Promise<Blob> {
  const padding = opts.padding ?? 64;
  const visibleGroupIds = new Set(
    opts.canvasState.groups.filter((g) => g.visible).map((g) => g.id),
  );
  // Match Konva draw order: panel top-to-bottom maps to reverse render order.
  const visible = opts.canvasState.bricks
    .filter((b) => b.visible && visibleGroupIds.has(b.groupId))
    .slice()
    .reverse();

  // Distinct visible images, resolved in parallel.
  const distinctPaths = Array.from(new Set(visible.map((b) => b.image)));
  const dataUriByPath = new Map<string, string>();
  await Promise.all(
    distinctPaths.map(async (p) => {
      dataUriByPath.set(p, await opts.resolveBrickImage(p));
    }),
  );

  let viewBox = { x: 0, y: 0, width: 100, height: 100 };
  if (visible.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const b of visible) {
      const aabb = brickAabb(b);
      if (aabb.minX < minX) minX = aabb.minX;
      if (aabb.minY < minY) minY = aabb.minY;
      if (aabb.maxX > maxX) maxX = aabb.maxX;
      if (aabb.maxY > maxY) maxY = aabb.maxY;
    }
    viewBox = {
      x: Math.floor(minX - padding),
      y: Math.floor(minY - padding),
      width: Math.ceil(maxX - minX + padding * 2),
      height: Math.ceil(maxY - minY + padding * 2),
    };
  }

  const imageNodes = visible.map((b) => {
    const href = dataUriByPath.get(b.image)!;
    const left = b.x - b.width / 2;
    const top = b.y - b.height / 2;
    const transform = b.rotation === 0 ? '' : ` transform="rotate(${b.rotation} ${b.x} ${b.y})"`;
    return `<image id="${escapeXml(b.id)}" href="${href}" x="${left}" y="${top}" width="${b.width}" height="${b.height}"${transform} />`;
  });

  const svg = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}">`,
    `<title>${escapeXml(opts.title)}</title>`,
    ...imageNodes,
    `</svg>`,
  ].join('\n');

  return new Blob([svg], { type: 'image/svg+xml' });
}
