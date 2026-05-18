// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from 'vitest';

import { track } from './track';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('track', () => {
  test('logs the event name and props via console.debug', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    track('builder.undo', { stackDepth: 3 });
    expect(debug).toHaveBeenCalledWith('[telemetry]', 'builder.undo', { stackDepth: 3 });
  });

  test('defaults props to an empty object when omitted', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    track('builder.redo');
    expect(debug).toHaveBeenCalledWith('[telemetry]', 'builder.redo', {});
  });

  test('is a no-op when window is undefined', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const originalWindow = globalThis.window;
    // @ts-expect-error — emulating a non-browser environment
    delete globalThis.window;
    try {
      track('builder.undo');
      expect(debug).not.toHaveBeenCalled();
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
