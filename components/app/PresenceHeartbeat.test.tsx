import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock('@/lib/db/client', () => ({
  getBrowserSupabaseClient: () => ({ rpc }),
}));

import { PresenceHeartbeat } from './PresenceHeartbeat';

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('PresenceHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    rpc.mockClear();
    setVisibility('visible');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('pings on mount and again after 2 minutes', () => {
    render(<PresenceHeartbeat />);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('touch_presence');

    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  test('does not ping while the tab is hidden, pings on return after the interval', () => {
    render(<PresenceHeartbeat />);
    expect(rpc).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(rpc).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  test('stops pinging after unmount', () => {
    const { unmount } = render(<PresenceHeartbeat />);
    unmount();
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
