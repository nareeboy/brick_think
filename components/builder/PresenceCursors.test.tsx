import { describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { PresenceCursors } from './PresenceCursors';
import type { Awareness } from 'y-protocols/awareness';

interface PeerUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  cursor: { x: number; y: number } | null;
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

const noPan = { x: 0, y: 0 };

describe('PresenceCursors', () => {
  it('renders one cursor per peer, excluding self', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        1,
        {
          user: {
            userId: 'self',
            displayName: 'Self',
            avatarUrl: null,
            cursor: { x: 0, y: 0 },
          },
        },
      ],
      [
        2,
        {
          user: {
            userId: 'u-alice',
            displayName: 'Alice',
            avatarUrl: null,
            cursor: { x: 10, y: 20 },
          },
        },
      ],
      [
        3,
        {
          user: {
            userId: 'u-bob',
            displayName: 'Bob',
            avatarUrl: null,
            cursor: { x: 30, y: 40 },
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    render(<PresenceCursors awareness={awareness} selfClientId={1} pan={noPan} zoom={1} />);
    // getByTestId throws if absent — its return value is the assertion.
    screen.getByTestId('presence-cursor-u-alice');
    screen.getByTestId('presence-cursor-u-bob');
    expect(screen.queryByTestId('presence-cursor-self')).toBeNull();
  });

  it('renders an <img> when avatarUrl is set', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        2,
        {
          user: {
            userId: 'u-photo',
            displayName: 'Photo Person',
            avatarUrl: 'https://example.com/p.png',
            cursor: { x: 0, y: 0 },
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    render(<PresenceCursors awareness={awareness} selfClientId={1} pan={noPan} zoom={1} />);
    const cursor = screen.getByTestId('presence-cursor-u-photo');
    const img = cursor.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://example.com/p.png');
  });

  it('renders the first letter of displayName when avatarUrl is null', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        2,
        {
          user: {
            userId: 'u-letter',
            displayName: 'Anika Patel',
            avatarUrl: null,
            cursor: { x: 0, y: 0 },
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    render(<PresenceCursors awareness={awareness} selfClientId={1} pan={noPan} zoom={1} />);
    expect(screen.getByTestId('presence-initial-u-letter').textContent).toBe('A');
  });

  it('renders the person glyph when displayName is empty (no name + no avatar)', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        2,
        {
          user: {
            userId: 'u-anon',
            displayName: '',
            avatarUrl: null,
            cursor: { x: 0, y: 0 },
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    render(<PresenceCursors awareness={awareness} selfClientId={1} pan={noPan} zoom={1} />);
    screen.getByTestId('presence-glyph-u-anon');
    expect(screen.queryByTestId('presence-initial-u-anon')).toBeNull();
  });

  it('renders the displayName in the name chip', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        2,
        {
          user: {
            userId: 'u-name',
            displayName: 'Maya Robertson',
            avatarUrl: null,
            cursor: { x: 0, y: 0 },
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    render(<PresenceCursors awareness={awareness} selfClientId={1} pan={noPan} zoom={1} />);
    expect(screen.getByTestId('presence-name-u-name').textContent).toBe('Maya Robertson');
  });

  it('positions the cursor at pan + cursor * zoom', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        2,
        {
          user: {
            userId: 'u-pos',
            displayName: 'Pos',
            avatarUrl: null,
            cursor: { x: 100, y: 200 },
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    render(
      <PresenceCursors awareness={awareness} selfClientId={1} pan={{ x: 10, y: 20 }} zoom={2} />,
    );
    const el = screen.getByTestId('presence-cursor-u-pos');
    // left = 100 * 2 + 10 = 210; top = 200 * 2 + 20 = 420
    expect(el.style.left).toBe('210px');
    expect(el.style.top).toBe('420px');
  });

  it('omits peers with no cursor coord', () => {
    const peers = new Map<number, { user: PeerUser }>([
      [
        2,
        {
          user: {
            userId: 'u-no-cursor',
            displayName: 'Off',
            avatarUrl: null,
            cursor: null,
          },
        },
      ],
    ]);
    const { awareness } = makeMockAwareness(peers);
    render(<PresenceCursors awareness={awareness} selfClientId={1} pan={noPan} zoom={1} />);
    expect(screen.queryByTestId('presence-cursor-u-no-cursor')).toBeNull();
  });
});

describe('PresenceCursors idle fade', () => {
  function makePeer(userId: string, cursor: { x: number; y: number } | null): { user: PeerUser } {
    return {
      user: {
        userId,
        displayName: userId,
        avatarUrl: null,
        cursor,
      },
    };
  }

  it('fades a peer to opacity 0.3 after 10s of no cursor movement', async () => {
    vi.useFakeTimers();
    try {
      const peers = new Map<number, { user: PeerUser }>([[2, makePeer('u-idle', { x: 0, y: 0 })]]);
      const { awareness, notify } = makeMockAwareness(peers);
      render(<PresenceCursors awareness={awareness} selfClientId={1} pan={noPan} zoom={1} />);
      const el = screen.getByTestId('presence-cursor-u-idle');
      expect(el.style.opacity).toBe('1');

      // Advance past the 10s threshold AND through the 2s tick that observes it.
      await act(async () => {
        vi.advanceTimersByTime(12_001);
      });

      expect(el.style.opacity).toBe('0.3');

      // A new awareness change with a new cursor coord resets the timer.
      peers.set(2, makePeer('u-idle', { x: 5, y: 5 }));
      await act(async () => {
        notify();
        vi.advanceTimersByTime(1);
      });
      expect(el.style.opacity).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not fade a peer whose cursor coord keeps changing', async () => {
    vi.useFakeTimers();
    try {
      const peers = new Map<number, { user: PeerUser }>([
        [2, makePeer('u-active', { x: 0, y: 0 })],
      ]);
      const { awareness, notify } = makeMockAwareness(peers);
      render(<PresenceCursors awareness={awareness} selfClientId={1} pan={noPan} zoom={1} />);

      for (let t = 3; t <= 15; t += 3) {
        peers.set(2, makePeer('u-active', { x: t, y: t }));
        await act(async () => {
          notify();
          vi.advanceTimersByTime(3_000);
        });
      }

      const el = screen.getByTestId('presence-cursor-u-active');
      expect(el.style.opacity).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });
});
