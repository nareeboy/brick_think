// lib/sessions/narrationLiveTypes.ts
// Shared payload shapes for the facilitator-driven narration broadcast events.
// No 'use client' — imported by both client components and pure helper/lib modules.

export type AckState = 'prompted' | 'recording' | 'saved' | 'declined';

/** Participant → facilitator: live per-speaker status for a model's recording. */
export interface RecordingAck {
  modelId: string;
  profileId: string;
  state: AckState;
}

/** Participant → all: a slice of spoken text streaming into the live chat. */
export interface TranscriptChunk {
  modelId: string;
  profileId: string;
  /** Speaker display name, for attribution in the chat. */
  name: string;
  text: string;
  isFinal: boolean;
}
