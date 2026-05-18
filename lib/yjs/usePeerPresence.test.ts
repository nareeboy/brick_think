// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Awareness } from 'y-protocols/awareness';

import { usePeerPresence } from './usePeerPresence';

interface PeerUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  cursor: { x: number; y: number } | null;
  selectedBrickId: string | null;
}

function makeMockAwareness(peers: Map<number, { user: PeerUser }>): {
  awareness: Awareness;
  notify: () => void;
} {
  const listeners = new Set<() => void>();
  const mock = {
    getStates: () => peers,
    on: (_evt: string, cb: () => void) => {
      listeners.add(cb);
    },
    off: (_evt: string, cb: () => void) => {
      listeners.delete(cb);
    },
    clientID: 1,
  };
  return {
    awareness: mock as unknown as Awareness,
    notify: () => listeners.forEach((cb) => cb()),
  };
}

const SELF = { userId: 'u-self', displayName: 'Me', avatarUrl: null };

describe('usePeerPresence', () => {
  it('places self first when self is provided', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        2,
        {
          user: {
            userId: 'u-a',
            displayName: 'Alice',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: null,
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    const { result } = renderHook(() => usePeerPresence(awareness, 1, SELF));
    expect(result.current.peers.map((p) => p.userId)).toEqual(['u-self', 'u-a']);
    expect(result.current.peers[0]!.isSelf).toBe(true);
  });

  it('excludes selfClientId from the peers list (no double-count)', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        1,
        {
          user: {
            userId: 'u-self',
            displayName: 'Me',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: null,
          },
        },
      ],
      [
        2,
        {
          user: {
            userId: 'u-a',
            displayName: 'Alice',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: null,
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    const { result } = renderHook(() => usePeerPresence(awareness, 1, SELF));
    expect(result.current.peers.filter((p) => p.userId === 'u-self')).toHaveLength(1);
  });

  it('sorts peers (excluding self) by displayName ascending', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        2,
        {
          user: {
            userId: 'u-c',
            displayName: 'Carol',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: null,
          },
        },
      ],
      [
        3,
        {
          user: {
            userId: 'u-a',
            displayName: 'Alice',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: null,
          },
        },
      ],
      [
        4,
        {
          user: {
            userId: 'u-b',
            displayName: 'Bob',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: null,
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    const { result } = renderHook(() => usePeerPresence(awareness, 1, SELF));
    expect(result.current.peers.map((p) => p.userId)).toEqual(['u-self', 'u-a', 'u-b', 'u-c']);
  });

  it('groups peer selections by brick id, excluding self', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        1,
        {
          user: {
            userId: 'u-self',
            displayName: 'Me',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: 'brick-X',
          },
        },
      ],
      [
        2,
        {
          user: {
            userId: 'u-a',
            displayName: 'Alice',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: 'brick-X',
          },
        },
      ],
      [
        3,
        {
          user: {
            userId: 'u-b',
            displayName: 'Bob',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: 'brick-Y',
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    const { result } = renderHook(() => usePeerPresence(awareness, 1, SELF));
    const onX = result.current.selectionsByBrick.get('brick-X') ?? [];
    expect(onX.map((p) => p.userId)).toEqual(['u-a']);
    expect(result.current.selectionsByBrick.get('brick-Y')?.[0]?.userId).toBe('u-b');
  });

  it('stacks selectionsByBrick entries in clientId ascending order', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        5,
        {
          user: {
            userId: 'u-late',
            displayName: 'Late',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: 'X',
          },
        },
      ],
      [
        2,
        {
          user: {
            userId: 'u-early',
            displayName: 'Early',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: 'X',
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    const { result } = renderHook(() => usePeerPresence(awareness, 1, SELF));
    const onX = result.current.selectionsByBrick.get('X')!;
    expect(onX.map((p) => p.clientId)).toEqual([2, 5]);
  });

  it('re-derives when awareness emits change', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        2,
        {
          user: {
            userId: 'u-a',
            displayName: 'Alice',
            avatarUrl: null,
            cursor: null,
            selectedBrickId: null,
          },
        },
      ],
    ]);
    const { awareness, notify } = makeMockAwareness(peers);
    const { result } = renderHook(() => usePeerPresence(awareness, 1, SELF));
    expect(result.current.selectionsByBrick.size).toBe(0);

    peers.set(2, {
      user: {
        userId: 'u-a',
        displayName: 'Alice',
        avatarUrl: null,
        cursor: null,
        selectedBrickId: 'brick-Z',
      },
    });
    act(() => {
      notify();
    });
    expect(result.current.selectionsByBrick.get('brick-Z')?.length).toBe(1);
  });

  it('returns just self when awareness is null', () => {
    const { result } = renderHook(() => usePeerPresence(null, null, SELF));
    expect(result.current.peers.map((p) => p.userId)).toEqual(['u-self']);
    expect(result.current.selectionsByBrick.size).toBe(0);
  });

  it('returns empty when awareness and self are both null', () => {
    const { result } = renderHook(() => usePeerPresence(null, null, null));
    expect(result.current.peers).toEqual([]);
    expect(result.current.selectionsByBrick.size).toBe(0);
  });
});
