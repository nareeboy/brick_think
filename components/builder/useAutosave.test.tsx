import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutosave } from './useAutosave';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setup(initial: { v: number }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'm1', updated_at: new Date().toISOString() }),
  });
  vi.stubGlobal('fetch', fetchMock);
  const r = renderHook(
    ({ payload }) =>
      useAutosave({
        modelId: 'm1',
        payload,
        debounceMs: 1000,
      }),
    { initialProps: { payload: initial } },
  );
  return { ...r, fetchMock };
}

describe('useAutosave', () => {
  it('idle with no payload changes', () => {
    const { result } = setup({ v: 1 });
    expect(result.current.status).toBe('idle');
  });

  it('debounces, then issues one PATCH and lands on saved', async () => {
    const { result, rerender, fetchMock } = setup({ v: 1 });
    rerender({ payload: { v: 2 } });
    expect(result.current.status).toBe('dirty');
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.status).toBe('saved'));
  });

  it('coalesces rapid edits into one in-flight save and re-fires when dirty', async () => {
    const { result, rerender, fetchMock } = setup({ v: 1 });
    let resolveFirst: (value: unknown) => void = () => {};
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveFirst = r;
        }),
    );
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'm1', updated_at: new Date().toISOString() }),
    });

    rerender({ payload: { v: 2 } });
    act(() => vi.advanceTimersByTime(1000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saving');

    rerender({ payload: { v: 3 } });
    expect(result.current.status).toBe('saving');

    resolveFirst({ ok: true, json: async () => ({ id: 'm1', updated_at: '' }) });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.status).toBe('saved'));
  });

  it('does not fire when modelId is null', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { rerender } = renderHook(
      ({ payload }) =>
        useAutosave({ modelId: null, payload, debounceMs: 1000 }),
      { initialProps: { payload: { v: 1 } } },
    );
    rerender({ payload: { v: 2 } });
    act(() => vi.advanceTimersByTime(2000));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retries with backoff after a failed save and lands on error after 3 attempts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(
      ({ payload }) =>
        useAutosave({ modelId: 'm1', payload, debounceMs: 1000 }),
      { initialProps: { payload: { v: 1 } } },
    );

    rerender({ payload: { v: 2 } });
    act(() => vi.advanceTimersByTime(1000));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    act(() => vi.advanceTimersByTime(1000));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    act(() => vi.advanceTimersByTime(3000));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    act(() => vi.advanceTimersByTime(9000));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));

    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
