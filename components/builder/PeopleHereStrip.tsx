'use client';

import type { PeerSummary } from '@/lib/yjs/usePeerPresence';

const MAX_VISIBLE = 5;

export function PeopleHereStrip({ peers }: { peers: PeerSummary[] }) {
  if (peers.length === 0) return null;

  const visible = peers.slice(0, MAX_VISIBLE);
  const hidden = peers.slice(MAX_VISIBLE);
  const overflowCount = hidden.length;

  return (
    <div
      data-testid="people-here-strip"
      className="pointer-events-none absolute right-4 top-4 z-20 inline-flex items-center gap-0 rounded-full border border-zinc-900/10 bg-white/95 px-2 py-1.5 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.18)] backdrop-blur"
    >
      {visible.map((p, i) => (
        <PeerAvatar peer={p} stackIndex={i} key={p.userId} />
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
        data-testid={`people-here-avatar-${peer.userId}`}
        title={peer.displayName}
        className="inline-flex h-[22px] w-[22px] overflow-hidden rounded-full"
        style={{
          marginLeft,
          boxShadow: `0 0 0 2px ${peer.color}, 0 0 0 3px #fff`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={peer.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
    );
  }
  return (
    <span
      data-testid={`people-here-avatar-${peer.userId}`}
      title={peer.displayName}
      className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{
        marginLeft,
        background: peer.color,
        boxShadow: '0 0 0 2px #fff',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {initial ? (
        <span data-testid={`people-here-initial-${peer.userId}`}>{initial}</span>
      ) : null}
    </span>
  );
}
