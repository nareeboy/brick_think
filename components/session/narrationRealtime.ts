'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { getBrowserSupabaseClient } from '@/lib/db/client';

// A lightweight per-session broadcast channel used purely to nudge the
// facilitator's session page to refresh when a participant saves a narration.
// We use broadcast (not postgres_changes) because model_narrations is RLS-locked
// to service-role — an authenticated client can't subscribe to its row changes.
const channelName = (sessionId: string) => `session-narration:${sessionId}`;
const NARRATION_SAVED_EVENT = 'narration_saved';

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
