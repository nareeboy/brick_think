import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { BuilderProvider, useBuilderState } from './builderState';
import { useModelRealtime } from './useModelRealtime';

vi.mock('./useYjsToken', () => ({
  useYjsToken: () => ({ token: 'fake-token', refresh: vi.fn() }),
}));

vi.mock('./useModelRealtime', () => ({
  useModelRealtime: vi.fn(),
}));

vi.mock('y-websocket', () => {
  class FakeAwareness {
    clientID = 42;
    private state: Record<string, unknown> = {};
    private listeners = new Set<() => void>();
    states = new Map<number, { user: Record<string, unknown> }>();
    setLocalStateField(field: string, value: unknown) {
      this.state[field] = value;
      this.states.set(this.clientID, { user: { ...(this.state[field] as object) } });
      this.listeners.forEach((cb) => cb());
    }
    getStates() {
      return this.states;
    }
    on(_evt: string, cb: () => void) {
      this.listeners.add(cb);
    }
    off(_evt: string, cb: () => void) {
      this.listeners.delete(cb);
    }
  }
  class FakeProvider {
    awareness = new FakeAwareness();
    private statusListeners = new Set<(e: { status: string }) => void>();
    on(_evt: string, cb: (e: { status: string }) => void) {
      this.statusListeners.add(cb);
    }
    off(_evt: string, cb: (e: { status: string }) => void) {
      this.statusListeners.delete(cb);
    }
    destroy() {}
  }
  return { WebsocketProvider: FakeProvider };
});

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
            id: 'b1',
            groupId: 'g1',
            code: 'A',
            image: '',
            width: 50,
            height: 50,
            x: 10,
            y: 20,
            rotation: 0,
            visible: true,
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

  it('defers when no fn is registered yet, then fires once on a later transition', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const initial = {
        modelId: 'm3',
        title: 'T',
        canvasState: {
          groups: [{ id: 'g1', name: 'G', collapsed: false, visible: true }],
          bricks: [],
        },
      };
      const { result } = renderHook(() => useBuilderState(), { wrapper: wrap(initial) });

      // First save cycle WITHOUT a registered capture: must not burn the session.
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

      // Now register a capture fn (simulates BuilderCanvas mounting late).
      const captureMock = vi
        .fn<() => Promise<Blob | null>>()
        .mockResolvedValue(new Blob([new Uint8Array([0x89])], { type: 'image/png' }));
      act(() => {
        result.current.registerThumbnailCapture(captureMock);
      });

      // Drive a second save cycle. The capture must fire now.
      act(() => {
        result.current.updateBrick('b1', { x: 30 });
      });
      act(() => {
        vi.advanceTimersByTime(1100);
      });
      await waitFor(() => expect(result.current.saveStatus).toBe('saved'));
      await waitFor(() => expect(captureMock).toHaveBeenCalledTimes(1));
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('BuilderProvider readOnly', () => {
  it('readOnly provider blocks mutations and reports readOnly via context', () => {
    const initial = {
      modelId: 'm1',
      title: 'Locked',
      canvasState: {
        groups: [{ id: 'g1', name: 'Roof', collapsed: false, visible: true }],
        bricks: [],
      },
    };
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <BuilderProvider initial={initial} readOnly>
        {children}
      </BuilderProvider>
    );
    const { result } = renderHook(() => useBuilderState(), { wrapper: Wrapper });

    expect(result.current.readOnly).toBe(true);
    const beforeBricks = result.current.bricks.length;
    act(() => {
      result.current.addBrick({
        id: 'b1',
        groupId: 'g1',
        code: 'A',
        image: '',
        width: 50,
        height: 50,
        x: 0,
        y: 0,
        rotation: 0,
        visible: true,
      });
    });
    expect(result.current.bricks).toHaveLength(beforeBricks);
    act(() => {
      result.current.setTitle('Hijack');
    });
    expect(result.current.title).toBe('Locked');
  });
});

describe('BuilderProvider awareness publishing', () => {
  it('publishes selectedBrickId after selectBrick, preserving any prior cursor', () => {
    const initial = {
      modelId: 'm1',
      title: 'X',
      stageType: 'shared_model' as const,
      orgId: 'org-1',
      canvasState: {
        groups: [{ id: 'g1', name: 'G', collapsed: false, visible: true }],
        bricks: [
          {
            id: 'b1',
            groupId: 'g1',
            code: 'A',
            image: '',
            width: 50,
            height: 50,
            x: 0,
            y: 0,
            rotation: 0,
            visible: true,
          },
        ],
      },
    };
    const liveMode = true;
    const self = { userId: 'u1', displayName: 'U', avatarUrl: null };
    const { result } = renderHook(() => useBuilderState(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <BuilderProvider initial={initial} liveMode={liveMode} self={self}>
          {children}
        </BuilderProvider>
      ),
    });

    act(() => {
      result.current.publishCursor(10, 20);
    });
    act(() => {
      result.current.selectBrick('b1');
    });

    const states = (
      result.current.awareness as unknown as {
        getStates: () => Map<number, { user: { cursor: unknown; selectedBrickId: string | null } }>;
      }
    ).getStates();
    const self42 = states.get(42)!;
    expect(self42.user.cursor).toEqual({ x: 10, y: 20 });
    expect(self42.user.selectedBrickId).toBe('b1');
  });
});

describe('BuilderProvider live read-only', () => {
  beforeEach(() => {
    vi.mocked(useModelRealtime).mockReset();
  });

  test('mounts useModelRealtime when readOnly && !liveMode && sessionId set', () => {
    render(
      <BuilderProvider
        readOnly
        liveMode={false}
        sessionId="session-1"
        initial={{
          modelId: 'model-1',
          title: 'hi',
          canvasState: { groups: [], bricks: [] },
        }}
      >
        <div />
      </BuilderProvider>,
    );
    expect(useModelRealtime).toHaveBeenCalledWith(
      'model-1',
      true, // enabled
      expect.any(Function),
    );
  });

  test('does NOT enable useModelRealtime for owner (readOnly=false)', () => {
    render(
      <BuilderProvider
        readOnly={false}
        sessionId="session-1"
        initial={{
          modelId: 'model-1',
          title: 'hi',
          canvasState: { groups: [], bricks: [] },
        }}
      >
        <div />
      </BuilderProvider>,
    );
    const lastCall = vi.mocked(useModelRealtime).mock.calls.at(-1);
    expect(lastCall?.[1]).toBe(false); // enabled=false
  });

  test('does NOT enable useModelRealtime for personal designs (sessionId=null)', () => {
    render(
      <BuilderProvider
        readOnly
        sessionId={null}
        initial={{
          modelId: 'model-1',
          title: 'hi',
          canvasState: { groups: [], bricks: [] },
        }}
      >
        <div />
      </BuilderProvider>,
    );
    const lastCall = vi.mocked(useModelRealtime).mock.calls.at(-1);
    expect(lastCall?.[1]).toBe(false); // enabled=false
  });

  test('does NOT enable useModelRealtime in Yjs liveMode (non-owner of shared_model)', () => {
    render(
      <BuilderProvider
        readOnly
        liveMode
        sessionId="session-1"
        initial={{
          modelId: 'model-1',
          title: 'hi',
          canvasState: { groups: [], bricks: [] },
        }}
      >
        <div />
      </BuilderProvider>,
    );
    const lastCall = vi.mocked(useModelRealtime).mock.calls.at(-1);
    expect(lastCall?.[1]).toBe(false); // enabled=false in Yjs mode
  });

  test('applies remote payload — title and bricks update in render', () => {
    let capturedOnUpdate: ((p: { title: string; canvas_state: unknown }) => void) | null = null;
    vi.mocked(useModelRealtime).mockImplementation((_modelId, _enabled, onUpdate) => {
      capturedOnUpdate = onUpdate;
    });

    function Probe(): ReactNode {
      const state = useBuilderState();
      return (
        <div>
          <span data-testid="title">{state.title}</span>
          <span data-testid="brick-count">{state.bricks.length}</span>
        </div>
      );
    }

    render(
      <BuilderProvider
        readOnly
        sessionId="session-1"
        initial={{
          modelId: 'model-1',
          title: 'before',
          canvasState: {
            groups: [{ id: 'g', name: 'g', collapsed: false, visible: true }],
            bricks: [],
          },
        }}
      >
        <Probe />
      </BuilderProvider>,
    );
    expect(screen.getByTestId('title').textContent).toBe('before');
    expect(screen.getByTestId('brick-count').textContent).toBe('0');

    act(() => {
      capturedOnUpdate!({
        title: 'after',
        canvas_state: {
          groups: [{ id: 'g', name: 'g', collapsed: false, visible: true }],
          bricks: [
            { id: 'b1', groupId: 'g', code: 'b1x1', image: '', width: 1, height: 1, x: 0, y: 0, rotation: 0, visible: true },
          ],
        },
      });
    });

    expect(screen.getByTestId('title').textContent).toBe('after');
    expect(screen.getByTestId('brick-count').textContent).toBe('1');
  });
});
