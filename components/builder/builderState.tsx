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

  savedAt: number | null;
  hasSavedVersion: boolean;
  save: () => void;
  rollback: () => void;
  toast: ToastState | null;
  dismissToast: () => void;
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

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BuilderData>(makeInitialData);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [snapshot, setSnapshot] = useState<{
    groups: LayerGroup[];
    bricks: BrickInstance[];
  } | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const showToast = useCallback((message: string) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, message });
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

  const setActiveGroup = useCallback((id: string) => {
    setData((d) =>
      d.activeGroupId === id || !d.groups.some((g) => g.id === id)
        ? d
        : { ...d, activeGroupId: id },
    );
  }, []);

  const addGroup = useCallback((): string => {
    const id = makeId('g');
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
  }, []);

  const renameGroup = useCallback((id: string, name: string) => {
    const trimmed = name.trim() || 'Untitled';
    setData((d) => ({
      ...d,
      groups: d.groups.map((g) => (g.id === id ? { ...g, name: trimmed } : g)),
    }));
  }, []);

  const deleteGroup = useCallback((id: string) => {
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
  }, []);

  const toggleGroupVisible = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      groups: d.groups.map((g) =>
        g.id === id ? { ...g, visible: !g.visible } : g,
      ),
    }));
  }, []);

  const toggleGroupCollapsed = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      groups: d.groups.map((g) =>
        g.id === id ? { ...g, collapsed: !g.collapsed } : g,
      ),
    }));
  }, []);

  const moveGroup = useCallback((id: string, toIndex: number) => {
    setData((d) => {
      const idx = d.groups.findIndex((g) => g.id === id);
      if (idx < 0) return d;
      const newGroups = [...d.groups];
      const moved = newGroups.splice(idx, 1)[0];
      if (!moved) return d;
      const clamped = Math.max(0, Math.min(newGroups.length, toIndex));
      if (clamped === idx) return d;
      newGroups.splice(clamped, 0, moved);

      // Re-sort bricks so the invariant "bricks grouped by groupId in groups
      // order, preserving prior in-group order" holds.
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
  }, []);

  const addBrick = useCallback((brick: BrickInstance) => {
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
  }, []);

  const updateBrick = useCallback(
    (id: string, partial: Partial<Omit<BrickInstance, 'id' | 'groupId'>>) => {
      setData((d) => ({
        ...d,
        bricks: d.bricks.map((b) => (b.id === id ? { ...b, ...partial } : b)),
      }));
    },
    [],
  );

  const deleteBrick = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      bricks: d.bricks.filter((b) => b.id !== id),
      selectedId: d.selectedId === id ? null : d.selectedId,
    }));
  }, []);

  const toggleBrickVisible = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      bricks: d.bricks.map((b) =>
        b.id === id ? { ...b, visible: !b.visible } : b,
      ),
    }));
  }, []);

  const moveBrick = useCallback(
    (brickId: string, toGroupId: string, beforeBrickId: string | null) => {
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
    [],
  );

  const save = useCallback(() => {
    setSnapshot({
      groups: data.groups.map((g) => ({ ...g })),
      bricks: data.bricks.map((b) => ({ ...b })),
    });
    setSavedAt(Date.now());
    showToast('Build saved to canvas');
  }, [data.groups, data.bricks, showToast]);

  const rollback = useCallback(() => {
    if (!snapshot) return;
    setData((d) => {
      const restoredGroups = snapshot.groups.map((g) => ({ ...g }));
      const restoredBricks = snapshot.bricks.map((b) => ({ ...b }));
      const activeStillValid = restoredGroups.some(
        (g) => g.id === d.activeGroupId,
      );
      const selectedStillValid =
        d.selectedId !== null &&
        restoredBricks.some((b) => b.id === d.selectedId);
      return {
        groups: restoredGroups,
        bricks: restoredBricks,
        activeGroupId: activeStillValid
          ? d.activeGroupId
          : restoredGroups[0]?.id ?? d.activeGroupId,
        selectedId: selectedStillValid ? d.selectedId : null,
      };
    });
  }, [snapshot]);

  const view = useMemo<View>(() => ({ pan, zoom }), [pan, zoom]);

  const value = useMemo<BuilderState>(
    () => ({
      groups: data.groups,
      bricks: data.bricks,
      activeGroupId: data.activeGroupId,
      selectedId: data.selectedId,
      view,
      setPan,
      setZoom,
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
      savedAt,
      hasSavedVersion: snapshot !== null,
      save,
      rollback,
      toast,
      dismissToast,
    }),
    [
      data,
      view,
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
      savedAt,
      snapshot,
      save,
      rollback,
      toast,
      dismissToast,
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
