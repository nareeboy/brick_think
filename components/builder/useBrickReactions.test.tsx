import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBrickReactions } from './useBrickReactions';

// The realtime channel is a side effect we don't want firing in unit tests —
// stub the factory so the hook's useEffect attaches to a no-op stub.
vi.mock('@/lib/db/client', () => ({
  getBrowserSupabaseClient: () => ({
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    realtime: { setAuth: () => undefined },
    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
    }),
    removeChannel: () => undefined,
  }),
}));

describe('useBrickReactions', () => {
  it('aggregates initial rows into a brick → emoji map', () => {
    const initial = [
      { brick_id: 'b-1', profile_id: 'p1', emoji: '👍' },
      { brick_id: 'b-1', profile_id: 'p2', emoji: '👍' },
      { brick_id: 'b-1', profile_id: 'p1', emoji: '❤️' },
      { brick_id: 'b-2', profile_id: 'p1', emoji: '👍' },
    ];

    const { result } = renderHook(() => useBrickReactions('m-1', initial));

    expect(result.current['b-1']?.['👍']?.count).toBe(2);
    expect(result.current['b-1']?.['👍']?.profileIds.has('p1')).toBe(true);
    expect(result.current['b-1']?.['👍']?.profileIds.has('p2')).toBe(true);
    expect(result.current['b-1']?.['❤️']?.count).toBe(1);
    expect(result.current['b-2']?.['👍']?.count).toBe(1);
  });

  it('returns an empty map for no rows', () => {
    const { result } = renderHook(() => useBrickReactions('m-1', []));
    expect(result.current).toEqual({});
  });

  it('dedupes a (brick, profile, emoji) triple that appears twice in initial rows', () => {
    // Composite PK guarantees uniqueness at the DB level, but the projection
    // should still be defensive — a duplicate row from an out-of-order
    // hydration mustn't double-count.
    const initial = [
      { brick_id: 'b-1', profile_id: 'p1', emoji: '👍' },
      { brick_id: 'b-1', profile_id: 'p1', emoji: '👍' },
    ];
    const { result } = renderHook(() => useBrickReactions('m-1', initial));
    expect(result.current['b-1']?.['👍']?.count).toBe(1);
  });
});
