import { describe, expect, test } from 'vitest';
import * as Y from 'yjs';

import {
  YJS_CANVAS_MAP_NAME,
  YJS_LOCAL_ORIGIN,
  addBrickToDoc,
  addGroupToDoc,
  deleteBrickFromDoc,
  deleteGroupFromDoc,
  moveBrickInDoc,
  projectDocToCanvas,
  seedDocFromCanvas,
  setTitleInDoc,
  updateBrickInDoc,
} from './canvas-codec';

function makeBrick(
  id: string,
  groupId: string,
  overrides: Partial<{ x: number; y: number }> = {},
) {
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

function makeGroup(id: string, name = 'Untitled') {
  return { id, name, collapsed: false, visible: true };
}

function makeUndoManager(doc: Y.Doc, captureTimeout = 500): Y.UndoManager {
  return new Y.UndoManager(doc.getMap(YJS_CANVAS_MAP_NAME), {
    trackedOrigins: new Set([YJS_LOCAL_ORIGIN]),
    captureTimeout,
  });
}

describe('canvas-codec + Y.UndoManager', () => {
  test('add brick → undo removes it, redo restores it', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(doc, { groups: [makeGroup('g1')], bricks: [] }, 'T');
    const um = makeUndoManager(doc);

    addBrickToDoc(doc, makeBrick('b1', 'g1'));
    expect(projectDocToCanvas(doc).bricks).toHaveLength(1);

    um.undo();
    expect(projectDocToCanvas(doc).bricks).toHaveLength(0);

    um.redo();
    expect(projectDocToCanvas(doc).bricks).toHaveLength(1);
    expect(projectDocToCanvas(doc).bricks[0]?.id).toBe('b1');
  });

  test('update brick position → undo restores prior position', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(
      doc,
      { groups: [makeGroup('g1')], bricks: [makeBrick('b1', 'g1', { x: 10 })] },
      'T',
    );
    const um = makeUndoManager(doc);

    updateBrickInDoc(doc, 'b1', { x: 500 });
    expect(projectDocToCanvas(doc).bricks[0]?.x).toBe(500);

    um.undo();
    expect(projectDocToCanvas(doc).bricks[0]?.x).toBe(10);

    um.redo();
    expect(projectDocToCanvas(doc).bricks[0]?.x).toBe(500);
  });

  test('move brick across groups → undo restores prior group', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(
      doc,
      {
        groups: [makeGroup('g1'), makeGroup('g2', 'Other')],
        bricks: [makeBrick('b1', 'g1')],
      },
      'T',
    );
    const um = makeUndoManager(doc);

    moveBrickInDoc(doc, 'b1', 'g2', null);
    expect(projectDocToCanvas(doc).bricks[0]?.groupId).toBe('g2');

    um.undo();
    expect(projectDocToCanvas(doc).bricks[0]?.groupId).toBe('g1');
  });

  test('delete group cascade → undo restores group and its bricks as one entry', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(
      doc,
      {
        groups: [makeGroup('g1')],
        bricks: [
          makeBrick('b1', 'g1'),
          makeBrick('b2', 'g1'),
          makeBrick('b3', 'g1'),
        ],
      },
      'T',
    );
    const um = makeUndoManager(doc);

    deleteGroupFromDoc(doc, 'g1');
    expect(projectDocToCanvas(doc).groups).toHaveLength(0);
    expect(projectDocToCanvas(doc).bricks).toHaveLength(0);

    expect(um.undoStack.length).toBe(1);
    um.undo();
    expect(projectDocToCanvas(doc).groups).toHaveLength(1);
    expect(projectDocToCanvas(doc).bricks).toHaveLength(3);
  });

  test('set title → undo restores prior title', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(doc, { groups: [makeGroup('g1')], bricks: [] }, 'Hello');
    const um = makeUndoManager(doc);

    setTitleInDoc(doc, 'World');
    expect(projectDocToCanvas(doc).title).toBe('World');

    um.undo();
    expect(projectDocToCanvas(doc).title).toBe('Hello');
  });

  test('per-client isolation: doc1 only undoes doc1 ops, not doc2 ops', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    seedDocFromCanvas(doc1, { groups: [makeGroup('g1')], bricks: [] }, 'T');
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));

    const um1 = makeUndoManager(doc1);

    addBrickToDoc(doc1, makeBrick('b1-from-1', 'g1'));
    addBrickToDoc(doc2, makeBrick('b2-from-2', 'g1'));

    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2));

    expect(projectDocToCanvas(doc1).bricks).toHaveLength(2);
    expect(projectDocToCanvas(doc2).bricks).toHaveLength(2);

    expect(um1.undoStack.length).toBe(1);

    um1.undo();
    const after = projectDocToCanvas(doc1).bricks;
    expect(after).toHaveLength(1);
    expect(after[0]?.id).toBe('b2-from-2');
  });

  test('undoing an op on a remotely-deleted brick is a silent no-op', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    seedDocFromCanvas(doc1, { groups: [makeGroup('g1')], bricks: [] }, 'T');
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));

    const um1 = makeUndoManager(doc1);

    addBrickToDoc(doc1, makeBrick('b1', 'g1'));
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));
    deleteBrickFromDoc(doc2, 'b1');
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2));

    expect(projectDocToCanvas(doc1).bricks).toHaveLength(0);

    expect(() => um1.undo()).not.toThrow();
    expect(projectDocToCanvas(doc1).bricks).toHaveLength(0);
  });

  test('capture window groups closely-spaced ops; stopCapturing forces a boundary', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(
      doc,
      { groups: [makeGroup('g1')], bricks: [makeBrick('b1', 'g1', { x: 0 })] },
      'T',
    );
    const um = makeUndoManager(doc);

    updateBrickInDoc(doc, 'b1', { x: 100 });
    updateBrickInDoc(doc, 'b1', { x: 200 });
    expect(um.undoStack.length).toBe(1);

    um.stopCapturing();
    updateBrickInDoc(doc, 'b1', { x: 300 });
    expect(um.undoStack.length).toBe(2);

    um.undo();
    expect(projectDocToCanvas(doc).bricks[0]?.x).toBe(200);
    um.undo();
    expect(projectDocToCanvas(doc).bricks[0]?.x).toBe(0);
  });

  test('seedDocFromCanvas does not enter the undo stack', () => {
    const doc = new Y.Doc();
    const um = makeUndoManager(doc);
    seedDocFromCanvas(
      doc,
      { groups: [makeGroup('g1')], bricks: [makeBrick('b1', 'g1')] },
      'Hello',
    );

    expect(um.undoStack.length).toBe(0);
    expect(projectDocToCanvas(doc).bricks).toHaveLength(1);
  });

  test('addGroupToDoc is undoable', () => {
    const doc = new Y.Doc();
    seedDocFromCanvas(doc, { groups: [makeGroup('g1')], bricks: [] }, 'T');
    const um = makeUndoManager(doc);

    addGroupToDoc(doc, makeGroup('g2', 'Second'));
    expect(projectDocToCanvas(doc).groups).toHaveLength(2);
    um.undo();
    expect(projectDocToCanvas(doc).groups).toHaveLength(1);
  });
});
