'use client';

import { useCallback, useEffect, useState } from 'react';

import { setSpotlightAction } from '@/app/(authed)/app/sessions/roster-actions';
import { getBrowserSupabaseClient } from '@/lib/db/client';

interface UseSpotlightTarget {
  /** The spotlit canvas id for this session, or null when nothing is spotlit. */
  targetModelId: string | null;
  /** The model id whose spotlight toggle is mid-request (disables that button). */
  pendingModelId: string | null;
  /** Toggle the spotlight on a canvas: spotlight it, or clear it if already lit. */
  toggle: (modelId: string) => Promise<void>;
}

/**
 * Live `sessions.spotlight_target_model_id` for a session, plus a toggle that
 * drives `setSpotlightAction`. Shared by the facilitator's Participants panel
 * and Rooms panel so both reflect the same spotlight without a refresh.
 *
 * Realtime auth is primed via `setAuth` before subscribing so RLS-filtered
 * `postgres_changes` payloads reach this client (see useSessionStages.ts for
 * the canonical pattern + rationale).
 */
export function useSpotlightTarget(sessionId: string): UseSpotlightTarget {
  const [targetModelId, setTargetModelId] = useState<string | null>(null);
  const [pendingModelId, setPendingModelId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('spotlight_target_model_id')
        .eq('id', sessionId)
        .maybeSingle();
      if (active) setTargetModelId(data?.spotlight_target_model_id ?? null);
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (active && token) await supabase.realtime.setAuth(token);
    })();
    void load();

    const channel = supabase
      .channel(`spotlight-target:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          setTargetModelId((payload.new?.spotlight_target_model_id as string | null) ?? null);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const toggle = useCallback(
    async (modelId: string) => {
      const next = targetModelId === modelId ? null : modelId;
      setPendingModelId(modelId);
      const result = await setSpotlightAction(sessionId, next);
      setPendingModelId(null);
      if (result.ok) setTargetModelId(next);
    },
    [sessionId, targetModelId],
  );

  return { targetModelId, pendingModelId, toggle };
}
