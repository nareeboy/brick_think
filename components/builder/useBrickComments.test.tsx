import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBrickComments } from './useBrickComments';

// The realtime channel is a side effect we don't want firing in unit tests —
// stub the factory so the hook's useEffect attaches to a no-op stub. Mirrors
// the pattern in useBrickReactions.test.tsx.
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

describe('useBrickComments', () => {
  it('groups initial rows by brick_id', () => {
    const initial = [
      {
        id: 'c1',
        brick_id: 'b-1',
        profile_id: 'p1',
        body: 'a',
        created_at: '2026-05-20T00:00:00Z',
        full_name: 'Alice',
      },
      {
        id: 'c2',
        brick_id: 'b-1',
        profile_id: 'p2',
        body: 'b',
        created_at: '2026-05-20T00:01:00Z',
        full_name: 'Bob',
      },
      {
        id: 'c3',
        brick_id: 'b-2',
        profile_id: 'p1',
        body: 'c',
        created_at: '2026-05-20T00:02:00Z',
        full_name: 'Alice',
      },
    ];
    const { result } = renderHook(() => useBrickComments('m-1', initial));
    expect(result.current['b-1']?.length).toBe(2);
    expect(result.current['b-2']?.length).toBe(1);
  });

  it('returns an empty map for no rows', () => {
    const { result } = renderHook(() => useBrickComments('m-1', []));
    expect(result.current).toEqual({});
  });
});
