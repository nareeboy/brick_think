'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { Awareness } from 'y-protocols/awareness';

import type { PresenceSelf } from './useYjsBinding';
import type { ToastState } from './builderCore';

// Live-mode presence over the Yjs awareness protocol: publishes this client's
// cursor / first-selected-brick / undo announcements, and watches peers'
// undo announcements to surface a toast.
//
// The awareness protocol stays singular: peers see the first selected brick.
// Widening it to the whole selection is a protocol change for usePeerPresence
// consumers — deliberate follow-up, not done here.
export function useBuilderAwareness({
  awareness,
  self,
  selfClientId,
  firstSelectedId,
  onPeerUndoToast,
}: {
  awareness: Awareness | null;
  self: PresenceSelf | null;
  selfClientId: number | null;
  firstSelectedId: string | null;
  /** Called with a ToastState when a peer broadcasts an undo/redo. Must be
   *  referentially stable (a useState setter qualifies). */
  onPeerUndoToast: (toast: ToastState) => void;
}): {
  publishCursor: (worldX: number, worldY: number) => void;
  clearCursor: () => void;
  announceUndo: (kind: 'undo' | 'redo') => void;
} {
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

  const announceUndo = useCallback(
    (kind: 'undo' | 'redo') => {
      awarenessStateRef.current.lastUndoAnnouncement = { ts: Date.now(), kind };
      publishAwareness();
    },
    [publishAwareness],
  );

  useEffect(() => {
    awarenessStateRef.current.selectedBrickId = firstSelectedId;
    publishAwareness();
  }, [firstSelectedId, publishAwareness]);

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
        onPeerUndoToast({ id: ann.ts, message: `${name} ${verb} a change` });
      }
    };
    awareness.on('change', onChange);
    return () => awareness.off('change', onChange);
  }, [awareness, selfClientId, onPeerUndoToast]);

  return { publishCursor, clearCursor, announceUndo };
}
