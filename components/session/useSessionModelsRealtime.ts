'use client';

import { useEffect, useState } from 'react';

import { getBrowserSupabaseClient } from '@/lib/db/client';

/**
 * Subscribes to UPDATE events on all models in a session and exposes a map of
 * { modelId → lastUpdatedAtMs } so consumers can render "live" indicators on
 * participant rows. One channel per session.
 *
 * Reuses the auth-priming pattern from useSessionStages (eager
 * supabase.realtime.setAuth before channel creation) — without it, RLS
 * drops the postgres_changes payloads.
 */
export function useSessionModelsRealtime(sessionId: string): {
  lastUpdatedAt: Map<string, number>;
} {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Map<string, number>>(() => new Map());

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
        .channel(`session-models:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'models',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            if (cancelled) return;
            const next = (payload as unknown as { new?: { id: string } }).new;
            if (!next?.id) return;
            const id = next.id;
            setLastUpdatedAt((prev) => {
              const copy = new Map(prev);
              copy.set(id, Date.now());
              return copy;
            });
          },
        )
        .subscribe();
    };

    void start();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { lastUpdatedAt };
}
