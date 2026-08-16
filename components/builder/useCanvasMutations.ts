'use client';

import { useCallback } from 'react';

import type * as Y from 'yjs';

import {
  addBrickToDoc,
  addGroupToDoc,
  deleteBrickFromDoc,
  deleteBricksFromDoc,
  deleteGroupFromDoc,
  moveBrickInDoc,
  moveGroupInDoc,
  renameGroupInDoc,
  reorderBricksInDoc,
  setBrickVisibleInDoc,
  setGroupCollapsedInDoc,
  setGroupVisibleInDoc,
  updateBrickInDoc,
  updateBricksInDoc,
  YJS_LOCAL_ORIGIN,
} from '@/lib/yjs/canvas-codec';

import { reorderBricksWithinGroups, type ReorderDirection } from '@/lib/canvas/reorder';

import {
  createInitialGroup,
  findGroupInsertionEnd,
  findGroupInsertionStart,
  makeId,
  nextUntitledName,
  type BrickInstance,
  type BuilderData,
  type LayerGroup,
} from './builderCore';

export interface CanvasMutations {
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
}

// Every selection / group / brick write the builder exposes. Each mutation
// routes to the Y.Doc in live mode (the codec mirrors it back through the
// snapshot) and to local setData otherwise. Moved verbatim from the provider;
// read-only guarding stays in the provider's `guard` wrapper.
export function useCanvasMutations({
  setData,
  liveMode,
  liveDoc,
  effectiveGroups,
  effectiveBricks,
  liveSnapshotGroups,
}: {
  setData: React.Dispatch<React.SetStateAction<BuilderData>>;
  liveMode: boolean;
  liveDoc: Y.Doc | null;
  effectiveGroups: LayerGroup[];
  effectiveBricks: BrickInstance[];
  /** The live snapshot's groups, or null when no snapshot exists (also null
   *  outside live mode) — setActiveGroup validates against these when
   *  present, else the local data's groups. */
  liveSnapshotGroups: LayerGroup[] | null;
}): CanvasMutations {
  const selectBrick = useCallback(
    (id: string | null) => {
      setData((d) => {
        const next = id === null ? [] : [id];
        if (d.selectedIds.length === next.length && d.selectedIds[0] === next[0]) return d;
        return { ...d, selectedIds: next };
      });
    },
    [setData],
  );

  const toggleBrickSelected = useCallback(
    (id: string) => {
      setData((d) => ({
        ...d,
        selectedIds: d.selectedIds.includes(id)
          ? d.selectedIds.filter((s) => s !== id)
          : [...d.selectedIds, id],
      }));
    },
    [setData],
  );

  const selectBricks = useCallback(
    (ids: string[]) => {
      setData((d) => {
        if (d.selectedIds.length === ids.length && d.selectedIds.every((s, i) => s === ids[i])) {
          return d;
        }
        return { ...d, selectedIds: [...ids] };
      });
    },
    [setData],
  );

  const setActiveGroup = useCallback(
    (id: string) => {
      setData((d) => {
        const groupsList = liveSnapshotGroups ?? d.groups;
        if (d.activeGroupId === id || !groupsList.some((g) => g.id === id)) {
          return d;
        }
        return { ...d, activeGroupId: id };
      });
    },
    [setData, liveSnapshotGroups],
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
  }, [setData, liveMode, liveDoc, effectiveGroups]);

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
    [setData, liveMode, liveDoc],
  );

  const deleteGroup = useCallback(
    (id: string) => {
      if (liveMode && liveDoc) {
        deleteGroupFromDoc(liveDoc, id);
        // Update selection/active locally; codec already removed associated bricks.
        setData((d) => {
          const surviving = d.selectedIds.filter((s) =>
            effectiveBricks.some((b) => b.id === s && b.groupId !== id),
          );
          return {
            ...d,
            selectedIds: surviving,
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
        const fallbackActive = newGroups[0]?.id ?? d.activeGroupId;
        return {
          groups: newGroups,
          bricks: newBricks,
          activeGroupId: d.activeGroupId === id ? fallbackActive : d.activeGroupId,
          selectedIds: d.selectedIds.filter((s) => newBricks.some((b) => b.id === s)),
        };
      });
    },
    [setData, liveMode, liveDoc, effectiveBricks, effectiveGroups],
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
    [setData, liveMode, liveDoc, effectiveGroups],
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
    [setData, liveMode, liveDoc, effectiveGroups],
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
    [setData, liveMode, liveDoc],
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
    [setData, liveMode, liveDoc, effectiveGroups],
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
    [setData, liveMode, liveDoc],
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
    [setData, liveMode, liveDoc],
  );

  // Batched variant for group moves: one setData locally / one Yjs
  // transaction in live mode, so a multi-selection drag is a single
  // autosave payload change and a single undo step.
  const updateBricks = useCallback(
    (updates: Array<{ id: string; changes: Partial<Omit<BrickInstance, 'id' | 'groupId'>> }>) => {
      if (updates.length === 0) return;
      if (liveMode && liveDoc) {
        updateBricksInDoc(liveDoc, updates);
        return;
      }
      setData((d) => {
        const byId = new Map(updates.map((u) => [u.id, u.changes]));
        return {
          ...d,
          bricks: d.bricks.map((b) => {
            const changes = byId.get(b.id);
            return changes ? { ...b, ...changes } : b;
          }),
        };
      });
    },
    [setData, liveMode, liveDoc],
  );

  // Toggle the horizontal mirror per brick; batched so a multi-selection
  // flip is one autosave payload change / one undo step.
  const flipBricksHorizontal = useCallback(
    (ids: string[]) => {
      const updates = ids.flatMap((id) => {
        const b = effectiveBricks.find((x) => x.id === id);
        return b ? [{ id, changes: { flippedX: !b.flippedX } }] : [];
      });
      updateBricks(updates);
    },
    [effectiveBricks, updateBricks],
  );

  const reorderBricks = useCallback(
    (ids: string[], direction: ReorderDirection) => {
      if (liveMode && liveDoc) {
        const next = reorderBricksWithinGroups(effectiveBricks, ids, direction);
        if (!next) return;
        const selected = new Set(ids);
        const groupIds = new Set(
          effectiveBricks.filter((b) => selected.has(b.id)).map((b) => b.groupId),
        );
        reorderBricksInDoc(
          liveDoc,
          Array.from(groupIds, (groupId) => ({
            groupId,
            orderedIds: next.filter((b) => b.groupId === groupId).map((b) => b.id),
          })),
        );
        return;
      }
      setData((d) => {
        const next = reorderBricksWithinGroups(d.bricks, ids, direction);
        return next ? { ...d, bricks: next } : d;
      });
    },
    [setData, liveMode, liveDoc, effectiveBricks],
  );

  const renameBrick = useCallback(
    (id: string, name: string) => {
      updateBrick(id, { name: name.trim() });
    },
    [updateBrick],
  );

  const deleteBrick = useCallback(
    (id: string) => {
      if (liveMode && liveDoc) {
        deleteBrickFromDoc(liveDoc, id);
        setData((d) =>
          d.selectedIds.includes(id)
            ? { ...d, selectedIds: d.selectedIds.filter((s) => s !== id) }
            : d,
        );
        return;
      }
      setData((d) => ({
        ...d,
        bricks: d.bricks.filter((b) => b.id !== id),
        selectedIds: d.selectedIds.filter((s) => s !== id),
      }));
    },
    [setData, liveMode, liveDoc],
  );

  const deleteBricks = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const remove = new Set(ids);
      if (liveMode && liveDoc) {
        deleteBricksFromDoc(liveDoc, ids);
        setData((d) =>
          d.selectedIds.some((s) => remove.has(s))
            ? { ...d, selectedIds: d.selectedIds.filter((s) => !remove.has(s)) }
            : d,
        );
        return;
      }
      setData((d) => ({
        ...d,
        bricks: d.bricks.filter((b) => !remove.has(b.id)),
        selectedIds: d.selectedIds.filter((s) => !remove.has(s)),
      }));
    },
    [setData, liveMode, liveDoc],
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
    [setData, liveMode, liveDoc, effectiveBricks],
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
    [setData, liveMode, liveDoc, effectiveGroups],
  );

  return {
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
  };
}
