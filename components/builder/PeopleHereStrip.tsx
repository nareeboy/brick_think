'use client';

import type { PeerSummary } from '@/lib/yjs/usePeerPresence';

const MAX_VISIBLE = 5;

interface Props {
  peers: PeerSummary[];
  /**
   * Distance in px from the canvas right edge. CanvasStage computes this from
   * the visible chrome layout so the strip sits just left of whatever button
   * is leftmost (Notes pill / Export / Share / Pieces).
   */
  rightPx?: number;
}

export function PeopleHereStrip({ peers, rightPx = 16 }: Props) {
  if (peers.length === 0) return null;

  const visible = peers.slice(0, MAX_VISIBLE);
  const hidden = peers.slice(MAX_VISIBLE);
  const overflowCount = hidden.length;

  return (
    <div
      data-testid="people-here-strip"
      style={{ right: rightPx }}
      className="pointer-events-none absolute top-[25px] z-30 inline-flex items-center gap-0 rounded-full border border-zinc-900/10 bg-white/95 px-2 py-1.5 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.18)] backdrop-blur"
    >
      {visible.map((p, i) => (
        <PeerAvatar peer={p} stackIndex={i} key={p.clientId} />
      ))}
      {overflowCount > 0 ? (
        <span
          data-testid="people-here-overflow"
          title={hidden.map((p) => p.displayName).join(', ')}
          className="ml-1.5 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-zinc-100 px-1.5 text-[11px] font-semibold text-zinc-700"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          +{overflowCount}
        </span>
      ) : null}
    </div>
  );
}

function PeerAvatar({ peer, stackIndex }: { peer: PeerSummary; stackIndex: number }) {
  const initial = peer.displayName.trim().charAt(0).toUpperCase();
  const marginLeft = stackIndex === 0 ? 0 : -6;
  if (peer.avatarUrl) {
    return (
      <span
        data-testid={`people-here-avatar-${peer.clientId}`}
        title={peer.displayName}
        className="inline-flex h-[22px] w-[22px] overflow-hidden rounded-full"
        style={{
          marginLeft,
          boxShadow: `0 0 0 2px ${peer.color}, 0 0 0 3px #fff`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={peer.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
      </span>
    );
  }
  return (
    <span
      data-testid={`people-here-avatar-${peer.clientId}`}
      title={peer.displayName}
      className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{
        marginLeft,
        background: peer.color,
        boxShadow: '0 0 0 2px #fff',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {initial ? <span data-testid={`people-here-initial-${peer.clientId}`}>{initial}</span> : null}
    </span>
  );
}
