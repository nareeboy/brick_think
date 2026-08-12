// lib/db/realtimeChannel.test.ts
//
// The one invariant this module exists to enforce: the Realtime client is
// primed with the caller's JWT (awaited) BEFORE the channel is created, so
// the WS join frame carries the token and RLS doesn't silently drop
// payloads. Plus lifecycle: cleanup-before-ready never creates the channel;
// cleanup-after removes it.

import { describe, expect, test, vi, beforeEach } from 'vitest';

const removeChannel = vi.fn();
const setAuth = vi.fn(async () => {});
let sessionToken: string | null = 'fake-jwt';
let holdSession = false;
let resolveGetSession: (() => void) | null = null;
const getSession = vi.fn(
  () =>
    new Promise((resolve) => {
      const respond = () =>
        resolve({ data: { session: sessionToken ? { access_token: sessionToken } : null } });
      // Tests that need to control timing set holdSession = true first.
      if (holdSession) resolveGetSession = respond;
      else respond();
    }),
);

const channelObj = {
  on: vi.fn(() => channelObj),
  subscribe: vi.fn(() => channelObj),
};
const channelFactory = vi.fn(() => channelObj);

vi.mock('@/lib/db/client', () => ({
  getBrowserSupabaseClient: () => ({
    auth: { getSession },
    realtime: { setAuth },
    channel: channelFactory,
    removeChannel,
  }),
}));

import { subscribeAuthedChannel } from './realtimeChannel';

beforeEach(() => {
  removeChannel.mockClear();
  setAuth.mockClear();
  getSession.mockClear();
  channelObj.on.mockClear();
  channelObj.subscribe.mockClear();
  channelFactory.mockClear();
  sessionToken = 'fake-jwt';
  holdSession = false;
  resolveGetSession = null;
});

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('subscribeAuthedChannel', () => {
  test('awaits setAuth with the JWT before creating the channel', async () => {
    subscribeAuthedChannel({ channelKey: 'k', attach: (ch) => ch });
    await flush();
    expect(setAuth).toHaveBeenCalledWith('fake-jwt');
    expect(setAuth.mock.invocationCallOrder[0]).toBeLessThan(
      channelFactory.mock.invocationCallOrder[0]!,
    );
    expect(channelObj.subscribe).toHaveBeenCalledTimes(1);
  });

  test('anon (no session) skips setAuth but still subscribes', async () => {
    sessionToken = null;
    subscribeAuthedChannel({ channelKey: 'k', attach: (ch) => ch });
    await flush();
    expect(setAuth).not.toHaveBeenCalled();
    expect(channelObj.subscribe).toHaveBeenCalledTimes(1);
  });

  test('cleanup before the token fetch resolves never creates the channel', async () => {
    holdSession = true;
    const cleanup = subscribeAuthedChannel({ channelKey: 'k', attach: (ch) => ch });
    cleanup();
    resolveGetSession?.();
    await flush();
    expect(channelFactory).not.toHaveBeenCalled();
    expect(removeChannel).not.toHaveBeenCalled();
  });

  test('cleanup after subscribe removes the channel', async () => {
    const cleanup = subscribeAuthedChannel({ channelKey: 'k', attach: (ch) => ch });
    await flush();
    cleanup();
    expect(removeChannel).toHaveBeenCalledWith(channelObj);
  });

  test('forwards channel options, status callback, and channel handle', async () => {
    const onStatus = vi.fn();
    const onChannel = vi.fn();
    const options = { config: { broadcast: { self: false } } };
    subscribeAuthedChannel({
      channelKey: 'k',
      attach: (ch) => ch,
      channelOptions: options,
      onStatus,
      onChannel,
    });
    await flush();
    expect(channelFactory).toHaveBeenCalledWith('k', options);
    expect(channelObj.subscribe).toHaveBeenCalledWith(onStatus);
    expect(onChannel).toHaveBeenCalledWith(channelObj);
  });
});
