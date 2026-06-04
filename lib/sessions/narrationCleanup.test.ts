import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, test, vi } from 'vitest';

import { cleanupTranscript } from '@/lib/sessions/narrationCleanup';

function fakeClient(textOrThrow: string | Error) {
  return {
    messages: {
      create: vi.fn(async () => {
        if (textOrThrow instanceof Error) throw textOrThrow;
        return { content: [{ type: 'text', text: textOrThrow }] };
      }),
    },
  } as unknown as Anthropic;
}

describe('cleanupTranscript', () => {
  test('returns the cleaned text on success', async () => {
    const out = await cleanupTranscript(
      fakeClient('Hello world. Nice to meet you.'),
      'hello world nice to meet you',
    );
    expect(out).toEqual({ ok: true, text: 'Hello world. Nice to meet you.' });
  });

  test('returns ok:false when the model throws', async () => {
    const out = await cleanupTranscript(fakeClient(new Error('429 rate limit')), 'whatever');
    expect(out.ok).toBe(false);
  });

  test('returns ok:false when the response has no text block', async () => {
    const client = {
      messages: { create: vi.fn(async () => ({ content: [] })) },
    } as unknown as Anthropic;
    const out = await cleanupTranscript(client, 'x');
    expect(out.ok).toBe(false);
  });
});
