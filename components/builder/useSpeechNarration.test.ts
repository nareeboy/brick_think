// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { useSpeechNarration } from '@/components/builder/useSpeechNarration';

class FakeRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  emitFinal(text: string) {
    this.onresult?.({
      results: [Object.assign([{ transcript: text }], { isFinal: true })],
      resultIndex: 0,
    });
  }
  emitInterim(text: string) {
    this.onresult?.({
      results: [Object.assign([{ transcript: text }], { isFinal: false })],
      resultIndex: 0,
    });
  }
}

afterEach(() => {
  // @ts-expect-error test cleanup
  delete globalThis.SpeechRecognition;
  // @ts-expect-error test cleanup
  delete globalThis.webkitSpeechRecognition;
});

describe('useSpeechNarration', () => {
  test('reports unsupported when no SpeechRecognition global exists', () => {
    const { result } = renderHook(() => useSpeechNarration());
    expect(result.current.supported).toBe(false);
  });

  test('accumulates finalised transcript segments', () => {
    const rec = new FakeRecognition();
    // @ts-expect-error inject
    globalThis.SpeechRecognition = vi.fn(() => rec);
    const { result } = renderHook(() => useSpeechNarration());
    expect(result.current.supported).toBe(true);
    act(() => result.current.start());
    act(() => rec.emitFinal('hello'));
    act(() => rec.emitFinal(' world'));
    expect(result.current.transcript.trim()).toBe('hello world');
    act(() => result.current.stop());
    expect(rec.stop).toHaveBeenCalled();
  });

  test('speaking is true on a result and decays to false after ~400ms', () => {
    vi.useFakeTimers();
    const rec = new FakeRecognition();
    // @ts-expect-error inject
    globalThis.SpeechRecognition = vi.fn(() => rec);
    const { result } = renderHook(() => useSpeechNarration());
    act(() => result.current.start());

    expect(result.current.speaking).toBe(false);

    act(() => rec.emitInterim('hel'));
    expect(result.current.speaking).toBe(true);

    // Still talking before the window elapses.
    act(() => vi.advanceTimersByTime(300));
    act(() => rec.emitInterim('hello'));
    expect(result.current.speaking).toBe(true);

    // No more results — decays to silent.
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.speaking).toBe(false);

    act(() => result.current.stop());
    vi.useRealTimers();
  });

  test('auto-restarts when recognition ends on its own (silence), preserving transcript', () => {
    const rec = new FakeRecognition();
    // @ts-expect-error inject
    globalThis.SpeechRecognition = vi.fn(() => rec);
    const { result } = renderHook(() => useSpeechNarration());
    act(() => result.current.start());
    act(() => rec.emitFinal('hello'));
    expect(rec.start).toHaveBeenCalledTimes(1);

    // Chrome ends the session spontaneously (no explicit stop):
    act(() => rec.onend?.());
    expect(result.current.status).toBe('recording');
    expect(rec.start).toHaveBeenCalledTimes(2);
    expect(result.current.transcript.trim()).toBe('hello');

    // Explicit stop now truly stops.
    act(() => result.current.stop());
    expect(result.current.status).toBe('stopped');
  });
});
