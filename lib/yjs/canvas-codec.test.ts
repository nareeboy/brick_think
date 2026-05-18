import { describe, expect, test } from 'vitest';
import * as Y from 'yjs';

import {
  addBrickToDoc,
  addGroupToDoc,
  deleteBrickFromDoc,
  moveBrickInDoc,
  projectDocToCanvas,
  seedDocFromCanvas,
  setTitleInDoc,
  updateBrickInDoc,
} from './canvas-codec';

function makeBrick(id: string, groupId: string, overrides: Partial<{ x: number; y: number }> = {}) {
  return {
    id,
    groupId,
    code: 'C1',
    image: 'brick-1.png',
    width: 80,
    height: 32,
    x: overrides.x ?? 100,
    y: overrides.y ?? 100,
    rotation: 0,
    visible: true,
  };
}

describe('canvas-codec', () => {
  test('seedDocFromCanvas is idempotent on a primed doc', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(
      doc,
      {
        groups: [{ id: 'g1', name: 'Untitled', collapsed: false, visible: true }],
        bricks: [makeBrick('b1', 'g1')],
      },
      'Hello',
    );

    seedDocFromCanvas(
      doc,
      {
        groups: [{ id: 'g2', name: 'Other', collapsed: true, visible: false }],
        bricks: [],
      },
      'Different',
    );

    const snap = projectDocToCanvas(doc);
    expect(snap.title).toBe('Hello');
    expect(snap.groups).toEqual([{ id: 'g1', name: 'Untitled', collapsed: false, visible: true }]);
    expect(snap.bricks).toHaveLength(1);
    expect(snap.bricks[0]?.id).toBe('b1');
  });

  test('add → update → delete brick round-trips', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(
      doc,
      {
        groups: [{ id: 'g1', name: 'Untitled', collapsed: false, visible: true }],
        bricks: [],
      },
      'T',
    );
    addBrickToDoc(doc, makeBrick('b1', 'g1'));
    addBrickToDoc(doc, makeBrick('b2', 'g1', { x: 200, y: 200 }));
    updateBrickInDoc(doc, 'b1', { x: 999 });
    deleteBrickFromDoc(doc, 'b2');

    const snap = projectDocToCanvas(doc);
    expect(snap.bricks).toHaveLength(1);
    expect(snap.bricks[0]?.id).toBe('b1');
    expect(snap.bricks[0]?.x).toBe(999);
  });

  test('moveBrick reorders into target group', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(
      doc,
      {
        groups: [
          { id: 'g1', name: 'A', collapsed: false, visible: true },
          { id: 'g2', name: 'B', collapsed: false, visible: true },
        ],
        bricks: [makeBrick('b1', 'g1'), makeBrick('b2', 'g2'), makeBrick('b3', 'g2')],
      },
      'T',
    );
    moveBrickInDoc(doc, 'b1', 'g2', 'b3');

    const snap = projectDocToCanvas(doc);
    const order = snap.bricks.map((b) => b.id);
    expect(order).toEqual(['b2', 'b1', 'b3']);
    expect(snap.bricks.find((b) => b.id === 'b1')?.groupId).toBe('g2');
  });

  test('addGroup prepends to groups list', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(
      doc,
      {
        groups: [{ id: 'g1', name: 'A', collapsed: false, visible: true }],
        bricks: [],
      },
      'T',
    );
    addGroupToDoc(doc, { id: 'g2', name: 'B', collapsed: false, visible: true });
    const snap = projectDocToCanvas(doc);
    expect(snap.groups.map((g) => g.id)).toEqual(['g2', 'g1']);
  });

  test('setTitleInDoc updates and projects', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(doc, { groups: [], bricks: [] }, 'Old');
    setTitleInDoc(doc, 'New');
    expect(projectDocToCanvas(doc).title).toBe('New');
  });

  test('two docs converge after sync', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    seedDocFromCanvas(
      a,
      {
        groups: [{ id: 'g1', name: 'Untitled', collapsed: false, visible: true }],
        bricks: [],
      },
      'T',
    );
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    addBrickToDoc(a, makeBrick('b1', 'g1'));
    addBrickToDoc(b, makeBrick('b2', 'g1', { x: 300, y: 300 }));

    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));

    const snapA = projectDocToCanvas(a);
    const snapB = projectDocToCanvas(b);
    expect(snapA.bricks.map((br) => br.id).sort()).toEqual(['b1', 'b2']);
    expect(snapB.bricks.map((br) => br.id).sort()).toEqual(['b1', 'b2']);
  });
});
