// components/builder/useModelRealtime.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';

import { useModelRealtime } from './useModelRealtime';

// Mock the browser client module so we can intercept channel creation.
const removeChannel = vi.fn();
const setAuth = vi.fn();
const getSession = vi.fn(async () => ({ data: { session: { access_token: 'fake-jwt' } } }));
const singleFetch = vi.fn(async () => ({
  data: { title: 'snap', canvas_state: { groups: [], bricks: [] } },
  error: null,
}));

let onPayload: ((p: unknown) => void) | null = null;
let onSubscribe: ((status: string) => void) | null = null;

const channelObj = {
  on: vi.fn((_evt: string, _filter: unknown, cb: (p: unknown) => void) => {
    onPayload = cb;
    return channelObj;
  }),
  subscribe: vi.fn((cb: (s: string) => void) => {
    onSubscribe = cb;
    return channelObj;
  }),
};

const fromObj = {
  select: vi.fn(() => fromObj),
  eq: vi.fn(() => fromObj),
  single: singleFetch,
};

vi.mock('@/lib/db/client', () => ({
  getBrowserSupabaseClient: () => ({
    auth: { getSession },
    realtime: { setAuth },
    channel: vi.fn(() => channelObj),
    removeChannel,
    from: vi.fn(() => fromObj),
  }),
}));

beforeEach(() => {
  removeChannel.mockClear();
  setAuth.mockClear();
  getSession.mockClear();
  singleFetch.mockClear();
  channelObj.on.mockClear();
  channelObj.subscribe.mockClear();
  fromObj.select.mockClear();
  fromObj.eq.mockClear();
  onPayload = null;
  onSubscribe = null;
});

describe('useModelRealtime', () => {
  test('primes setAuth before subscribing', async () => {
    const onUpdate = vi.fn();
    renderHook(() => useModelRealtime('model-1', true, onUpdate));
    await waitFor(() => expect(setAuth).toHaveBeenCalledWith('fake-jwt'));
    // setAuth must be called before subscribe.
    const setAuthOrder = setAuth.mock.invocationCallOrder[0];
    const subscribeOrder = channelObj.subscribe.mock.invocationCallOrder[0];
    expect(setAuthOrder).toBeLessThan(subscribeOrder!);
  });

  test('invokes onUpdate when a postgres_changes payload arrives', async () => {
    const onUpdate = vi.fn();
    renderHook(() => useModelRealtime('model-1', true, onUpdate));
    await waitFor(() => expect(channelObj.subscribe).toHaveBeenCalled());
    const payload = {
      new: { title: 'remote', canvas_state: { groups: [], bricks: [] } },
    };
    act(() => {
      onPayload?.(payload);
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenLastCalledWith({
      title: 'remote',
      canvas_state: { groups: [], bricks: [] },
    });
    expect(singleFetch).not.toHaveBeenCalled();
  });

  test('runs catch-up SELECT on SUBSCRIBED', async () => {
    const onUpdate = vi.fn();
    renderHook(() => useModelRealtime('model-1', true, onUpdate));
    await waitFor(() => expect(channelObj.subscribe).toHaveBeenCalled());
    act(() => {
      onSubscribe?.('SUBSCRIBED');
    });
    await waitFor(() => expect(singleFetch).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith({ title: 'snap', canvas_state: { groups: [], bricks: [] } }),
    );
  });

  test('skips entirely when enabled=false', () => {
    const onUpdate = vi.fn();
    renderHook(() => useModelRealtime('model-1', false, onUpdate));
    expect(getSession).not.toHaveBeenCalled();
    expect(channelObj.subscribe).not.toHaveBeenCalled();
  });

  test('runs catch-up SELECT on every SUBSCRIBED (handles reconnect)', async () => {
    const onUpdate = vi.fn();
    renderHook(() => useModelRealtime('model-1', true, onUpdate));
    await waitFor(() => expect(channelObj.subscribe).toHaveBeenCalled());
    act(() => {
      onSubscribe?.('SUBSCRIBED');
    });
    await waitFor(() => expect(singleFetch).toHaveBeenCalledTimes(1));
    // Simulate reconnect: SUBSCRIBED fires again.
    act(() => {
      onSubscribe?.('SUBSCRIBED');
    });
    await waitFor(() => expect(singleFetch).toHaveBeenCalledTimes(2));
  });

  test('removes channel on unmount', async () => {
    const onUpdate = vi.fn();
    const { unmount } = renderHook(() => useModelRealtime('model-1', true, onUpdate));
    await waitFor(() => expect(channelObj.subscribe).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(removeChannel).toHaveBeenCalled());
  });
});
