'use client';

import { useEffect, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';

const PALETTE = [
  '#c0613d',
  '#5c8b9d',
  '#a3744d',
  '#7a8c5b',
  '#9b6a8c',
  '#4d6b87',
];

function colorForUser(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length]!;
}

interface PresenceUserState {
  user?: {
    userId?: string;
    displayName?: string;
    cursor?: { x: number; y: number } | null;
  };
}

interface PresencePeer {
  clientId: number;
  userId: string;
  displayName: string;
  cursor: { x: number; y: number };
}

export function PresenceCursors({
  awareness,
  selfClientId,
  pan,
  zoom,
}: {
  awareness: Awareness | null;
  selfClientId: number | null;
  pan: { x: number; y: number };
  zoom: number;
}) {
  const [peers, setPeers] = useState<PresencePeer[]>([]);

  useEffect(() => {
    if (!awareness) return undefined;
    const update = (): void => {
      const next: PresencePeer[] = [];
      const states = awareness.getStates() as Map<number, PresenceUserState>;
      for (const [clientId, state] of states) {
        if (clientId === selfClientId) continue;
        const u = state.user;
        if (!u || !u.userId || !u.cursor) continue;
        next.push({
          clientId,
          userId: u.userId,
          displayName: u.displayName ?? '',
          cursor: u.cursor,
        });
      }
      setPeers(next);
    };
    update();
    awareness.on('change', update);
    return () => awareness.off('change', update);
  }, [awareness, selfClientId]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {peers.map((p) => {
        const color = colorForUser(p.userId);
        const left = p.cursor.x * zoom + pan.x;
        const top = p.cursor.y * zoom + pan.y;
        return (
          <span
            key={p.clientId}
            aria-hidden="true"
            data-testid={`presence-cursor-${p.userId}`}
            className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
            style={{ left, top, borderColor: color, backgroundColor: `${color}33` }}
            title={p.displayName}
          />
        );
      })}
    </div>
  );
}
