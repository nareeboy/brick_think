import { describe, it, expect } from 'vitest';

import { emptyLiveTranscript, reduceChunk } from '@/lib/sessions/liveTranscript';
import type { TranscriptChunk } from '@/lib/sessions/narrationLiveTypes';

function chunk(p: Partial<TranscriptChunk>): TranscriptChunk {
  return { modelId: 'm', profileId: 'a', name: 'Alice', text: '', isFinal: false, ...p };
}

describe('reduceChunk', () => {
  it('appends a final chunk as a message', () => {
    const s = reduceChunk(emptyLiveTranscript, chunk({ text: 'hello there', isFinal: true }));
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({ profileId: 'a', name: 'Alice', text: 'hello there' });
  });

  it('ignores an empty final chunk', () => {
    const s = reduceChunk(emptyLiveTranscript, chunk({ text: '   ', isFinal: true }));
    expect(s.messages).toHaveLength(0);
  });

  it('stores interim text per speaker and clears it on final', () => {
    let s = reduceChunk(emptyLiveTranscript, chunk({ text: 'hel', isFinal: false }));
    expect(s.interim.a).toEqual({ name: 'Alice', text: 'hel' });
    s = reduceChunk(s, chunk({ text: 'hello', isFinal: true }));
    expect(s.interim.a).toBeUndefined();
    expect(s.messages[0]?.text).toBe('hello');
  });

  it('keeps two speakers separate and message ids unique', () => {
    let s = reduceChunk(emptyLiveTranscript, chunk({ profileId: 'a', name: 'Alice', text: 'hi', isFinal: true }));
    s = reduceChunk(s, chunk({ profileId: 'b', name: 'Bob', text: 'yo', isFinal: true }));
    expect(s.messages.map((m) => m.name)).toEqual(['Alice', 'Bob']);
    expect(new Set(s.messages.map((m) => m.id)).size).toBe(2);
  });
});
