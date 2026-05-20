'use client';

import { useEffect, useMemo, useState } from 'react';

import { getBrowserSupabaseClient } from '@/lib/db/client';
import type { CommentRow } from '@/lib/brickFeedback/loadInitial';

export interface CommentMap {
  [brickId: string]: CommentRow[];
}

/**
 * Subscribes to `brick_comments` INSERT/UPDATE realtime events for a model
 * and projects the resulting row set into a `brick → comments[]` map.
 *
 * Hydrates from the server-rendered `initial` rows (already DESC by
 * `created_at` from `loadInitialBrickFeedback`); the channel hydrates on top.
 * INSERT is deduped by id to defend against WAL replay on local Supabase
 * (mirrors the `useBrickReactions` dedup gotcha). UPDATE is only meaningful
 * here when `deleted_at` flips non-null — that's a soft-delete, so the row
 * is dropped from the projection.
 */
export function useBrickComments(modelId: string, initial: CommentRow[]): CommentMap {
  const [rows, setRows] = useState<CommentRow[]>(initial);

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
        .channel(`brick-comments:${modelId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'brick_comments',
            filter: `model_id=eq.${modelId}`,
          },
          (payload) => {
            const r = payload.new as {
              id: string;
              brick_id: string;
              profile_id: string | null;
              body: string;
              created_at: string;
              deleted_at: string | null;
            };
            if (r.deleted_at) return;
            setRows((s) => {
              if (s.some((x) => x.id === r.id)) return s;
              return [
                {
                  id: r.id,
                  brick_id: r.brick_id,
                  profile_id: r.profile_id,
                  body: r.body,
                  created_at: r.created_at,
                  // Realtime payload doesn't carry the joined profile name;
                  // surface as null and let consumers fall back ("Removed
                  // user" / similar). A subsequent page refresh hydrates
                  // the joined name from `loadInitialBrickFeedback`.
                  full_name: null,
                },
                ...s,
              ];
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'brick_comments',
            filter: `model_id=eq.${modelId}`,
          },
          (payload) => {
            const r = payload.new as { id: string; deleted_at: string | null };
            setRows((s) => {
              if (r.deleted_at) return s.filter((x) => x.id !== r.id);
              return s;
            });
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

  return useMemo<CommentMap>(() => {
    const m: CommentMap = {};
    for (const r of rows) {
      const list = m[r.brick_id] ?? (m[r.brick_id] = []);
      list.push(r);
    }
    return m;
  }, [rows]);
}
