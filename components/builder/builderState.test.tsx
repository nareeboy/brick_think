import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { BuilderProvider, useBuilderState } from './builderState';

function wrap(initial?: Parameters<typeof BuilderProvider>[0]['initial']) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <BuilderProvider initial={initial}>{children}</BuilderProvider>;
  };
}

describe('BuilderProvider initial state', () => {
  it('uses default empty group when no initial supplied', () => {
    const { result } = renderHook(() => useBuilderState(), { wrapper: wrap() });
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.bricks).toEqual([]);
  });

  it('hydrates from initial.canvasState', () => {
    const initial = {
      modelId: 'm1',
      title: 'Greenhouse',
      canvasState: {
        groups: [{ id: 'g1', name: 'Roof', collapsed: false, visible: true }],
        bricks: [
          {
            id: 'b1', groupId: 'g1', code: 'A', image: '',
            width: 50, height: 50, x: 10, y: 20, rotation: 0, visible: true,
          },
        ],
      },
    };
    const { result } = renderHook(() => useBuilderState(), { wrapper: wrap(initial) });
    expect(result.current.title).toBe('Greenhouse');
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0]?.name).toBe('Roof');
    expect(result.current.bricks).toHaveLength(1);
    expect(result.current.bricks[0]?.x).toBe(10);
  });
});

describe('thumbnail capture trigger', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'm1', updated_at: new Date().toISOString() }),
      }),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires the registered capture exactly once on the first saving→saved transition', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const captureMock = vi
        .fn<() => Promise<Blob | null>>()
        .mockResolvedValue(new Blob([new Uint8Array([0x89])], { type: 'image/png' }));

      const initial = {
        modelId: 'm1',
        title: 'T',
        canvasState: {
          groups: [{ id: 'g1', name: 'G', collapsed: false, visible: true }],
          bricks: [],
        },
      };
      const { result } = renderHook(() => useBuilderState(), { wrapper: wrap(initial) });

      act(() => {
        result.current.registerThumbnailCapture(captureMock);
      });

      act(() => {
        result.current.addBrick({
          id: 'b1',
          groupId: 'g1',
          code: 'A',
          image: '',
          width: 50,
          height: 50,
          x: 10,
          y: 10,
          rotation: 0,
          visible: true,
        });
      });
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      await waitFor(() => expect(result.current.saveStatus).toBe('saved'));
      await waitFor(() => expect(captureMock).toHaveBeenCalledTimes(1));

      act(() => {
        result.current.updateBrick('b1', { x: 20 });
      });
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      await waitFor(() => expect(result.current.saveStatus).toBe('saved'));
      await act(async () => {
        await Promise.resolve();
      });
      expect(captureMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not fire if no capture fn is registered', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const initial = {
        modelId: 'm2',
        title: 'T',
        canvasState: {
          groups: [{ id: 'g1', name: 'G', collapsed: false, visible: true }],
          bricks: [],
        },
      };
      const { result } = renderHook(() => useBuilderState(), { wrapper: wrap(initial) });

      act(() => {
        result.current.addBrick({
          id: 'b1',
          groupId: 'g1',
          code: 'A',
          image: '',
          width: 50,
          height: 50,
          x: 10,
          y: 10,
          rotation: 0,
          visible: true,
        });
      });
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      await waitFor(() => expect(result.current.saveStatus).toBe('saved'));

      const fetchCalls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
      const thumbnailCall = fetchCalls.find((args: unknown[]) => {
        const url = args[0];
        return typeof url === 'string' && url.includes('/thumbnail');
      });
      expect(thumbnailCall).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
