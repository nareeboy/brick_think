// components/builder/useModelRealtime.ts
'use client';

import { useEffect } from 'react';

import { getBrowserSupabaseClient } from '@/lib/db/client';
import { subscribeAuthedChannel } from '@/lib/db/realtimeChannel';

export interface ModelRealtimePayload {
  title: string;
  canvas_state: unknown;
}

/**
 * Subscribes a non-owner read-only viewer to UPDATE events on a single
 * model row. On (re)subscribe, runs a one-shot SELECT to grab the latest
 * snapshot so a Realtime reconnect can't leave the viewer stale.
 *
 * Auth priming (setAuth before the channel exists) is owned by
 * subscribeAuthedChannel; otherwise RLS drops payloads.
 */
export function useModelRealtime(
  modelId: string | null,
  enabled: boolean,
  onUpdate: (payload: ModelRealtimePayload) => void,
): void {
  useEffect(() => {
    if (!enabled || !modelId) return;
    const supabase = getBrowserSupabaseClient();
    let cancelled = false;

    const fetchSnapshot = async (): Promise<void> => {
      const { data, error } = await supabase
        .from('models')
        .select('title, canvas_state')
        .eq('id', modelId)
        .single();
      if (cancelled) return;
      if (error || !data) return;
      onUpdate({ title: data.title, canvas_state: data.canvas_state });
    };

    const cleanup = subscribeAuthedChannel({
      channelKey: `model:${modelId}`,
      attach: (channel) =>
        channel.on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'models', filter: `id=eq.${modelId}` },
          (payload) => {
            if (cancelled) return;
            const next = (payload as unknown as { new?: ModelRealtimePayload }).new;
            if (!next) return;
            onUpdate({ title: next.title, canvas_state: next.canvas_state });
          },
        ),
      onStatus: (status) => {
        if (status === 'SUBSCRIBED') void fetchSnapshot();
      },
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [modelId, enabled, onUpdate]);
}
