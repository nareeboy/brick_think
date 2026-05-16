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
} from '@/lib/yjs/canvas-codec';

import { useAutosave, type SaveStatus } from './useAutosave';
import {
  useYjsBinding,
  type PresenceSelf,
  type YjsConnectionStatus,
} from './useYjsBinding';
import { useYjsToken } from './useYjsToken';

import type { Awareness } from 'y-protocols/awareness';

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
  updateBrick: (
    id: string,
    partial: Partial<Omit<BrickInstance, 'id' | 'groupId'>>,
  ) => void;
  deleteBrick: (id: string) => void;
  toggleBrickVisible: (id: string) => void;
  moveBrick: (
    brickId: string,
    toGroupId: string,
    beforeBrickId: string | null,
  ) => void;

  toast: ToastState | null;
  dismissToast: () => void;

  saveStatus: SaveStatus;
  savedAtServer: number | null;
  retrySave: () => void;
  registerThumbnailCapture: (fn: (() => Promise<Blob | null>) | null) => void;
  captureAndUploadThumbnail: () => Promise<void>;
  liveMode: boolean;
  connectionStatus: YjsConnectionStatus | null;
  awareness: Awareness | null;
  selfClientId: number | null;
  publishCursor: (worldX: number, worldY: number) => void;
  clearCursor: () => void;
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
  self = null,
  children,
}: {
  initial?: InitialBuilderState;
  readOnly?: boolean;
  liveMode?: boolean;
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
  const [title, setTitleLocal] = useState<string>(
    initial?.title ?? 'Untitled model',
  );
  const modelId = initial?.modelId ?? null;

  const wsBaseUrl =
    process.env.NEXT_PUBLIC_YJS_WS_URL ?? 'ws://localhost:1234/yjs';
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

  const publishCursor = useCallback(
    (worldX: number, worldY: number) => {
      if (!awareness || !self) return;
      awareness.setLocalStateField('user', {
        userId: self.userId,
        displayName: self.displayName,
        avatarUrl: self.avatarUrl,
        cursor: { x: worldX, y: worldY },
      });
    },
    [awareness, self],
  );
  const clearCursor = useCallback(() => {
    if (!awareness || !self) return;
    awareness.setLocalStateField('user', {
      userId: self.userId,
      displayName: self.displayName,
      avatarUrl: self.avatarUrl,
      cursor: null,
    });
  }, [awareness, self]);
  const liveSnapshot = liveMode ? yjs.snapshot : null;
  const liveDoc = liveMode ? yjs.doc : null;
  const effectiveGroups = liveSnapshot?.groups ?? data.groups;
  const effectiveBricks = liveSnapshot?.bricks ?? data.bricks;
  const effectiveTitle = liveSnapshot?.title ?? title;

  // Keep activeGroupId valid against the effective groups list (in live mode
  // groups can mutate from peer updates, so the locally-stored activeGroupId
  // may go stale).
  useEffect(() => {
    if (!liveMode) return;
    setData((d) => {
      const stillExists = effectiveGroups.some(
        (g) => g.id === d.activeGroupId,
      );
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

  const captureFnRef = useRef<(() => Promise<Blob | null>) | null>(null);
  const hasCapturedThisSession = useRef(false);
  const prevAutosaveStatusRef = useRef<SaveStatus>('idle');

  const registerThumbnailCapture = useCallback(
    (fn: (() => Promise<Blob | null>) | null) => {
      captureFnRef.current = fn;
    },
    [],
  );

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
    const fn = captureFnRef.current;
    if (!fn) return;
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
    } catch (err) {
      console.error('thumbnail upload failed', err);
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

  useEffect(() => {
    const prev = prevAutosaveStatusRef.current;
    prevAutosaveStatusRef.current = autosave.status;
    if (liveMode) return;
    if (hasCapturedThisSession.current) return;
    if (prev !== 'saving' || autosave.status !== 'saved') return;
    if (!captureFnRef.current) return;
    hasCapturedThisSession.current = true;
    void captureAndUploadThumbnail();
  }, [autosave.status, captureAndUploadThumbnail, liveMode]);

  const zoomBy = useCallback(
    (factor: number, anchor: { x: number; y: number }) => {
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
    },
    [],
  );

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
            effectiveBricks.some(
              (b) => b.id === d.selectedId && b.groupId !== id,
            );
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
          activeGroupId:
            d.activeGroupId === id ? fallbackActive : d.activeGroupId,
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
        groups: d.groups.map((g) =>
          g.id === id ? { ...g, visible: !g.visible } : g,
        ),
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
        groups: d.groups.map((g) =>
          g.id === id ? { ...g, collapsed: !g.collapsed } : g,
        ),
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
        const newBricks = [
          ...d.bricks.slice(0, insertIdx),
          brick,
          ...d.bricks.slice(insertIdx),
        ];
        return { ...d, bricks: newBricks };
      });
    },
    [liveMode, liveDoc, effectiveGroups],
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
        bricks: d.bricks.map((b) =>
          b.id === id ? { ...b, visible: !b.visible } : b,
        ),
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
        const without = [
          ...d.bricks.slice(0, fromIdx),
          ...d.bricks.slice(fromIdx + 1),
        ];
        const updated: BrickInstance = { ...brick, groupId: toGroupId };

        let insertIdx: number;
        if (beforeBrickId && beforeBrickId !== brickId) {
          const beforeIdx = without.findIndex((b) => b.id === beforeBrickId);
          insertIdx =
            beforeIdx >= 0
              ? beforeIdx
              : findGroupInsertionEnd(without, d.groups, toGroupId);
        } else {
          insertIdx = findGroupInsertionEnd(without, d.groups, toGroupId);
        }
        const newBricks = [
          ...without.slice(0, insertIdx),
          updated,
          ...without.slice(insertIdx),
        ];
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
      liveMode,
      connectionStatus: liveMode ? yjs.connectionStatus : null,
      awareness: liveMode ? awareness : null,
      selfClientId: liveMode ? selfClientId : null,
      publishCursor,
      clearCursor,
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
      liveMode,
      yjs.connectionStatus,
      awareness,
      selfClientId,
      publishCursor,
      clearCursor,
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
