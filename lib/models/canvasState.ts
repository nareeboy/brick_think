import type { BrickInstance, LayerGroup } from '@/components/builder/builderState';
import type { CanvasState } from './types';
import { EMPTY_CANVAS_STATE } from './types';

function isGroup(g: unknown): g is LayerGroup {
  if (!g || typeof g !== 'object') return false;
  const o = g as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.collapsed === 'boolean' &&
    typeof o.visible === 'boolean'
  );
}

function isBrick(b: unknown): b is BrickInstance {
  if (!b || typeof b !== 'object') return false;
  const o = b as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.groupId === 'string' &&
    typeof o.code === 'string' &&
    typeof o.image === 'string' &&
    typeof o.width === 'number' &&
    typeof o.height === 'number' &&
    typeof o.x === 'number' &&
    typeof o.y === 'number' &&
    typeof o.rotation === 'number' &&
    typeof o.visible === 'boolean'
  );
}

export function parseCanvasState(raw: unknown): CanvasState {
  if (!raw || typeof raw !== 'object') return EMPTY_CANVAS_STATE;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.groups) || !Array.isArray(o.bricks)) {
    return EMPTY_CANVAS_STATE;
  }
  const groups = o.groups.filter(isGroup);
  const groupIds = new Set(groups.map((g) => g.id));
  const bricks = o.bricks.filter(isBrick).filter((b) => groupIds.has(b.groupId));
  return { groups, bricks };
}

export function serializeCanvasState(state: CanvasState): CanvasState {
  return {
    groups: state.groups.map((g) => ({ ...g })),
    bricks: state.bricks.map((b) => ({ ...b })),
  };
}
