'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';

import { YJS_CANVAS_MAP_NAME, YJS_LOCAL_ORIGIN } from '@/lib/yjs/canvas-codec';

export interface UseYjsUndoManagerResult {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

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
export function useYjsUndoManager(doc: Y.Doc | null): UseYjsUndoManagerResult {
  const managerRef = useRef<Y.UndoManager | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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
    setCanUndo(manager.undoStack.length > 0);
    setCanRedo(manager.redoStack.length > 0);

    const onStackChange = () => {
      setCanUndo(manager.undoStack.length > 0);
      setCanRedo(manager.redoStack.length > 0);
    };
    manager.on('stack-item-added', onStackChange);
    manager.on('stack-item-popped', onStackChange);
    manager.on('stack-cleared', onStackChange);

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
      manager.off('stack-item-added', onStackChange);
      manager.off('stack-item-popped', onStackChange);
      manager.off('stack-cleared', onStackChange);
      manager.destroy();
      managerRef.current = null;
    };
  }, [doc]);

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
