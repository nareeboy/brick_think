import type { TranscriptChunk } from '@/lib/sessions/narrationLiveTypes';

export interface ChatMessage {
  id: string;
  profileId: string;
  name: string;
  text: string;
}

export interface LiveTranscriptState {
  messages: ChatMessage[];
  /** Per-speaker in-progress line, replaced as more interim text arrives. */
  interim: Record<string, { name: string; text: string }>;
}

export const emptyLiveTranscript: LiveTranscriptState = { messages: [], interim: {} };

export function reduceChunk(
  state: LiveTranscriptState,
  chunk: TranscriptChunk,
): LiveTranscriptState {
  if (chunk.isFinal) {
    const text = chunk.text.trim();
    if (!text) return state;
    const message: ChatMessage = {
      id: `${chunk.profileId}:${state.messages.length}`,
      profileId: chunk.profileId,
      name: chunk.name,
      text,
    };
    const interim = { ...state.interim };
    delete interim[chunk.profileId];
    return { messages: [...state.messages, message], interim };
  }

  const interim = { ...state.interim };
  if (chunk.text.trim()) interim[chunk.profileId] = { name: chunk.name, text: chunk.text };
  else delete interim[chunk.profileId];
  return { messages: state.messages, interim };
}
