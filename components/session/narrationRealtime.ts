'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { getBrowserSupabaseClient } from '@/lib/db/client';
import type { RecordingAck, TranscriptChunk } from '@/lib/sessions/narrationLiveTypes';

// A lightweight per-session broadcast channel used purely to nudge the
// facilitator's session page to refresh when a participant saves a narration.
// We use broadcast (not postgres_changes) because model_narrations is RLS-locked
// to service-role — an authenticated client can't subscribe to its row changes.
const channelName = (sessionId: string) => `session-narration:${sessionId}`;
const NARRATION_SAVED_EVENT = 'narration_saved';
const RECORDING_START_EVENT = 'recording_start';
const RECORDING_STOP_EVENT = 'recording_stop';
const RECORDING_ACK_EVENT = 'recording_ack';
const TRANSCRIPT_CHUNK_EVENT = 'transcript_chunk';

/**
 * Fire-and-forget: tell everyone on the session-narration channel that a
 * narration was just saved. Called from the recorder's drawer after a
 * successful save. Subscribes, sends once, then tears the channel down.
 */
export async function broadcastNarrationSaved(sessionId: string): Promise<void> {
  const supabase = getBrowserSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) supabase.realtime.setAuth(token);

  const channel = supabase.channel(channelName(sessionId));
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') done();
    });
    // Don't hang forever if the socket never joins.
    window.setTimeout(done, 3000);
  });
  await channel.send({ type: 'broadcast', event: NARRATION_SAVED_EVENT, payload: {} });
  await supabase.removeChannel(channel);
}

/**
 * Facilitator side: subscribe to the session-narration channel and refresh the
 * server-rendered session page when a participant saves a narration, so the
 * Transcript button (and combined room transcripts) appear without a manual
 * refresh. Debounced to coalesce a burst of saves into one refresh.
 */
export function useNarrationSavedRefresh(sessionId: string): void {
  const router = useRouter();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const start = async (): Promise<void> => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      channel = supabase
        .channel(channelName(sessionId))
        .on('broadcast', { event: NARRATION_SAVED_EVENT }, () => {
          if (cancelled) return;
          if (timer.current != null) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => router.refresh(), 400);
        })
        .subscribe();
    };

    void start();

    return () => {
      cancelled = true;
      if (timer.current != null) window.clearTimeout(timer.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionId, router]);
}

export interface NarrationLiveHandlers {
  onRecordingStart?: (modelId: string) => void;
  onRecordingStop?: (modelId: string) => void;
  onAck?: (ack: RecordingAck) => void;
  onChunk?: (chunk: TranscriptChunk) => void;
}

export interface NarrationLiveApi {
  startRecording: (modelId: string) => void;
  stopRecording: (modelId: string) => void;
  sendAck: (ack: RecordingAck) => void;
  sendChunk: (chunk: TranscriptChunk) => void;
}

/**
 * Shared join for the facilitator-driven narration flow. Subscribes once to the
 * session-narration channel and dispatches the four control events to whichever
 * handlers the caller supplies; returns typed senders. `broadcast.self: true`
 * means a sender also receives its own events, so a recording participant's own
 * chunks render in the live chat via the same `onChunk` path as other speakers'.
 */
export function useNarrationLiveChannel(
  sessionId: string,
  handlers: NarrationLiveHandlers,
): NarrationLiveApi {
  const channelRef = useRef<ReturnType<
    ReturnType<typeof getBrowserSupabaseClient>['channel']
  > | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const start = async (): Promise<void> => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      channel = supabase
        .channel(channelName(sessionId), { config: { broadcast: { self: true } } })
        .on('broadcast', { event: RECORDING_START_EVENT }, ({ payload }) =>
          handlersRef.current.onRecordingStart?.((payload as { modelId: string }).modelId),
        )
        .on('broadcast', { event: RECORDING_STOP_EVENT }, ({ payload }) =>
          handlersRef.current.onRecordingStop?.((payload as { modelId: string }).modelId),
        )
        .on('broadcast', { event: RECORDING_ACK_EVENT }, ({ payload }) =>
          handlersRef.current.onAck?.(payload as RecordingAck),
        )
        .on('broadcast', { event: TRANSCRIPT_CHUNK_EVENT }, ({ payload }) =>
          handlersRef.current.onChunk?.(payload as TranscriptChunk),
        )
        .subscribe();
      channelRef.current = channel;
    };

    void start();

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const send = useCallback((event: string, payload: Record<string, unknown>): void => {
    void channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  return {
    startRecording: useCallback(
      (modelId: string) => send(RECORDING_START_EVENT, { modelId }),
      [send],
    ),
    stopRecording: useCallback(
      (modelId: string) => send(RECORDING_STOP_EVENT, { modelId }),
      [send],
    ),
    sendAck: useCallback((ack: RecordingAck) => send(RECORDING_ACK_EVENT, { ...ack }), [send]),
    sendChunk: useCallback(
      (chunk: TranscriptChunk) => send(TRANSCRIPT_CHUNK_EVENT, { ...chunk }),
      [send],
    ),
  };
}
