import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';

import { useSessionModelsRealtime } from './useSessionModelsRealtime';

const removeChannel = vi.fn();
const setAuth = vi.fn();
const getSession = vi.fn(async () => ({ data: { session: { access_token: 'fake-jwt' } } }));

let onPayload: ((p: unknown) => void) | null = null;

const channelObj = {
  on: vi.fn((_evt: string, _filter: unknown, cb: (p: unknown) => void) => {
    onPayload = cb;
    return channelObj;
  }),
  subscribe: vi.fn(() => channelObj),
};

vi.mock('@/lib/db/client', () => ({
  getBrowserSupabaseClient: () => ({
    auth: { getSession },
    realtime: { setAuth },
    channel: vi.fn(() => channelObj),
    removeChannel,
  }),
}));

beforeEach(() => {
  removeChannel.mockClear();
  setAuth.mockClear();
  getSession.mockClear();
  channelObj.on.mockClear();
  channelObj.subscribe.mockClear();
  onPayload = null;
});

describe('useSessionModelsRealtime', () => {
  test('returns an empty map initially', () => {
    const { result } = renderHook(() => useSessionModelsRealtime('session-1'));
    expect(result.current.lastUpdatedAt.size).toBe(0);
  });

  test('records lastUpdatedAt per modelId when UPDATE payload arrives', async () => {
    const { result } = renderHook(() => useSessionModelsRealtime('session-1'));
    await waitFor(() => expect(channelObj.subscribe).toHaveBeenCalled());

    act(() => {
      onPayload?.({ new: { id: 'model-A' } });
    });
    expect(result.current.lastUpdatedAt.has('model-A')).toBe(true);
    const firstTs = result.current.lastUpdatedAt.get('model-A')!;
    expect(Date.now() - firstTs).toBeLessThan(100);

    act(() => {
      onPayload?.({ new: { id: 'model-B' } });
    });
    expect(result.current.lastUpdatedAt.has('model-B')).toBe(true);
    expect(result.current.lastUpdatedAt.size).toBe(2);
  });

  test('primes setAuth before subscribe', async () => {
    renderHook(() => useSessionModelsRealtime('session-1'));
    await waitFor(() => expect(setAuth).toHaveBeenCalledWith('fake-jwt'));
    const setAuthOrder = setAuth.mock.invocationCallOrder[0];
    const subscribeOrder = channelObj.subscribe.mock.invocationCallOrder[0];
    expect(setAuthOrder).toBeLessThan(subscribeOrder!);
  });

  test('removes channel on unmount', async () => {
    const { unmount } = renderHook(() => useSessionModelsRealtime('session-1'));
    await waitFor(() => expect(channelObj.subscribe).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(removeChannel).toHaveBeenCalled());
  });
});
