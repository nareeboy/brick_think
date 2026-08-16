'use client';

import { useEffect, useState } from 'react';

import { subscribeAuthedChannel } from '@/lib/db/realtimeChannel';

/**
 * Subscribes to UPDATE events on all models in a session and exposes a map of
 * { modelId → lastUpdatedAtMs } so consumers can render "live" indicators on
 * participant rows. One channel per session.
 *
 * Auth priming (setAuth before the channel exists) is owned by
 * subscribeAuthedChannel — without it, RLS drops the postgres_changes payloads.
 */
export function useSessionModelsRealtime(sessionId: string): {
  lastUpdatedAt: Map<string, number>;
} {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Map<string, number>>(() => new Map());

  useEffect(() => {
    let cancelled = false;

    const cleanupChannel = subscribeAuthedChannel({
      channelKey: `session-models:${sessionId}`,
      attach: (channel) =>
        channel.on<{ id: string }>(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'models',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            if (cancelled) return;
            const { id } = payload.new;
            setLastUpdatedAt((prev) => {
              const copy = new Map(prev);
              copy.set(id, Date.now());
              return copy;
            });
          },
        ),
    });

    return () => {
      cancelled = true;
      cleanupChannel();
    };
  }, [sessionId]);

  return { lastUpdatedAt };
}
