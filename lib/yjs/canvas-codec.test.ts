import { describe, expect, test } from 'vitest';
import * as Y from 'yjs';

import {
  addBrickToDoc,
  addGroupToDoc,
  deleteBrickFromDoc,
  deleteBricksFromDoc,
  moveBrickInDoc,
  projectDocToCanvas,
  reorderBricksInDoc,
  seedDocFromCanvas,
  setTitleInDoc,
  updateBrickInDoc,
  updateBricksInDoc,
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

  test('brick name round-trips through the doc', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(
      doc,
      {
        groups: [{ id: 'g1', name: 'Untitled', collapsed: false, visible: true }],
        bricks: [{ ...makeBrick('b1', 'g1'), name: 'Roof tile' }],
      },
      'T',
    );
    expect(projectDocToCanvas(doc).bricks[0]?.name).toBe('Roof tile');
  });

  test('updateBrickInDoc sets name and moveBrickInDoc preserves it', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(
      doc,
      {
        groups: [
          { id: 'g1', name: 'A', collapsed: false, visible: true },
          { id: 'g2', name: 'B', collapsed: false, visible: true },
        ],
        bricks: [makeBrick('b1', 'g1')],
      },
      'T',
    );
    updateBrickInDoc(doc, 'b1', { name: 'Chimney' });
    expect(projectDocToCanvas(doc).bricks[0]?.name).toBe('Chimney');

    moveBrickInDoc(doc, 'b1', 'g2', null);
    const moved = projectDocToCanvas(doc).bricks[0];
    expect(moved?.groupId).toBe('g2');
    expect(moved?.name).toBe('Chimney');
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

describe('batched multi-brick operations', () => {
  function seededDoc() {
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
    addBrickToDoc(doc, makeBrick('b3', 'g1', { x: 300, y: 300 }));
    return doc;
  }

  test('updateBricksInDoc applies all changes in a single transaction', () => {
    const doc = seededDoc();
    let transactions = 0;
    doc.on('afterTransaction', () => {
      transactions += 1;
    });
    updateBricksInDoc(doc, [
      { id: 'b1', changes: { x: 11, y: 12 } },
      { id: 'b2', changes: { x: 21, y: 22 } },
      { id: 'missing', changes: { x: 1 } },
    ]);
    const snap = projectDocToCanvas(doc);
    expect(snap.bricks.find((b) => b.id === 'b1')).toMatchObject({ x: 11, y: 12 });
    expect(snap.bricks.find((b) => b.id === 'b2')).toMatchObject({ x: 21, y: 22 });
    expect(transactions).toBe(1);
  });

  test('deleteBricksFromDoc removes all ids in a single transaction', () => {
    const doc = seededDoc();
    let transactions = 0;
    doc.on('afterTransaction', () => {
      transactions += 1;
    });
    deleteBricksFromDoc(doc, ['b1', 'b3', 'missing']);
    const snap = projectDocToCanvas(doc);
    expect(snap.bricks.map((b) => b.id)).toEqual(['b2']);
    expect(transactions).toBe(1);
  });

  test('flippedX round-trips through the doc and defaults to undefined', () => {
    const doc = seededDoc();
    updateBrickInDoc(doc, 'b1', { flippedX: true });
    const snap = projectDocToCanvas(doc);
    expect(snap.bricks.find((b) => b.id === 'b1')?.flippedX).toBe(true);
    expect(snap.bricks.find((b) => b.id === 'b2')?.flippedX).toBeUndefined();
  });

  test('reorderBricksInDoc rewrites a group run in a single transaction', () => {
    const doc = seededDoc();
    updateBrickInDoc(doc, 'b2', { flippedX: true });
    let transactions = 0;
    doc.on('afterTransaction', () => {
      transactions += 1;
    });
    reorderBricksInDoc(doc, [{ groupId: 'g1', orderedIds: ['b3', 'b1', 'b2'] }]);
    const snap = projectDocToCanvas(doc);
    expect(snap.bricks.map((b) => b.id)).toEqual(['b3', 'b1', 'b2']);
    // Fields survive the clone, including the optional flip flag.
    expect(snap.bricks.find((b) => b.id === 'b2')?.flippedX).toBe(true);
    expect(snap.bricks.find((b) => b.id === 'b2')?.x).toBe(200);
    expect(transactions).toBe(1);
  });

  test('reorderBricksInDoc skips a run whose ids diverged from the doc', () => {
    const doc = seededDoc();
    reorderBricksInDoc(doc, [{ groupId: 'g1', orderedIds: ['b3', 'b1'] }]);
    reorderBricksInDoc(doc, [{ groupId: 'g1', orderedIds: ['b3', 'b1', 'ghost'] }]);
    const snap = projectDocToCanvas(doc);
    expect(snap.bricks.map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
  });

  test('reorderBricksInDoc leaves other groups untouched', () => {
    const doc = seededDoc();
    addGroupToDoc(doc, { id: 'g2', name: 'Other', collapsed: false, visible: true });
    addBrickToDoc(doc, makeBrick('c1', 'g2'));
    addBrickToDoc(doc, makeBrick('c2', 'g2'));
    reorderBricksInDoc(doc, [{ groupId: 'g2', orderedIds: ['c2', 'c1'] }]);
    const snap = projectDocToCanvas(doc);
    expect(snap.bricks.map((b) => b.id)).toEqual(['b1', 'b2', 'b3', 'c2', 'c1']);
  });
});
