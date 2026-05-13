export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function unionRects(rects: Rect[]): Rect {
  if (rects.length === 0) {
    throw new Error('unionRects requires at least one rect');
  }
  const first = rects[0]!;
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.width;
  let maxY = first.y + first.height;
  for (let i = 1; i < rects.length; i++) {
    const r = rects[i]!;
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.width > maxX) maxX = r.x + r.width;
    if (r.y + r.height > maxY) maxY = r.y + r.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function padBbox(r: Rect, ratio: number): Rect {
  const dx = (r.width * ratio) / 2;
  const dy = (r.height * ratio) / 2;
  return {
    x: r.x - dx,
    y: r.y - dy,
    width: r.width + dx * 2,
    height: r.height + dy * 2,
  };
}

// Caller invariant: r.width > 0 and r.height > 0. Upstream callers guard
// (e.g. nodes.length === 0 → skip) so this isn't enforced here.
export function fitToBox(
  r: Rect,
  maxW: number,
  maxH: number,
): { scale: number; width: number; height: number } {
  const scale = Math.min(1, Math.min(maxW / r.width, maxH / r.height));
  return {
    scale,
    width: r.width * scale,
    height: r.height * scale,
  };
}
