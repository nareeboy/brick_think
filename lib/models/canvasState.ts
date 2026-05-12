import type { BrickInstance, LayerGroup } from '@/components/builder/builderState';
import type { CanvasState } from './types';

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
    Number.isFinite(o.width) &&
    Number.isFinite(o.height) &&
    Number.isFinite(o.x) &&
    Number.isFinite(o.y) &&
    Number.isFinite(o.rotation) &&
    typeof o.visible === 'boolean'
  );
}

export function parseCanvasState(raw: unknown): CanvasState {
  if (!raw || typeof raw !== 'object') return { groups: [], bricks: [] };
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.groups) || !Array.isArray(o.bricks)) {
    return { groups: [], bricks: [] };
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
