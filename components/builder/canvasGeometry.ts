// Pure geometry + gesture-model helpers for BuilderCanvas. Extracted from
// BuilderCanvas.tsx unchanged.

import type { BrickInstance } from './builderState';

export const PAN_DRAG_THRESHOLD_PX = 3;

// The brick artwork (public/bricks/*.png) is rendered with its top/bottom
// face edges rising ~23.1° from horizontal (slope ≈0.427, measured off the
// asset silhouettes), and BrickNode draws it at an aspect-preserving size —
// so that is the one angle the canvas lattice can use without visibly
// shearing against every placed brick.
export const BRICK_EDGE_ANGLE_DEG = 23.1;

const LATTICE_LINE = 'rgba(60,30,15,0.06) 0 1px, transparent 1px 46px';

// Mirrored pair of hairline gradients forming the isometric ground lattice.
export const ISO_LATTICE_BACKGROUND_IMAGE = `repeating-linear-gradient(${BRICK_EDGE_ANGLE_DEG}deg, ${LATTICE_LINE}), repeating-linear-gradient(${180 - BRICK_EDGE_ANGLE_DEG}deg, ${LATTICE_LINE})`;

// World-space axis-aligned bounding box of a (possibly rotated) brick.
export function brickAabb(brick: BrickInstance): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
} {
  const rad = (brick.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const halfW = (brick.width * cos + brick.height * sin) / 2;
  const halfH = (brick.width * sin + brick.height * cos) / 2;
  return { x1: brick.x - halfW, y1: brick.y - halfH, x2: brick.x + halfW, y2: brick.y + halfH };
}

// Screen position for the trash button: top-centre of the union AABB of the
// whole selection.
export function selectionOverlay(
  bricks: BrickInstance[],
  pan: { x: number; y: number },
  zoom: number,
): { left: number; top: number } | null {
  if (bricks.length === 0) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  for (const b of bricks) {
    const box = brickAabb(b);
    minX = Math.min(minX, box.x1);
    maxX = Math.max(maxX, box.x2);
    minY = Math.min(minY, box.y1);
  }
  return {
    left: ((minX + maxX) / 2) * zoom + pan.x,
    top: minY * zoom + pan.y,
  };
}

// A drag gesture that starts on the empty canvas background. `candidate`
// becomes `pan` (Space held or touch) or `marquee` (mouse/pen) once the
// pointer travels past the drag threshold; a candidate that never moves is
// a click on empty canvas, which clears the selection.
export type CanvasGesture =
  | { mode: 'pan'; last: { x: number; y: number } }
  | { mode: 'candidate'; startClient: { x: number; y: number }; shiftKey: boolean }
  | {
      mode: 'marquee';
      startWorld: { x: number; y: number };
      currentWorld: { x: number; y: number };
      shiftKey: boolean;
    };
