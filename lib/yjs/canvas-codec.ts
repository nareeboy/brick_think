import * as Y from 'yjs';

import type { BrickInstance, LayerGroup } from '@/components/builder/builderState';

export const YJS_CANVAS_MAP_NAME = 'canvas';
export const YJS_LOCAL_ORIGIN = Symbol('brickthink-local');
export const YJS_SEED_ORIGIN = Symbol('brickthink-seed');

export interface CanvasSnapshot {
  title: string;
  groups: LayerGroup[];
  bricks: BrickInstance[];
}

export interface CanvasSeed {
  groups: LayerGroup[];
  bricks: BrickInstance[];
}

const BRICK_FIELDS = [
  'id',
  'groupId',
  'code',
  'image',
  'width',
  'height',
  'x',
  'y',
  'rotation',
  'visible',
] as const;

const GROUP_FIELDS = ['id', 'name', 'collapsed', 'visible'] as const;

function getCanvasMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap(YJS_CANVAS_MAP_NAME);
}

function ensureRoots(doc: Y.Doc): {
  canvas: Y.Map<unknown>;
  groups: Y.Array<Y.Map<unknown>>;
  bricks: Y.Array<Y.Map<unknown>>;
} {
  const canvas = getCanvasMap(doc);
  let groups = canvas.get('groups') as Y.Array<Y.Map<unknown>> | undefined;
  if (!groups) {
    groups = new Y.Array<Y.Map<unknown>>();
    canvas.set('groups', groups);
  }
  let bricks = canvas.get('bricks') as Y.Array<Y.Map<unknown>> | undefined;
  if (!bricks) {
    bricks = new Y.Array<Y.Map<unknown>>();
    canvas.set('bricks', bricks);
  }
  return { canvas, groups, bricks };
}

function brickToYMap(brick: BrickInstance): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  for (const k of BRICK_FIELDS) m.set(k, brick[k]);
  return m;
}

function groupToYMap(group: LayerGroup): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  for (const k of GROUP_FIELDS) m.set(k, group[k]);
  return m;
}

function readBrick(m: Y.Map<unknown>): BrickInstance {
  return {
    id: m.get('id') as string,
    groupId: m.get('groupId') as string,
    code: m.get('code') as string,
    image: m.get('image') as string,
    width: m.get('width') as number,
    height: m.get('height') as number,
    x: m.get('x') as number,
    y: m.get('y') as number,
    rotation: m.get('rotation') as number,
    visible: m.get('visible') as boolean,
  };
}

function readGroup(m: Y.Map<unknown>): LayerGroup {
  return {
    id: m.get('id') as string,
    name: m.get('name') as string,
    collapsed: m.get('collapsed') as boolean,
    visible: m.get('visible') as boolean,
  };
}

function findBrickIndex(arr: Y.Array<Y.Map<unknown>>, id: string): number {
  for (let i = 0; i < arr.length; i++) {
    const m = arr.get(i);
    if ((m.get('id') as string) === id) return i;
  }
  return -1;
}

function findGroupIndex(arr: Y.Array<Y.Map<unknown>>, id: string): number {
  for (let i = 0; i < arr.length; i++) {
    const m = arr.get(i);
    if ((m.get('id') as string) === id) return i;
  }
  return -1;
}

export function projectDocToCanvas(doc: Y.Doc): CanvasSnapshot {
  const { canvas, groups, bricks } = ensureRoots(doc);
  return {
    title: (canvas.get('title') as string | undefined) ?? '',
    groups: groups.map(readGroup),
    bricks: bricks.map(readBrick),
  };
}

export function seedDocFromCanvas(
  doc: Y.Doc,
  seed: CanvasSeed,
  title: string,
): void {
  doc.transact(() => {
    const { canvas, groups, bricks } = ensureRoots(doc);
    if (groups.length > 0 || bricks.length > 0 || canvas.get('title')) return;
    canvas.set('title', title);
    for (const g of seed.groups) groups.push([groupToYMap(g)]);
    for (const b of seed.bricks) bricks.push([brickToYMap(b)]);
  }, YJS_SEED_ORIGIN);
}

export function addBrickToDoc(doc: Y.Doc, brick: BrickInstance): void {
  doc.transact(() => {
    const { bricks } = ensureRoots(doc);
    if (findBrickIndex(bricks, brick.id) >= 0) return;
    bricks.push([brickToYMap(brick)]);
  }, YJS_LOCAL_ORIGIN);
}

export function updateBrickInDoc(
  doc: Y.Doc,
  id: string,
  partial: Partial<Omit<BrickInstance, 'id' | 'groupId'>>,
): void {
  doc.transact(() => {
    const { bricks } = ensureRoots(doc);
    const idx = findBrickIndex(bricks, id);
    if (idx < 0) return;
    const m = bricks.get(idx);
    for (const [k, v] of Object.entries(partial)) {
      if (v === undefined) continue;
      m.set(k, v);
    }
  }, YJS_LOCAL_ORIGIN);
}

export function deleteBrickFromDoc(doc: Y.Doc, id: string): void {
  doc.transact(() => {
    const { bricks } = ensureRoots(doc);
    const idx = findBrickIndex(bricks, id);
    if (idx < 0) return;
    bricks.delete(idx, 1);
  }, YJS_LOCAL_ORIGIN);
}

export function setBrickVisibleInDoc(
  doc: Y.Doc,
  id: string,
  visible: boolean,
): void {
  doc.transact(() => {
    const { bricks } = ensureRoots(doc);
    const idx = findBrickIndex(bricks, id);
    if (idx < 0) return;
    bricks.get(idx).set('visible', visible);
  }, YJS_LOCAL_ORIGIN);
}

export function moveBrickInDoc(
  doc: Y.Doc,
  brickId: string,
  toGroupId: string,
  beforeBrickId: string | null,
): void {
  doc.transact(() => {
    const { bricks } = ensureRoots(doc);
    const fromIdx = findBrickIndex(bricks, brickId);
    if (fromIdx < 0) return;
    const current = bricks.get(fromIdx);
    const cloned = new Y.Map<unknown>();
    for (const k of BRICK_FIELDS) cloned.set(k, current.get(k));
    cloned.set('groupId', toGroupId);
    bricks.delete(fromIdx, 1);

    let insertAt: number;
    if (beforeBrickId) {
      const beforeIdx = findBrickIndex(bricks, beforeBrickId);
      insertAt = beforeIdx >= 0 ? beforeIdx : bricks.length;
    } else {
      insertAt = bricks.length;
    }
    bricks.insert(insertAt, [cloned]);
  }, YJS_LOCAL_ORIGIN);
}

export function addGroupToDoc(doc: Y.Doc, group: LayerGroup): void {
  doc.transact(() => {
    const { groups } = ensureRoots(doc);
    if (findGroupIndex(groups, group.id) >= 0) return;
    groups.unshift([groupToYMap(group)]);
  }, YJS_LOCAL_ORIGIN);
}

export function renameGroupInDoc(doc: Y.Doc, id: string, name: string): void {
  doc.transact(() => {
    const { groups } = ensureRoots(doc);
    const idx = findGroupIndex(groups, id);
    if (idx < 0) return;
    groups.get(idx).set('name', name);
  }, YJS_LOCAL_ORIGIN);
}

export function deleteGroupFromDoc(doc: Y.Doc, id: string): void {
  doc.transact(() => {
    const { groups, bricks } = ensureRoots(doc);
    const idx = findGroupIndex(groups, id);
    if (idx < 0) return;
    groups.delete(idx, 1);
    for (let i = bricks.length - 1; i >= 0; i--) {
      const m = bricks.get(i);
      if ((m.get('groupId') as string) === id) bricks.delete(i, 1);
    }
  }, YJS_LOCAL_ORIGIN);
}

export function setGroupVisibleInDoc(
  doc: Y.Doc,
  id: string,
  visible: boolean,
): void {
  doc.transact(() => {
    const { groups } = ensureRoots(doc);
    const idx = findGroupIndex(groups, id);
    if (idx < 0) return;
    groups.get(idx).set('visible', visible);
  }, YJS_LOCAL_ORIGIN);
}

export function setGroupCollapsedInDoc(
  doc: Y.Doc,
  id: string,
  collapsed: boolean,
): void {
  doc.transact(() => {
    const { groups } = ensureRoots(doc);
    const idx = findGroupIndex(groups, id);
    if (idx < 0) return;
    groups.get(idx).set('collapsed', collapsed);
  }, YJS_LOCAL_ORIGIN);
}

export function moveGroupInDoc(doc: Y.Doc, id: string, toIndex: number): void {
  doc.transact(() => {
    const { groups } = ensureRoots(doc);
    const fromIdx = findGroupIndex(groups, id);
    if (fromIdx < 0) return;
    const current = groups.get(fromIdx);
    const cloned = new Y.Map<unknown>();
    for (const k of GROUP_FIELDS) cloned.set(k, current.get(k));
    groups.delete(fromIdx, 1);
    const clamped = Math.max(0, Math.min(groups.length, toIndex));
    groups.insert(clamped, [cloned]);
  }, YJS_LOCAL_ORIGIN);
}

export function setTitleInDoc(doc: Y.Doc, title: string): void {
  doc.transact(() => {
    getCanvasMap(doc).set('title', title);
  }, YJS_LOCAL_ORIGIN);
}
