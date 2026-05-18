'use client';

import { useEffect, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';

import { colorForUser } from './presence-colors';

export interface PresenceSelf {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface PeerSummary {
  clientId: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  color: string;
  isSelf: boolean;
  selectedBrickId: string | null;
}

export interface UsePeerPresenceResult {
  peers: PeerSummary[];
  selectionsByBrick: Map<string, PeerSummary[]>;
}

export interface UndoAnnouncement {
  ts: number;
  kind: 'undo' | 'redo';
}

interface AwarenessUser {
  userId?: string;
  displayName?: string;
  avatarUrl?: string | null;
  selectedBrickId?: string | null;
  lastUndoAnnouncement?: UndoAnnouncement | null;
}

interface AwarenessState {
  user?: AwarenessUser;
}

function deriveFromAwareness(
  awareness: Awareness | null,
  selfClientId: number | null,
  self: PresenceSelf | null,
): UsePeerPresenceResult {
  const peerEntries: PeerSummary[] = [];
  const selectionsByBrick = new Map<string, PeerSummary[]>();

  if (awareness) {
    const states = awareness.getStates() as Map<number, AwarenessState>;
    for (const [clientId, state] of states) {
      if (selfClientId !== null && clientId === selfClientId) continue;
      const u = state.user;
      if (!u || !u.userId) continue;
      const peer: PeerSummary = {
        clientId,
        userId: u.userId,
        displayName: u.displayName ?? '',
        avatarUrl: u.avatarUrl ?? null,
        color: colorForUser(u.userId),
        isSelf: false,
        selectedBrickId: u.selectedBrickId ?? null,
      };
      peerEntries.push(peer);
      if (peer.selectedBrickId) {
        const bucket = selectionsByBrick.get(peer.selectedBrickId) ?? [];
        bucket.push(peer);
        selectionsByBrick.set(peer.selectedBrickId, bucket);
      }
    }
  }

  peerEntries.sort((a, b) => a.displayName.localeCompare(b.displayName));

  const peers: PeerSummary[] = [];
  if (self) {
    peers.push({
      clientId: selfClientId ?? -1,
      userId: self.userId,
      displayName: self.displayName,
      avatarUrl: self.avatarUrl,
      color: colorForUser(self.userId),
      isSelf: true,
      selectedBrickId: null,
    });
  }
  peers.push(...peerEntries);

  for (const bucket of selectionsByBrick.values()) {
    bucket.sort((a, b) => a.clientId - b.clientId);
  }

  return { peers, selectionsByBrick };
}

export function usePeerPresence(
  awareness: Awareness | null,
  selfClientId: number | null,
  self: PresenceSelf | null,
): UsePeerPresenceResult {
  const [snapshot, setSnapshot] = useState<UsePeerPresenceResult>(() =>
    deriveFromAwareness(awareness, selfClientId, self),
  );

  useEffect(() => {
    setSnapshot(deriveFromAwareness(awareness, selfClientId, self));
    if (!awareness) return undefined;
    const update = (): void => {
      setSnapshot(deriveFromAwareness(awareness, selfClientId, self));
    };
    awareness.on('change', update);
    return () => awareness.off('change', update);
  }, [awareness, selfClientId, self]);

  return snapshot;
}
