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

import {
  addBrickToDoc,
  addGroupToDoc,
  deleteBrickFromDoc,
  deleteGroupFromDoc,
  moveBrickInDoc,
  moveGroupInDoc,
  renameGroupInDoc,
  setBrickVisibleInDoc,
  setGroupCollapsedInDoc,
  setGroupVisibleInDoc,
  setTitleInDoc,
  updateBrickInDoc,
  YJS_LOCAL_ORIGIN,
} from '@/lib/yjs/canvas-codec';

import { useAutosave, type SaveStatus } from './useAutosave';
import { useModelRealtime, type ModelRealtimePayload } from './useModelRealtime';
import { useYjsBinding, type PresenceSelf, type YjsConnectionStatus } from './useYjsBinding';
import { useYjsToken } from './useYjsToken';
import { useYjsUndoManager } from './useYjsUndoManager';

import type { Awareness } from 'y-protocols/awareness';
import type Konva from 'konva';

export interface BrickInstance {
  id: string;
  groupId: string;
  code: string;
  image: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  visible: boolean;
}

export interface LayerGroup {
  id: string;
  name: string;
  collapsed: boolean;
  visible: boolean;
}

export interface InitialBuilderState {
  modelId: string;
  title: string;
  canvasState: { groups: LayerGroup[]; bricks: BrickInstance[] };
}

export const MIN_PIECE_SIZE = 16;
export const MAX_PIECE_SIZE = 2000;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.25;

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialGroup(name = 'Untitled'): LayerGroup {
  return { id: makeId('g'), name, collapsed: false, visible: true };
}

function nextUntitledName(groups: LayerGroup[]): string {
  const taken = new Set(groups.map((g) => g.name));
  if (!taken.has('Untitled')) return 'Untitled';
  for (let i = 2; i < 1000; i++) {
    const candidate = `Untitled ${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `Untitled ${Date.now()}`;
}

interface BuilderData {
  groups: LayerGroup[];
  bricks: BrickInstance[];
  activeGroupId: string;
  selectedId: string | null;
}

interface ToastState {
  id: number;
  message: string;
}

interface View {
  pan: { x: number; y: number };
  zoom: number;
}

export interface BuilderState {
  modelId: string | null;
  readOnly: boolean;
  title: string;
  setTitle: (t: string) => void;
  groups: LayerGroup[];
  bricks: BrickInstance[];
  activeGroupId: string;
  selectedId: string | null;

  view: View;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  zoomBy: (factor: number, anchor: { x: number; y: number }) => void;

  selectBrick: (id: string | null) => void;
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
  deleteBrick: (id: string) => void;
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

function makeInitialData(): BuilderData {
  const g = createInitialGroup();
  return { groups: [g], bricks: [], activeGroupId: g.id, selectedId: null };
}

function findGroupInsertionEnd(
  bricks: BrickInstance[],
  groups: LayerGroup[],
  groupId: string,
): number {
  // Return the index just after the last brick that belongs to `groupId`, which
  // equals the index of the first brick belonging to any group that comes
  // *after* `groupId` in the panel order. If none, append to the end.
  const gi = groups.findIndex((g) => g.id === groupId);
  if (gi < 0) return bricks.length;
  for (let i = gi + 1; i < groups.length; i++) {
    const g = groups[i];
    if (!g) continue;
    const nextIdx = bricks.findIndex((b) => b.groupId === g.id);
    if (nextIdx >= 0) return nextIdx;
  }
  return bricks.length;
}

function findGroupInsertionStart(
  bricks: BrickInstance[],
  groups: LayerGroup[],
  groupId: string,
): number {
  // Index of the first brick of this group, or the position where it would
  // start (= end of the previous non-empty group's run, == start of next
  // group's run if this one is empty).
  const firstIdx = bricks.findIndex((b) => b.groupId === groupId);
  if (firstIdx >= 0) return firstIdx;
  return findGroupInsertionEnd(bricks, groups, groupId);
}

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
        selectedId: null,
      };
    }
    if (initial && initial.canvasState.groups.length > 0) {
      const firstGroupId = initial.canvasState.groups[0]!.id;
      return {
        groups: initial.canvasState.groups,
        bricks: initial.canvasState.bricks,
        activeGroupId: firstGroupId,
        selectedId: null,
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

  const awarenessStateRef = useRef<{
    cursor: { x: number; y: number } | null;
    selectedBrickId: string | null;
    lastUndoAnnouncement: { ts: number; kind: 'undo' | 'redo' } | null;
  }>({ cursor: null, selectedBrickId: null, lastUndoAnnouncement: null });

  const publishAwareness = useCallback(() => {
    if (!awareness || !self) return;
    awareness.setLocalStateField('user', {
      userId: self.userId,
      displayName: self.displayName,
      avatarUrl: self.avatarUrl,
      cursor: awarenessStateRef.current.cursor,
      selectedBrickId: awarenessStateRef.current.selectedBrickId,
      lastUndoAnnouncement: awarenessStateRef.current.lastUndoAnnouncement,
    });
  }, [awareness, self]);

  const publishCursor = useCallback(
    (worldX: number, worldY: number) => {
      awarenessStateRef.current.cursor = { x: worldX, y: worldY };
      publishAwareness();
    },
    [publishAwareness],
  );

  const clearCursor = useCallback(() => {
    awarenessStateRef.current.cursor = null;
    publishAwareness();
  }, [publishAwareness]);

  useEffect(() => {
    awarenessStateRef.current.selectedBrickId = data.selectedId;
    publishAwareness();
  }, [data.selectedId, publishAwareness]);

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
        selectedId: null,
      };
    });
  }, []);

  useModelRealtime(modelId, liveReadOnly, applyRemotePayload);

  // Mirror the latest selection into a ref so useYjsUndoManager can
  // snapshot it onto each stack item without re-binding when selection
  // changes.
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = data.selectedId;
  }, [data.selectedId]);

  const restoreSelection = useCallback((id: string | null) => {
    setData((d) => (d.selectedId === id ? d : { ...d, selectedId: id }));
  }, []);

  const announceUndo = useCallback(
    (kind: 'undo' | 'redo') => {
      awarenessStateRef.current.lastUndoAnnouncement = { ts: Date.now(), kind };
      publishAwareness();
    },
    [publishAwareness],
  );

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
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show a transient toast when a peer broadcasts an undo/redo via
  // awareness. Dedupe by (clientId, ts) and ignore stale announcements
  // (>10s) so a peer joining mid-session doesn't see history replay.
  const lastSeenAnnouncementRef = useRef<Map<number, number>>(new Map());
  useEffect(() => {
    if (!awareness || selfClientId === null) return undefined;
    const onChange = (): void => {
      const states = awareness.getStates() as Map<
        number,
        {
          user?: {
            displayName?: string;
            lastUndoAnnouncement?: { ts: number; kind: 'undo' | 'redo' } | null;
          };
        }
      >;
      const now = Date.now();
      for (const [clientId, state] of states) {
        if (clientId === selfClientId) continue;
        const ann = state.user?.lastUndoAnnouncement;
        if (!ann) continue;
        if (now - ann.ts > 10_000) continue;
        const lastSeen = lastSeenAnnouncementRef.current.get(clientId) ?? 0;
        if (ann.ts <= lastSeen) continue;
        lastSeenAnnouncementRef.current.set(clientId, ann.ts);
        const name = state.user?.displayName?.trim() || 'A teammate';
        const verb = ann.kind === 'undo' ? 'undid' : 'redid';
        setToast({ id: ann.ts, message: `${name} ${verb} a change` });
      }
    };
    awareness.on('change', onChange);
    return () => awareness.off('change', onChange);
  }, [awareness, selfClientId]);

  const captureFnRef = useRef<(() => Promise<Blob | null>) | null>(null);
  // Whether the canvas has changed since the last successful thumbnail upload.
  // Set on every content edit, cleared after a capture lands. Drives the
  // capture-on-leave effect so the card thumbnail tracks the user's latest work
  // instead of a single early frame.
  const thumbnailDirtyRef = useRef(false);
  // Guards against a hide and an unmount both firing a capture at once.
  const thumbnailCaptureInFlightRef = useRef(false);
  // First run of the dirty-tracking effect is the initial hydration, not an
  // edit — skip it so a freshly opened design isn't marked dirty.
  const thumbnailInitialRef = useRef(true);

  const registerThumbnailCapture = useCallback((fn: (() => Promise<Blob | null>) | null) => {
    captureFnRef.current = fn;
  }, []);

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

  const captureAndUploadThumbnail = useCallback(async (): Promise<void> => {
    if (!modelId) return;
    if (thumbnailCaptureInFlightRef.current) return;
    const fn = captureFnRef.current;
    if (!fn) return;
    thumbnailCaptureInFlightRef.current = true;
    try {
      const blob = await fn();
      if (!blob) return;
      const fd = new FormData();
      fd.append('file', blob, 'thumbnail.png');
      const res = await fetch(`/api/models/${modelId}/thumbnail`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error(`thumbnail POST ${res.status}`);
      thumbnailDirtyRef.current = false;
    } catch (err) {
      console.error('thumbnail upload failed', err);
    } finally {
      thumbnailCaptureInFlightRef.current = false;
    }
  }, [modelId]);

  useEffect(() => {
    if (autosave.status !== 'dirty' && autosave.status !== 'saving') return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [autosave.status]);

  // Mark the thumbnail stale whenever the canvas content changes. The first
  // run is initial hydration, not an edit, so it's skipped. Live mode is
  // excluded — the Yjs worker owns the canvas projection (and thumbnails)
  // there, and read-only views never produce thumbnails.
  useEffect(() => {
    if (liveMode || readOnly) return;
    if (thumbnailInitialRef.current) {
      thumbnailInitialRef.current = false;
      return;
    }
    thumbnailDirtyRef.current = true;
  }, [data.groups, data.bricks, liveMode, readOnly]);

  // Capture a fresh thumbnail when the user leaves the design — either by
  // hiding/closing the tab (visibilitychange → hidden, which fires before
  // unload and survives long enough for the request in the common cases) or by
  // navigating away within the app (effect cleanup on unmount). Both are
  // gated on the dirty flag so an unchanged canvas costs nothing, and the
  // in-flight guard keeps a hide+unmount pair from double-uploading.
  useEffect(() => {
    if (liveMode || readOnly) return;
    function maybeCapture() {
      if (!thumbnailDirtyRef.current) return;
      void captureAndUploadThumbnail();
    }
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') maybeCapture();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      maybeCapture();
    };
  }, [liveMode, readOnly, captureAndUploadThumbnail]);

  const zoomBy = useCallback((factor: number, anchor: { x: number; y: number }) => {
    setZoom((prevZoom) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom * factor));
      if (next === prevZoom) return prevZoom;
      const applied = next / prevZoom;
      setPan((p) => ({
        x: anchor.x - (anchor.x - p.x) * applied,
        y: anchor.y - (anchor.y - p.y) * applied,
      }));
      return next;
    });
  }, []);

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

  const selectBrick = useCallback((id: string | null) => {
    setData((d) => (d.selectedId === id ? d : { ...d, selectedId: id }));
  }, []);

  const setActiveGroup = useCallback(
    (id: string) => {
      setData((d) => {
        const groupsList = liveSnapshot ? liveSnapshot.groups : d.groups;
        if (d.activeGroupId === id || !groupsList.some((g) => g.id === id)) {
          return d;
        }
        return { ...d, activeGroupId: id };
      });
    },
    [liveSnapshot],
  );

  const addGroup = useCallback((): string => {
    const id = makeId('g');
    if (liveMode && liveDoc) {
      const newGroup: LayerGroup = {
        id,
        name: nextUntitledName(effectiveGroups),
        collapsed: false,
        visible: true,
      };
      addGroupToDoc(liveDoc, newGroup);
      setData((d) => ({ ...d, activeGroupId: id }));
      return id;
    }
    setData((d) => {
      const newGroup: LayerGroup = {
        id,
        name: nextUntitledName(d.groups),
        collapsed: false,
        visible: true,
      };
      return {
        ...d,
        groups: [newGroup, ...d.groups],
        activeGroupId: id,
      };
    });
    return id;
  }, [liveMode, liveDoc, effectiveGroups]);

  const renameGroup = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim() || 'Untitled';
      if (liveMode && liveDoc) {
        renameGroupInDoc(liveDoc, id, trimmed);
        return;
      }
      setData((d) => ({
        ...d,
        groups: d.groups.map((g) => (g.id === id ? { ...g, name: trimmed } : g)),
      }));
    },
    [liveMode, liveDoc],
  );

  const deleteGroup = useCallback(
    (id: string) => {
      if (liveMode && liveDoc) {
        deleteGroupFromDoc(liveDoc, id);
        // Update selection/active locally; codec already removed associated bricks.
        setData((d) => {
          const stillSelected =
            d.selectedId !== null &&
            effectiveBricks.some((b) => b.id === d.selectedId && b.groupId !== id);
          return {
            ...d,
            selectedId: stillSelected ? d.selectedId : null,
            activeGroupId:
              d.activeGroupId === id
                ? (effectiveGroups.find((g) => g.id !== id)?.id ?? d.activeGroupId)
                : d.activeGroupId,
          };
        });
        return;
      }
      setData((d) => {
        let newGroups = d.groups.filter((g) => g.id !== id);
        if (newGroups.length === 0) newGroups = [createInitialGroup()];
        const newBricks = d.bricks.filter((b) => b.groupId !== id);
        const selectedStillExists =
          d.selectedId !== null && newBricks.some((b) => b.id === d.selectedId);
        const fallbackActive = newGroups[0]?.id ?? d.activeGroupId;
        return {
          groups: newGroups,
          bricks: newBricks,
          activeGroupId: d.activeGroupId === id ? fallbackActive : d.activeGroupId,
          selectedId: selectedStillExists ? d.selectedId : null,
        };
      });
    },
    [liveMode, liveDoc, effectiveBricks, effectiveGroups],
  );

  const toggleGroupVisible = useCallback(
    (id: string) => {
      if (liveMode && liveDoc) {
        const current = effectiveGroups.find((g) => g.id === id);
        if (!current) return;
        setGroupVisibleInDoc(liveDoc, id, !current.visible);
        return;
      }
      setData((d) => ({
        ...d,
        groups: d.groups.map((g) => (g.id === id ? { ...g, visible: !g.visible } : g)),
      }));
    },
    [liveMode, liveDoc, effectiveGroups],
  );

  const toggleGroupCollapsed = useCallback(
    (id: string) => {
      if (liveMode && liveDoc) {
        const current = effectiveGroups.find((g) => g.id === id);
        if (!current) return;
        setGroupCollapsedInDoc(liveDoc, id, !current.collapsed);
        return;
      }
      setData((d) => ({
        ...d,
        groups: d.groups.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)),
      }));
    },
    [liveMode, liveDoc, effectiveGroups],
  );

  const moveGroup = useCallback(
    (id: string, toIndex: number) => {
      if (liveMode && liveDoc) {
        moveGroupInDoc(liveDoc, id, toIndex);
        return;
      }
      setData((d) => {
        const idx = d.groups.findIndex((g) => g.id === id);
        if (idx < 0) return d;
        const newGroups = [...d.groups];
        const moved = newGroups.splice(idx, 1)[0];
        if (!moved) return d;
        const clamped = Math.max(0, Math.min(newGroups.length, toIndex));
        if (clamped === idx) return d;
        newGroups.splice(clamped, 0, moved);

        const order = new Map<string, number>();
        newGroups.forEach((g, i) => order.set(g.id, i));
        const indexed = d.bricks.map((b, i) => ({
          b,
          gi: order.get(b.groupId) ?? 0,
          i,
        }));
        indexed.sort((a, c) => (a.gi !== c.gi ? a.gi - c.gi : a.i - c.i));
        const newBricks = indexed.map((x) => x.b);
        return { ...d, groups: newGroups, bricks: newBricks };
      });
    },
    [liveMode, liveDoc],
  );

  const addBrick = useCallback(
    (brick: BrickInstance) => {
      if (liveMode && liveDoc) {
        if (!effectiveGroups.some((g) => g.id === brick.groupId)) return;
        addBrickToDoc(liveDoc, brick);
        return;
      }
      setData((d) => {
        if (!d.groups.some((g) => g.id === brick.groupId)) return d;
        const insertIdx = findGroupInsertionStart(d.bricks, d.groups, brick.groupId);
        const newBricks = [...d.bricks.slice(0, insertIdx), brick, ...d.bricks.slice(insertIdx)];
        return { ...d, bricks: newBricks };
      });
    },
    [liveMode, liveDoc, effectiveGroups],
  );

  const appendImportedBricks = useCallback(
    (canvas: { groups: LayerGroup[]; bricks: BrickInstance[] }) => {
      if (canvas.groups.length === 0 && canvas.bricks.length === 0) return;
      if (liveMode && liveDoc) {
        liveDoc.transact(() => {
          for (const g of canvas.groups) addGroupToDoc(liveDoc, g);
          for (const b of canvas.bricks) addBrickToDoc(liveDoc, b);
        }, YJS_LOCAL_ORIGIN);
        const firstGroupId = canvas.groups[0]?.id;
        if (firstGroupId) setData((d) => ({ ...d, activeGroupId: firstGroupId }));
        return;
      }
      setData((d) => {
        const firstGroupId = canvas.groups[0]?.id ?? d.activeGroupId;
        return {
          ...d,
          groups: [...canvas.groups, ...d.groups],
          bricks: [...d.bricks, ...canvas.bricks],
          activeGroupId: firstGroupId,
        };
      });
    },
    [liveMode, liveDoc],
  );

  const updateBrick = useCallback(
    (id: string, partial: Partial<Omit<BrickInstance, 'id' | 'groupId'>>) => {
      if (liveMode && liveDoc) {
        updateBrickInDoc(liveDoc, id, partial);
        return;
      }
      setData((d) => ({
        ...d,
        bricks: d.bricks.map((b) => (b.id === id ? { ...b, ...partial } : b)),
      }));
    },
    [liveMode, liveDoc],
  );

  const deleteBrick = useCallback(
    (id: string) => {
      if (liveMode && liveDoc) {
        deleteBrickFromDoc(liveDoc, id);
        setData((d) => (d.selectedId === id ? { ...d, selectedId: null } : d));
        return;
      }
      setData((d) => ({
        ...d,
        bricks: d.bricks.filter((b) => b.id !== id),
        selectedId: d.selectedId === id ? null : d.selectedId,
      }));
    },
    [liveMode, liveDoc],
  );

  const toggleBrickVisible = useCallback(
    (id: string) => {
      if (liveMode && liveDoc) {
        const current = effectiveBricks.find((b) => b.id === id);
        if (!current) return;
        setBrickVisibleInDoc(liveDoc, id, !current.visible);
        return;
      }
      setData((d) => ({
        ...d,
        bricks: d.bricks.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)),
      }));
    },
    [liveMode, liveDoc, effectiveBricks],
  );

  const moveBrick = useCallback(
    (brickId: string, toGroupId: string, beforeBrickId: string | null) => {
      if (liveMode && liveDoc) {
        if (!effectiveGroups.some((g) => g.id === toGroupId)) return;
        moveBrickInDoc(liveDoc, brickId, toGroupId, beforeBrickId);
        return;
      }
      setData((d) => {
        const fromIdx = d.bricks.findIndex((b) => b.id === brickId);
        if (fromIdx < 0) return d;
        if (!d.groups.some((g) => g.id === toGroupId)) return d;
        const brick = d.bricks[fromIdx];
        if (!brick) return d;
        const without = [...d.bricks.slice(0, fromIdx), ...d.bricks.slice(fromIdx + 1)];
        const updated: BrickInstance = { ...brick, groupId: toGroupId };

        let insertIdx: number;
        if (beforeBrickId && beforeBrickId !== brickId) {
          const beforeIdx = without.findIndex((b) => b.id === beforeBrickId);
          insertIdx =
            beforeIdx >= 0 ? beforeIdx : findGroupInsertionEnd(without, d.groups, toGroupId);
        } else {
          insertIdx = findGroupInsertionEnd(without, d.groups, toGroupId);
        }
        const newBricks = [...without.slice(0, insertIdx), updated, ...without.slice(insertIdx)];
        return { ...d, bricks: newBricks };
      });
    },
    [liveMode, liveDoc, effectiveGroups],
  );

  const view = useMemo<View>(() => ({ pan, zoom }), [pan, zoom]);

  const value = useMemo<BuilderState>(
    () => ({
      modelId,
      readOnly,
      title: effectiveTitle,
      setTitle: guard(setTitle, undefined),
      groups: effectiveGroups,
      bricks: effectiveBricks,
      activeGroupId: data.activeGroupId,
      selectedId: data.selectedId,
      view,
      setPan,
      setZoom,
      zoomBy,
      selectBrick,
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
      deleteBrick: guard(deleteBrick, undefined),
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
      data.selectedId,
      effectiveGroups,
      effectiveBricks,
      effectiveTitle,
      view,
      modelId,
      readOnly,
      setTitle,
      zoomBy,
      selectBrick,
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
      deleteBrick,
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
