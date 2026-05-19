import type { CanvasState } from '@/lib/models/types';
import type { BrickInstance, LayerGroup } from '@/components/builder/builderState';

import { remapCanvasForImport } from '@/lib/sessions/stage-import';

export const LANE_GAP_PX = 80;
export const EMPTY_LANE_WIDTH_PX = 320;

interface BBox {
  minX: number;
  maxX: number;
  width: number;
}

function bboxOf(bricks: BrickInstance[]): BBox {
  if (bricks.length === 0) {
    return { minX: 0, maxX: EMPTY_LANE_WIDTH_PX, width: EMPTY_LANE_WIDTH_PX };
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  for (const b of bricks) {
    if (b.x < minX) minX = b.x;
    const right = b.x + b.width;
    if (right > maxX) maxX = right;
  }
  return { minX, maxX, width: maxX - minX };
}

export interface RoomLaneInput {
  /** Display name shown in the Layers panel — typically the participant's full name. */
  displayName: string;
  /** Source canvas to copy. May be empty (participant who didn't build anything). */
  source: CanvasState;
}

/**
 * Compose N source canvases into one wide canvas where each source occupies a
 * horizontal lane. Brick ids are regenerated to avoid collision. Root group of
 * each source is renamed via {@link remapCanvasForImport} so the room's Layers
 * panel shows "{name}'s {group}" per contributor.
 *
 * Lane N starts at x = sum(previous lane widths) + N * LANE_GAP_PX. Each
 * source's bricks are translated so their left edge sits at the lane's x
 * origin (subtracts the source's own minX). Y-coordinates are preserved.
 *
 * Empty sources reserve an {@link EMPTY_LANE_WIDTH_PX}-wide lane so the
 * resulting layout still telegraphs that a participant exists in the room.
 */
export function composeRoomCanvas(lanes: RoomLaneInput[]): CanvasState {
  const allGroups: LayerGroup[] = [];
  const allBricks: BrickInstance[] = [];

  let cursorX = 0;
  for (const lane of lanes) {
    const remapped = remapCanvasForImport(lane.source, {
      renameRootGroupTo: lane.displayName,
    });
    const bbox = bboxOf(remapped.bricks);
    const offset = cursorX - bbox.minX;

    allGroups.push(...remapped.groups);
    for (const b of remapped.bricks) {
      allBricks.push({ ...b, x: b.x + offset });
    }

    cursorX += bbox.width + LANE_GAP_PX;
  }

  return { groups: allGroups, bricks: allBricks };
}
