'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';

import { track } from '@/lib/telemetry/track';
import { YJS_CANVAS_MAP_NAME, YJS_LOCAL_ORIGIN } from '@/lib/yjs/canvas-codec';

export interface UseYjsUndoManagerResult {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export interface UseYjsUndoManagerOptions {
  // Read the current local selection at stack-item-added time so we can
  // restore it on undo. A ref (rather than a value) avoids re-binding
  // the UndoManager on every selection change.
  selectionRef?: React.RefObject<string | null>;
  // Called on stack-item-popped with the snapshot from stackItem.meta.
  restoreSelection?: (id: string | null) => void;
  // Called on stack-item-popped (undo or redo). Used to publish an
  // awareness announcement so peers can render a "X undid a change"
  // toast.
  onPopped?: (kind: 'undo' | 'redo') => void;
  // Called once when a new UndoManager instance is constructed (and
  // again with `null` when it's destroyed). Lets callers call
  // `stopCapturing()` at save boundaries, or — in tests — hold a
  // handle for direct assertions against the stack.
  onManager?: (manager: Y.UndoManager | null) => void;
}

const MAX_UNDO_STACK = 100;
const SELECTION_META_KEY = 'selectedId';

const NOOP = () => {};
const INERT: UseYjsUndoManagerResult = {
  undo: NOOP,
  redo: NOOP,
  canUndo: false,
  canRedo: false,
};

// Owns a Y.UndoManager bound to the canvas Y.Map of `doc` and a single
// window keydown listener that fires undo (Cmd/Ctrl+Z) and redo
// (Cmd/Ctrl+Shift+Z or Ctrl+Y). When `doc` is null the hook is fully
// inert: no UndoManager, no listener, no React state churn — which is
// the regime for the autosave path and read-only share views.
//
// The text-edit guard preserves browser-native undo inside <input>,
// <textarea>, and contentEditable surfaces (e.g. the title rename
// input's in-flight draft), matching the precedent set by the
// Delete/Backspace handler in BuilderCanvas.
export function useYjsUndoManager(
  doc: Y.Doc | null,
  options: UseYjsUndoManagerOptions = {},
): UseYjsUndoManagerResult {
  const managerRef = useRef<Y.UndoManager | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Stash the latest callbacks in refs so we can change them without
  // rebuilding the UndoManager (which would wipe the history stack).
  const selectionRef = options.selectionRef;
  const restoreSelectionRef = useRef(options.restoreSelection);
  const onPoppedRef = useRef(options.onPopped);
  const onManagerRef = useRef(options.onManager);
  useEffect(() => {
    restoreSelectionRef.current = options.restoreSelection;
    onPoppedRef.current = options.onPopped;
    onManagerRef.current = options.onManager;
  }, [options.restoreSelection, options.onPopped, options.onManager]);

  useEffect(() => {
    if (!doc) {
      managerRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
      return undefined;
    }

    const canvas = doc.getMap(YJS_CANVAS_MAP_NAME);
    const manager = new Y.UndoManager(canvas, {
      trackedOrigins: new Set([YJS_LOCAL_ORIGIN]),
      captureTimeout: 500,
    });
    managerRef.current = manager;
    onManagerRef.current?.(manager);
    setCanUndo(manager.undoStack.length > 0);
    setCanRedo(manager.redoStack.length > 0);

    const onStackItemAdded = (event: { stackItem: { meta: Map<string, unknown> } }) => {
      const selected = selectionRef?.current ?? null;
      event.stackItem.meta.set(SELECTION_META_KEY, selected);
      if (manager.undoStack.length > MAX_UNDO_STACK) {
        manager.undoStack.splice(0, manager.undoStack.length - MAX_UNDO_STACK);
      }
      if (manager.redoStack.length > MAX_UNDO_STACK) {
        manager.redoStack.splice(0, manager.redoStack.length - MAX_UNDO_STACK);
      }
      setCanUndo(manager.undoStack.length > 0);
      setCanRedo(manager.redoStack.length > 0);
    };

    const onStackItemPopped = (event: {
      type: 'undo' | 'redo';
      stackItem: { meta: Map<string, unknown> };
    }) => {
      const snap = event.stackItem.meta.get(SELECTION_META_KEY) as string | null | undefined;
      if (restoreSelectionRef.current) {
        restoreSelectionRef.current(snap ?? null);
      }
      onPoppedRef.current?.(event.type);
      track(event.type === 'undo' ? 'builder.undo' : 'builder.redo', {
        stackDepth: manager.undoStack.length,
        redoDepth: manager.redoStack.length,
        hadSelectionMeta: snap !== undefined && snap !== null,
      });
      setCanUndo(manager.undoStack.length > 0);
      setCanRedo(manager.redoStack.length > 0);
    };

    const onStackCleared = () => {
      setCanUndo(manager.undoStack.length > 0);
      setCanRedo(manager.redoStack.length > 0);
    };

    manager.on('stack-item-added', onStackItemAdded);
    manager.on('stack-item-popped', onStackItemPopped);
    manager.on('stack-cleared', onStackCleared);

    function isTextEditTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent): void {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      let action: 'undo' | 'redo' | null = null;
      if (key === 'z' && !e.shiftKey) action = 'undo';
      else if (key === 'z' && e.shiftKey) action = 'redo';
      else if (key === 'y' && !e.shiftKey && e.ctrlKey) action = 'redo';
      if (!action) return;
      if (isTextEditTarget(e.target)) return;
      e.preventDefault();
      if (action === 'undo') manager.undo();
      else manager.redo();
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      manager.off('stack-item-added', onStackItemAdded);
      manager.off('stack-item-popped', onStackItemPopped);
      manager.off('stack-cleared', onStackCleared);
      manager.destroy();
      managerRef.current = null;
      onManagerRef.current?.(null);
    };
  }, [doc, selectionRef]);

  return useMemo<UseYjsUndoManagerResult>(() => {
    if (!doc) return INERT;
    return {
      undo: () => managerRef.current?.undo(),
      redo: () => managerRef.current?.redo(),
      canUndo,
      canRedo,
    };
  }, [doc, canUndo, canRedo]);
}
