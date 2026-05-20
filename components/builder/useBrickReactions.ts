'use client';

import { useEffect, useMemo, useState } from 'react';

import { getBrowserSupabaseClient } from '@/lib/db/client';
import type { ReactionRow } from '@/lib/brickFeedback/loadInitial';

export interface ReactionAggregate {
  count: number;
  profileIds: Set<string>;
}

export interface ReactionMap {
  [brickId: string]: { [emoji: string]: ReactionAggregate };
}

/**
 * Subscribes to `brick_reactions` INSERT/DELETE realtime events for a model
 * and projects the resulting row set into a `brick → emoji → aggregate` map.
 *
 * Hydrates from the server-rendered `initial` rows so first paint already
 * carries the existing reactions; the channel hydrates on top. INSERT is
 * idempotent (composite-PK race no-op) and DELETE matches on (brick, profile,
 * emoji) since `payload.old` from Realtime carries the row's primary key set.
 */
export function useBrickReactions(modelId: string, initial: ReactionRow[]): ReactionMap {
  const [rows, setRows] = useState<ReactionRow[]>(initial);

  useEffect(() => {
    if (!modelId) return undefined;
    const supabase = getBrowserSupabaseClient();
    let cancelled = false;

    const start = async (): Promise<void> => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      const channel = supabase
        .channel(`brick-reactions:${modelId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'brick_reactions',
            filter: `model_id=eq.${modelId}`,
          },
          (payload) => {
            const r = payload.new as ReactionRow;
            setRows((s) => {
              if (
                s.some(
                  (x) =>
                    x.brick_id === r.brick_id &&
                    x.profile_id === r.profile_id &&
                    x.emoji === r.emoji,
                )
              ) {
                return s;
              }
              return [...s, r];
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'brick_reactions',
            filter: `model_id=eq.${modelId}`,
          },
          (payload) => {
            const r = payload.old as Partial<ReactionRow>;
            setRows((s) =>
              s.filter(
                (x) =>
                  !(
                    x.brick_id === r.brick_id &&
                    x.profile_id === r.profile_id &&
                    x.emoji === r.emoji
                  ),
              ),
            );
          },
        )
        .subscribe();

      cleanup = () => {
        void supabase.removeChannel(channel);
      };
    };

    let cleanup = (): void => {};
    void start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [modelId]);

  return useMemo<ReactionMap>(() => {
    const m: ReactionMap = {};
    for (const r of rows) {
      const byEmoji = m[r.brick_id] ?? (m[r.brick_id] = {});
      const agg = byEmoji[r.emoji] ?? (byEmoji[r.emoji] = { count: 0, profileIds: new Set() });
      if (agg.profileIds.has(r.profile_id)) continue;
      agg.profileIds.add(r.profile_id);
      agg.count += 1;
    }
    return m;
  }, [rows]);
}
