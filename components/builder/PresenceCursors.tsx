'use client';

import { useEffect, useRef, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';

import { colorForUser } from '@/lib/yjs/presence-colors';

const IDLE_THRESHOLD_MS = 10_000;
const IDLE_TICK_MS = 2_000;

interface PresenceUserState {
  user?: {
    userId?: string;
    displayName?: string;
    avatarUrl?: string | null;
    cursor?: { x: number; y: number } | null;
  };
}

interface PresencePeer {
  clientId: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
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
  const lastMoveAtRef = useRef<Map<number, number>>(new Map());
  const lastCursorRef = useRef<Map<number, string>>(new Map());
  const [, tick] = useState(0);

  useEffect(() => {
    if (!awareness) return undefined;
    const update = (): void => {
      const next: PresencePeer[] = [];
      const states = awareness.getStates() as Map<number, PresenceUserState>;
      const aliveIds = new Set<number>();
      for (const [clientId, state] of states) {
        if (clientId === selfClientId) continue;
        const u = state.user;
        if (!u || !u.userId || !u.cursor) continue;
        aliveIds.add(clientId);
        const cursorKey = `${u.cursor.x},${u.cursor.y}`;
        const prev = lastCursorRef.current.get(clientId);
        if (prev !== cursorKey) {
          lastCursorRef.current.set(clientId, cursorKey);
          lastMoveAtRef.current.set(clientId, Date.now());
        }
        next.push({
          clientId,
          userId: u.userId,
          displayName: u.displayName ?? '',
          avatarUrl: u.avatarUrl ?? null,
          cursor: u.cursor,
        });
      }
      // Drop trackers for peers that have left.
      for (const id of lastMoveAtRef.current.keys()) {
        if (!aliveIds.has(id)) {
          lastMoveAtRef.current.delete(id);
          lastCursorRef.current.delete(id);
        }
      }
      setPeers(next);
    };
    update();
    awareness.on('change', update);
    return () => awareness.off('change', update);
  }, [awareness, selfClientId]);

  // Re-evaluate idle opacity on a 2s tick when there's at least one peer.
  useEffect(() => {
    if (peers.length === 0) return undefined;
    const id = setInterval(() => tick((n) => n + 1), IDLE_TICK_MS);
    return () => clearInterval(id);
  }, [peers.length]);

  const now = Date.now();

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {peers.map((p) => {
        const color = colorForUser(p.userId);
        const left = p.cursor.x * zoom + pan.x;
        const top = p.cursor.y * zoom + pan.y;
        const lastMoveAt = lastMoveAtRef.current.get(p.clientId) ?? now;
        const idle = now - lastMoveAt > IDLE_THRESHOLD_MS;
        return (
          <div
            key={p.clientId}
            data-testid={`presence-cursor-${p.userId}`}
            aria-hidden="true"
            className="absolute"
            style={{
              left,
              top,
              opacity: idle ? 0.3 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            <PeerAvatar
              userId={p.userId}
              displayName={p.displayName}
              avatarUrl={p.avatarUrl}
              color={color}
            />
            <PeerNameChip
              userId={p.userId}
              displayName={p.displayName}
              color={color}
            />
          </div>
        );
      })}
    </div>
  );
}

function PeerAvatar({
  userId,
  displayName,
  avatarUrl,
  color,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  color: string;
}) {
  const initial = displayName.trim().charAt(0).toUpperCase();
  const centered: React.CSSProperties = {
    transform: 'translate(-50%, -50%)',
  };
  if (avatarUrl) {
    return (
      <span
        className="absolute left-0 top-0 inline-flex h-[22px] w-[22px] overflow-hidden rounded-full"
        style={{
          ...centered,
          boxShadow: `0 0 0 2px ${color}, 0 1px 3px rgba(0,0,0,0.18)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
    );
  }
  return (
    <span
      className="absolute left-0 top-0 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{
        ...centered,
        background: color,
        boxShadow: '0 0 0 1.5px #FAF7F1, 0 1px 3px rgba(0,0,0,0.18)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {initial ? (
        <span data-testid={`presence-initial-${userId}`}>{initial}</span>
      ) : (
        <PersonGlyph userId={userId} />
      )}
    </span>
  );
}

function PeerNameChip({
  userId,
  displayName,
  color,
}: {
  userId: string;
  displayName: string;
  color: string;
}) {
  return (
    <span
      data-testid={`presence-name-${userId}`}
      className="absolute left-0 top-0 inline-block max-w-[12ch] truncate rounded-full px-[7px] py-[3px] text-[11px] font-semibold text-white"
      style={{
        background: color,
        transform: 'translate(8px, 6px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {displayName}
    </span>
  );
}

function PersonGlyph({ userId }: { userId: string }) {
  return (
    <svg
      data-testid={`presence-glyph-${userId}`}
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
