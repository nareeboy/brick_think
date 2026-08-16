// Shared types, constants, and pure helpers for the builder state modules.
// Everything here is side-effect free; the public pieces are re-exported from
// builderState.tsx so consumer imports are unchanged.

export interface BrickInstance {
  id: string;
  groupId: string;
  code: string;
  name?: string;
  image: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  visible: boolean;
  /** Mirrored around the vertical axis. Absent on pre-flip canvases = false. */
  flippedX?: boolean;
}

export interface LayerGroup {
  id: string;
  name: string;
  collapsed: boolean;
  visible: boolean;
}

export interface InitialBuilderState {
  modelId: string;
  title: string;
  canvasState: { groups: LayerGroup[]; bricks: BrickInstance[] };
}

export const MIN_PIECE_SIZE = 16;
export const MAX_PIECE_SIZE = 2000;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.25;
// Idle delay before auto-capturing the design-card thumbnail after an edit.
// Resets on every edit, so continuous editing produces no uploads until the
// user pauses — then a single capture lands while the canvas is still mounted.
// Kept well under the ~1s pause people make before navigating away: the capture
// must START (and its upload, which survives the SPA navigation, finish) before
// the builder unmounts and tears the Konva canvas down. A longer delay means a
// quick edit-then-leave never captures.
export const THUMBNAIL_CAPTURE_DEBOUNCE_MS = 600;

export function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createInitialGroup(name = 'Untitled'): LayerGroup {
  return { id: makeId('g'), name, collapsed: false, visible: true };
}

export function nextUntitledName(groups: LayerGroup[]): string {
  const taken = new Set(groups.map((g) => g.name));
  if (!taken.has('Untitled')) return 'Untitled';
  for (let i = 2; i < 1000; i++) {
    const candidate = `Untitled ${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `Untitled ${Date.now()}`;
}

export interface BuilderData {
  groups: LayerGroup[];
  bricks: BrickInstance[];
  activeGroupId: string;
  // Multi-selection, in selection order. The public `selectedId` is derived
  // from the first entry for the single-selection consumers (LayersPanel
  // active row, a11y mirror, awareness, undo meta).
  selectedIds: string[];
}

export interface ToastState {
  id: number;
  message: string;
}

export interface View {
  pan: { x: number; y: number };
  zoom: number;
}

export function makeInitialData(): BuilderData {
  const g = createInitialGroup();
  return { groups: [g], bricks: [], activeGroupId: g.id, selectedIds: [] };
}

export function findGroupInsertionEnd(
  bricks: BrickInstance[],
  groups: LayerGroup[],
  groupId: string,
): number {
  // Return the index just after the last brick that belongs to `groupId`, which
  // equals the index of the first brick belonging to any group that comes
  // *after* `groupId` in the panel order. If none, append to the end.
  const gi = groups.findIndex((g) => g.id === groupId);
  if (gi < 0) return bricks.length;
  for (let i = gi + 1; i < groups.length; i++) {
    const g = groups[i];
    if (!g) continue;
    const nextIdx = bricks.findIndex((b) => b.groupId === g.id);
    if (nextIdx >= 0) return nextIdx;
  }
  return bricks.length;
}

export function findGroupInsertionStart(
  bricks: BrickInstance[],
  groups: LayerGroup[],
  groupId: string,
): number {
  // Index of the first brick of this group, or the position where it would
  // start (= end of the previous non-empty group's run, == start of next
  // group's run if this one is empty).
  const firstIdx = bricks.findIndex((b) => b.groupId === groupId);
  if (firstIdx >= 0) return firstIdx;
  return findGroupInsertionEnd(bricks, groups, groupId);
}
