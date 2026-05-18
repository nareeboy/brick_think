import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import * as Y from 'yjs';

import { YJS_CANVAS_MAP_NAME, addBrickToDoc } from '@/lib/yjs/canvas-codec';

import { useYjsUndoManager } from './useYjsUndoManager';

function makeBrick(id: string, groupId: string) {
  return {
    id,
    groupId,
    code: 'C1',
    image: 'brick-1.png',
    width: 80,
    height: 32,
    x: 100,
    y: 100,
    rotation: 0,
    visible: true,
  };
}

function seedMinimal(doc: Y.Doc) {
  const canvas = doc.getMap(YJS_CANVAS_MAP_NAME);
  doc.transact(() => {
    canvas.set('title', 'T');
    const groups = new Y.Array<Y.Map<unknown>>();
    canvas.set('groups', groups);
    const bricks = new Y.Array<Y.Map<unknown>>();
    canvas.set('bricks', bricks);
    const g = new Y.Map<unknown>();
    g.set('id', 'g1');
    g.set('name', 'Untitled');
    g.set('collapsed', false);
    g.set('visible', true);
    groups.push([g]);
  }, Symbol('seed'));
}

function dispatchKey(opts: {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  target?: HTMLElement;
}) {
  const event = new KeyboardEvent('keydown', {
    key: opts.key,
    metaKey: opts.meta ?? false,
    ctrlKey: opts.ctrl ?? false,
    shiftKey: opts.shift ?? false,
    bubbles: true,
    cancelable: true,
  });
  (opts.target ?? document.body).dispatchEvent(event);
  return event;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useYjsUndoManager', () => {
  test('returns inert values when doc is null', () => {
    const { result } = renderHook(() => useYjsUndoManager(null));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(() => result.current.undo()).not.toThrow();
    expect(() => result.current.redo()).not.toThrow();
  });

  test('no keydown listener is attached when doc is null', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useYjsUndoManager(null));
    const keydownCalls = addSpy.mock.calls.filter((c) => c[0] === 'keydown');
    expect(keydownCalls).toHaveLength(0);
  });

  test('Cmd+Z undoes the last local op', () => {
    const doc = new Y.Doc();
    seedMinimal(doc);
    const { result } = renderHook(() => useYjsUndoManager(doc));
    act(() => {
      addBrickToDoc(doc, makeBrick('b1', 'g1'));
    });

    const bricks = doc.getMap(YJS_CANVAS_MAP_NAME).get('bricks') as Y.Array<unknown>;
    expect(bricks.length).toBe(1);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      dispatchKey({ key: 'z', meta: true });
    });
    expect(bricks.length).toBe(0);
  });

  test('Cmd+Shift+Z redoes the last undone op', () => {
    const doc = new Y.Doc();
    seedMinimal(doc);
    const { result } = renderHook(() => useYjsUndoManager(doc));
    addBrickToDoc(doc, makeBrick('b1', 'g1'));

    act(() => {
      dispatchKey({ key: 'z', meta: true });
    });
    const bricks = doc.getMap(YJS_CANVAS_MAP_NAME).get('bricks') as Y.Array<unknown>;
    expect(bricks.length).toBe(0);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      dispatchKey({ key: 'z', meta: true, shift: true });
    });
    expect(bricks.length).toBe(1);
  });

  test('Ctrl+Y is accepted as redo (Windows convention)', () => {
    const doc = new Y.Doc();
    seedMinimal(doc);
    renderHook(() => useYjsUndoManager(doc));
    addBrickToDoc(doc, makeBrick('b1', 'g1'));

    act(() => {
      dispatchKey({ key: 'z', ctrl: true });
    });
    const bricks = doc.getMap(YJS_CANVAS_MAP_NAME).get('bricks') as Y.Array<unknown>;
    expect(bricks.length).toBe(0);

    act(() => {
      dispatchKey({ key: 'y', ctrl: true });
    });
    expect(bricks.length).toBe(1);
  });

  test('Cmd+Z is suppressed when focus is in an <input>', () => {
    const doc = new Y.Doc();
    seedMinimal(doc);
    renderHook(() => useYjsUndoManager(doc));
    addBrickToDoc(doc, makeBrick('b1', 'g1'));

    const input = document.createElement('input');
    document.body.appendChild(input);

    act(() => {
      dispatchKey({ key: 'z', meta: true, target: input });
    });
    const bricks = doc.getMap(YJS_CANVAS_MAP_NAME).get('bricks') as Y.Array<unknown>;
    expect(bricks.length).toBe(1);

    input.remove();
  });

  test('Cmd+Z is suppressed when focus is in a contentEditable element', () => {
    const doc = new Y.Doc();
    seedMinimal(doc);
    renderHook(() => useYjsUndoManager(doc));
    addBrickToDoc(doc, makeBrick('b1', 'g1'));

    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    document.body.appendChild(div);

    act(() => {
      dispatchKey({ key: 'z', meta: true, target: div });
    });
    const bricks = doc.getMap(YJS_CANVAS_MAP_NAME).get('bricks') as Y.Array<unknown>;
    expect(bricks.length).toBe(1);

    div.remove();
  });

  test('non-undo keys are ignored', () => {
    const doc = new Y.Doc();
    seedMinimal(doc);
    renderHook(() => useYjsUndoManager(doc));
    addBrickToDoc(doc, makeBrick('b1', 'g1'));

    act(() => {
      dispatchKey({ key: 'a', meta: true });
      dispatchKey({ key: 'z' });
      dispatchKey({ key: 's', meta: true });
    });
    const bricks = doc.getMap(YJS_CANVAS_MAP_NAME).get('bricks') as Y.Array<unknown>;
    expect(bricks.length).toBe(1);
  });

  test('cleanup: keydown listener is torn down on unmount', () => {
    const doc = new Y.Doc();
    seedMinimal(doc);
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useYjsUndoManager(doc));
    unmount();
    const keydownRemovals = removeSpy.mock.calls.filter((c) => c[0] === 'keydown');
    expect(keydownRemovals).toHaveLength(1);
  });

  test('canUndo / canRedo are reactive', () => {
    const doc = new Y.Doc();
    seedMinimal(doc);
    const { result } = renderHook(() => useYjsUndoManager(doc));
    expect(result.current.canUndo).toBe(false);

    act(() => {
      addBrickToDoc(doc, makeBrick('b1', 'g1'));
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  test('changing doc identity rebuilds the UndoManager and clears the stack', () => {
    const doc1 = new Y.Doc();
    seedMinimal(doc1);
    const doc2 = new Y.Doc();
    seedMinimal(doc2);

    const { result, rerender } = renderHook(({ d }: { d: Y.Doc | null }) => useYjsUndoManager(d), {
      initialProps: { d: doc1 as Y.Doc | null },
    });
    act(() => {
      addBrickToDoc(doc1, makeBrick('b1', 'g1'));
    });
    expect(result.current.canUndo).toBe(true);

    rerender({ d: doc2 as Y.Doc | null });
    expect(result.current.canUndo).toBe(false);
  });
});
