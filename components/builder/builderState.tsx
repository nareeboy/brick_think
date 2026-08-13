'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { setTitleInDoc } from '@/lib/yjs/canvas-codec';

import type { ReorderDirection } from '@/lib/canvas/reorder';

import {
  createInitialGroup,
  makeId,
  makeInitialData,
  type BrickInstance,
  type BuilderData,
  type InitialBuilderState,
  type LayerGroup,
  type ToastState,
  type View,
} from './builderCore';
import { useAutosave, type SaveStatus } from './useAutosave';
import { useBuilderAwareness } from './useBuilderAwareness';
import { useBuilderView } from './useBuilderView';
import { useCanvasMutations } from './useCanvasMutations';
import { useModelRealtime, type ModelRealtimePayload } from './useModelRealtime';
import { useThumbnailCapture } from './useThumbnailCapture';
import { useYjsBinding, type PresenceSelf, type YjsConnectionStatus } from './useYjsBinding';
import { useYjsToken } from './useYjsToken';
import { useYjsUndoManager } from './useYjsUndoManager';

import type { Awareness } from 'y-protocols/awareness';
import type Konva from 'konva';

// Types, constants, and pure helpers live in builderCore.ts; the state
// machinery is split across useBuilderView (pan/zoom), useCanvasMutations
// (every selection/group/brick write), useBuilderAwareness (live-mode
// presence + peer-undo toasts), and useThumbnailCapture (design-card
// thumbnail pipeline). This file assembles them into the provider and owns
// what genuinely spans those concerns: the local data state, the Yjs
// binding/undo wiring, autosave, toast display, and the context value.
// Public API (BuilderState, useBuilderState, the re-exports below) is
// unchanged.
export {
  MAX_PIECE_SIZE,
  MAX_ZOOM,
  MIN_PIECE_SIZE,
  MIN_ZOOM,
  THUMBNAIL_CAPTURE_DEBOUNCE_MS,
  ZOOM_STEP,
} from './builderCore';
export type { BrickInstance, InitialBuilderState, LayerGroup } from './builderCore';

export interface BuilderState {
  modelId: string | null;
  readOnly: boolean;
  title: string;
  setTitle: (t: string) => void;
  groups: LayerGroup[];
  bricks: BrickInstance[];
  activeGroupId: string;
  selectedId: string | null;
  selectedIds: string[];

  view: View;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  zoomBy: (factor: number, anchor: { x: number; y: number }) => void;

  selectBrick: (id: string | null) => void;
  toggleBrickSelected: (id: string) => void;
  selectBricks: (ids: string[]) => void;
  setActiveGroup: (id: string) => void;

  addGroup: () => string;
  renameGroup: (id: string, name: string) => void;
  deleteGroup: (id: string) => void;
  toggleGroupVisible: (id: string) => void;
  toggleGroupCollapsed: (id: string) => void;
  moveGroup: (id: string, toIndex: number) => void;

  addBrick: (brick: BrickInstance) => void;
  appendImportedBricks: (canvas: { groups: LayerGroup[]; bricks: BrickInstance[] }) => void;
  updateBrick: (id: string, partial: Partial<Omit<BrickInstance, 'id' | 'groupId'>>) => void;
  updateBricks: (
    updates: Array<{ id: string; changes: Partial<Omit<BrickInstance, 'id' | 'groupId'>> }>,
  ) => void;
  flipBricksHorizontal: (ids: string[]) => void;
  reorderBricks: (ids: string[], direction: ReorderDirection) => void;
  renameBrick: (id: string, name: string) => void;
  deleteBrick: (id: string) => void;
  deleteBricks: (ids: string[]) => void;
  toggleBrickVisible: (id: string) => void;
  moveBrick: (brickId: string, toGroupId: string, beforeBrickId: string | null) => void;

  toast: ToastState | null;
  dismissToast: () => void;

  saveStatus: SaveStatus;
  savedAtServer: number | null;
  retrySave: () => void;
  registerThumbnailCapture: (fn: (() => Promise<Blob | null>) | null) => void;
  captureAndUploadThumbnail: () => Promise<void>;
  stage: Konva.Stage | null;
  registerStage: (stage: Konva.Stage | null) => void;
  liveMode: boolean;
  connectionStatus: YjsConnectionStatus | null;
  awareness: Awareness | null;
  selfClientId: number | null;
  self: PresenceSelf | null;
  publishCursor: (worldX: number, worldY: number) => void;
  clearCursor: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Ctx = createContext<BuilderState | null>(null);

export function BuilderProvider({
  initial,
  readOnly = false,
  liveMode = false,
  sessionId = null,
  self = null,
  children,
}: {
  initial?: InitialBuilderState;
  readOnly?: boolean;
  liveMode?: boolean;
  sessionId?: string | null;
  self?: PresenceSelf | null;
  children: ReactNode;
}) {
  // The live-mode seed mirrors `makeInitialData()` semantics: a freshly
  // opened model has at least one group so the first dropped brick lands
  // somewhere. The same seed feeds both the local `data` state's
  // activeGroupId and the Y.Doc seed, so the local and live group ids match.
  const liveSeedRef = useRef<{
    groups: LayerGroup[];
    bricks: BrickInstance[];
  } | null>(null);
  if (liveSeedRef.current === null) {
    const incoming = initial?.canvasState ?? { groups: [], bricks: [] };
    if (incoming.groups.length === 0) {
      liveSeedRef.current = {
        groups: [createInitialGroup()],
        bricks: [],
      };
    } else {
      liveSeedRef.current = incoming;
    }
  }

  const [data, setData] = useState<BuilderData>(() => {
    if (liveMode) {
      const firstGroupId = liveSeedRef.current!.groups[0]!.id;
      return {
        groups: liveSeedRef.current!.groups,
        bricks: liveSeedRef.current!.bricks,
        activeGroupId: firstGroupId,
        selectedIds: [],
      };
    }
    if (initial && initial.canvasState.groups.length > 0) {
      const firstGroupId = initial.canvasState.groups[0]!.id;
      return {
        groups: initial.canvasState.groups,
        bricks: initial.canvasState.bricks,
        activeGroupId: firstGroupId,
        selectedIds: [],
      };
    }
    return makeInitialData();
  });
  const [title, setTitleLocal] = useState<string>(initial?.title ?? 'Untitled model');
  const modelId = initial?.modelId ?? null;

  const wsBaseUrl = process.env.NEXT_PUBLIC_YJS_WS_URL ?? 'ws://localhost:1234/yjs';
  const tokenResult = useYjsToken(liveMode && modelId ? modelId : null);
  const yjs = useYjsBinding({
    modelId: liveMode && modelId ? modelId : '',
    initialCanvasState: liveSeedRef.current,
    initialTitle: initial?.title ?? 'Untitled model',
    token: liveMode ? tokenResult.token : null,
    wsBaseUrl,
    self: liveMode ? self : null,
  });
  const awareness = yjs.provider?.awareness ?? null;
  const selfClientId = awareness?.clientID ?? null;

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The awareness protocol stays singular: peers see the first selected
  // brick (see useBuilderAwareness).
  const firstSelectedId = data.selectedIds[0] ?? null;
  const { publishCursor, clearCursor, announceUndo } = useBuilderAwareness({
    awareness,
    self,
    selfClientId,
    firstSelectedId,
    onPeerUndoToast: setToast,
  });

  const liveSnapshot = liveMode ? yjs.snapshot : null;
  const liveDoc = liveMode ? yjs.doc : null;

  const liveReadOnly = readOnly && !liveMode && sessionId !== null && modelId !== null;

  const applyRemotePayload = useCallback((payload: ModelRealtimePayload) => {
    // Replace local state from the remote canonical row. Selection is cleared
    // because the brick it pointed at may have moved or vanished.
    const cs =
      (payload.canvas_state as { groups?: LayerGroup[]; bricks?: BrickInstance[] } | null) ?? null;
    const nextGroups = cs?.groups ?? [];
    const nextBricks = cs?.bricks ?? [];
    setTitleLocal(payload.title);
    setData((d) => {
      const stillExists = nextGroups.some((g) => g.id === d.activeGroupId);
      const fallback = nextGroups[0]?.id ?? d.activeGroupId;
      return {
        groups: nextGroups,
        bricks: nextBricks,
        activeGroupId: stillExists ? d.activeGroupId : fallback,
        selectedIds: [],
      };
    });
  }, []);

  useModelRealtime(modelId, liveReadOnly, applyRemotePayload);

  // Mirror the latest selection into a ref so useYjsUndoManager can
  // snapshot it onto each stack item without re-binding when selection
  // changes.
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = firstSelectedId;
  }, [firstSelectedId]);

  const restoreSelection = useCallback((id: string | null) => {
    setData((d) => {
      const next = id === null ? [] : [id];
      if (d.selectedIds.length === next.length && d.selectedIds[0] === next[0]) return d;
      return { ...d, selectedIds: next };
    });
  }, []);

  const undoManager = useYjsUndoManager(liveMode && !readOnly ? liveDoc : null, {
    selectionRef: selectedIdRef,
    restoreSelection,
    onPopped: announceUndo,
  });
  const effectiveGroups = liveSnapshot?.groups ?? data.groups;
  const effectiveBricks = liveSnapshot?.bricks ?? data.bricks;
  const effectiveTitle = liveSnapshot?.title ?? title;

  // Keep activeGroupId valid against the effective groups list (in live mode
  // groups can mutate from peer updates, so the locally-stored activeGroupId
  // may go stale).
  useEffect(() => {
    if (!liveMode) return;
    setData((d) => {
      const stillExists = effectiveGroups.some((g) => g.id === d.activeGroupId);
      if (stillExists) return d;
      const fallback = effectiveGroups[0]?.id ?? d.activeGroupId;
      return d.activeGroupId === fallback ? d : { ...d, activeGroupId: fallback };
    });
  }, [liveMode, effectiveGroups]);

  const setTitle = useCallback(
    (next: string) => {
      if (liveMode && liveDoc) {
        setTitleInDoc(liveDoc, next);
        return;
      }
      setTitleLocal(next);
    },
    [liveMode, liveDoc],
  );

  const { view, setPan, setZoom, zoomBy } = useBuilderView();

  const {
    selectBrick,
    toggleBrickSelected,
    selectBricks,
    setActiveGroup,
    addGroup,
    renameGroup,
    deleteGroup,
    toggleGroupVisible,
    toggleGroupCollapsed,
    moveGroup,
    addBrick,
    appendImportedBricks,
    updateBrick,
    updateBricks,
    flipBricksHorizontal,
    reorderBricks,
    renameBrick,
    deleteBrick,
    deleteBricks,
    toggleBrickVisible,
    moveBrick,
  } = useCanvasMutations({
    setData,
    liveMode,
    liveDoc,
    effectiveGroups,
    effectiveBricks,
    liveSnapshotGroups: liveSnapshot?.groups ?? null,
  });

  const { registerThumbnailCapture, captureAndUploadThumbnail } = useThumbnailCapture({
    modelId,
    liveMode,
    readOnly,
    groups: data.groups,
    bricks: data.bricks,
  });

  // Konva.Stage reference, registered by BuilderCanvas on mount so the
  // ExportMenu can drive PNG capture off the live canvas (Builder mode).
  const [stage, setStage] = useState<Konva.Stage | null>(null);
  const registerStage = useCallback((next: Konva.Stage | null) => {
    setStage(next);
  }, []);

  function guard<Args extends unknown[], R>(
    fn: (...args: Args) => R,
    fallback: R,
  ): (...args: Args) => R {
    return (...args) => (readOnly ? fallback : fn(...args));
  }

  const autosavePayload = useMemo(
    () => ({
      title,
      canvas_state: {
        groups: data.groups,
        bricks: data.bricks,
      },
    }),
    [title, data.groups, data.bricks],
  );

  const autosave = useAutosave({
    modelId,
    payload: autosavePayload,
    // In live mode, the Yjs worker is the sole writer for both
    // yjs_documents.state and models.canvas_state — autosave must not fight it.
    disabled: readOnly || liveMode,
  });

  useEffect(() => {
    if (autosave.status !== 'dirty' && autosave.status !== 'saving') return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [autosave.status]);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => (t && t.id === toast.id ? null : t));
    }, 2800);
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [toast]);

  const value = useMemo<BuilderState>(
    () => ({
      modelId,
      readOnly,
      title: effectiveTitle,
      setTitle: guard(setTitle, undefined),
      groups: effectiveGroups,
      bricks: effectiveBricks,
      activeGroupId: data.activeGroupId,
      selectedId: firstSelectedId,
      selectedIds: data.selectedIds,
      view,
      setPan,
      setZoom,
      zoomBy,
      selectBrick,
      toggleBrickSelected,
      selectBricks,
      setActiveGroup,
      addGroup: guard(addGroup, ''),
      renameGroup: guard(renameGroup, undefined),
      deleteGroup: guard(deleteGroup, undefined),
      toggleGroupVisible: guard(toggleGroupVisible, undefined),
      toggleGroupCollapsed: guard(toggleGroupCollapsed, undefined),
      moveGroup: guard(moveGroup, undefined),
      addBrick: guard(addBrick, undefined),
      appendImportedBricks: guard(appendImportedBricks, undefined),
      updateBrick: guard(updateBrick, undefined),
      updateBricks: guard(updateBricks, undefined),
      flipBricksHorizontal: guard(flipBricksHorizontal, undefined),
      reorderBricks: guard(reorderBricks, undefined),
      renameBrick: guard(renameBrick, undefined),
      deleteBrick: guard(deleteBrick, undefined),
      deleteBricks: guard(deleteBricks, undefined),
      toggleBrickVisible: guard(toggleBrickVisible, undefined),
      moveBrick: guard(moveBrick, undefined),
      toast,
      dismissToast,
      saveStatus: autosave.status,
      savedAtServer: autosave.lastSavedAt,
      retrySave: autosave.retry,
      registerThumbnailCapture,
      captureAndUploadThumbnail,
      stage,
      registerStage,
      liveMode,
      connectionStatus: liveMode ? yjs.connectionStatus : null,
      awareness: liveMode ? awareness : null,
      selfClientId: liveMode ? selfClientId : null,
      self: liveMode ? (self ?? null) : null,
      publishCursor,
      clearCursor,
      undo: undoManager.undo,
      redo: undoManager.redo,
      canUndo: undoManager.canUndo,
      canRedo: undoManager.canRedo,
    }),
    // `guard` closes over `readOnly`, which IS listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      data.activeGroupId,
      data.selectedIds,
      firstSelectedId,
      effectiveGroups,
      effectiveBricks,
      effectiveTitle,
      view,
      modelId,
      readOnly,
      setTitle,
      zoomBy,
      selectBrick,
      toggleBrickSelected,
      selectBricks,
      setActiveGroup,
      addGroup,
      renameGroup,
      deleteGroup,
      toggleGroupVisible,
      toggleGroupCollapsed,
      moveGroup,
      addBrick,
      appendImportedBricks,
      updateBrick,
      updateBricks,
      flipBricksHorizontal,
      reorderBricks,
      renameBrick,
      deleteBrick,
      deleteBricks,
      toggleBrickVisible,
      moveBrick,
      toast,
      dismissToast,
      autosave.status,
      autosave.lastSavedAt,
      autosave.retry,
      registerThumbnailCapture,
      captureAndUploadThumbnail,
      stage,
      registerStage,
      liveMode,
      yjs.connectionStatus,
      awareness,
      selfClientId,
      self,
      publishCursor,
      clearCursor,
      undoManager.undo,
      undoManager.redo,
      undoManager.canUndo,
      undoManager.canRedo,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBuilderState(): BuilderState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBuilderState must be used inside <BuilderProvider>');
  return ctx;
}

export function makeBrickId(): string {
  return makeId('b');
}

export function useRelativeTime(timestamp: number | null): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timestamp === null) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timestamp]);

  if (timestamp === null) return null;
  const delta = Math.max(0, now - timestamp);
  const s = Math.floor(delta / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
