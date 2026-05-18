import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStages } from './useSessionStages';

const STAGE_A = {
  id: 'a', session_id: 's', stage_type: 'skill_building', position: 0,
  title: null, description: null, duration_seconds: 600,
  started_at: null, ended_at: null, status: 'pending',
  paused_at: null, total_paused_ms: 0, extended_seconds: 0,
};
const STAGE_B = { ...STAGE_A, id: 'b', position: 1 };

let mockChannel: ReturnType<typeof makeChannel>;
function makeChannel() {
  const handlers: Array<(payload: unknown) => void> = [];
  return {
    on: vi.fn((_event: string, _filter: unknown, cb: (p: unknown) => void) => {
      handlers.push(cb);
      return mockChannel;
    }),
    subscribe: vi.fn((cb?: (status: string) => void) => {
      cb?.('SUBSCRIBED');
      return mockChannel;
    }),
    unsubscribe: vi.fn(),
    emit: (payload: unknown) => handlers.forEach((h) => h(payload)),
  };
}

const fromMock = vi.fn();
const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  from: fromMock,
  removeChannel: vi.fn(),
};

vi.mock('@/lib/db/client', () => ({
  getBrowserSupabaseClient: () => mockSupabase,
}));

beforeEach(() => {
  mockChannel = makeChannel();
  // Build a chainable mock for the .select().eq().order() chain (stages)
  // and .select().eq().maybeSingle() (sessions).
  fromMock.mockImplementation((table: string) => {
    if (table === 'stages') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [STAGE_A, STAGE_B], error: null }),
          }),
        }),
      };
    }
    if (table === 'sessions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 's', current_stage_id: null, status: 'draft' }, error: null }),
          }),
        }),
      };
    }
    throw new Error(`unexpected from(${table})`);
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useSessionStages', () => {
  it('fetches initial stages on mount', async () => {
    const { result } = renderHook(() => useSessionStages('s'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.stages).toHaveLength(2);
    expect(result.current.stages[0]!.id).toBe('a');
    expect(result.current.session).toEqual({ id: 's', current_stage_id: null, status: 'draft' });
  });

  it('applies postgres_changes UPDATE payload to local state', async () => {
    const { result } = renderHook(() => useSessionStages('s'));
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      mockChannel.emit({
        eventType: 'UPDATE',
        table: 'stages',
        new: { ...STAGE_A, status: 'active', started_at: '2026-05-18T12:00:00Z' },
        old: STAGE_A,
      });
    });

    expect(result.current.stages.find((s) => s.id === 'a')?.status).toBe('active');
  });

  it('applies INSERT payload (new stage appears, sorted by position)', async () => {
    const { result } = renderHook(() => useSessionStages('s'));
    await waitFor(() => expect(result.current.ready).toBe(true));

    const STAGE_NEW = { ...STAGE_A, id: 'c', position: 2 };
    act(() => {
      mockChannel.emit({ eventType: 'INSERT', table: 'stages', new: STAGE_NEW });
    });

    expect(result.current.stages.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('applies DELETE payload', async () => {
    const { result } = renderHook(() => useSessionStages('s'));
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      mockChannel.emit({ eventType: 'DELETE', table: 'stages', old: { id: 'a' } });
    });

    expect(result.current.stages.map((s) => s.id)).toEqual(['b']);
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = renderHook(() => useSessionStages('s'));
    await waitFor(() => expect(mockChannel.subscribe).toHaveBeenCalled());
    unmount();
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });
});
