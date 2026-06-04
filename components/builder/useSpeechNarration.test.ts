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
});
