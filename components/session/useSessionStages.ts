'use client';

import { useEffect, useState } from 'react';

import { getBrowserSupabaseClient } from '@/lib/db/client';
import type { StageRuntime } from '@/lib/sessions/computeRemainingMs';

export type StageRow = StageRuntime & {
  id: string;
  session_id: string;
  stage_type: string;
  position: number;
  title: string | null;
  description: string | null;
  ended_at: string | null;
};

export type SessionRow = {
  id: string;
  current_stage_id: string | null;
  status: string;
};

export function useSessionStages(sessionId: string): {
  stages: StageRow[];
  session: SessionRow | null;
  ready: boolean;
} {
  const [stages, setStages] = useState<StageRow[]>([]);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let cancelled = false;

    const refetch = async () => {
      const [stagesRes, sessionRes] = await Promise.all([
        supabase
          .from('stages')
          .select(
            'id, session_id, stage_type, position, title, description, duration_seconds, started_at, ended_at, status, paused_at, total_paused_ms, extended_seconds',
          )
          .eq('session_id', sessionId)
          .order('position', { ascending: true }),
        supabase
          .from('sessions')
          .select('id, current_stage_id, status')
          .eq('id', sessionId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (stagesRes.error) console.error('useSessionStages: stages fetch failed', stagesRes.error);
      if (sessionRes.error) console.error('useSessionStages: session fetch failed', sessionRes.error);
      if (stagesRes.data) setStages(stagesRes.data as unknown as StageRow[]);
      if (sessionRes.data) setSession(sessionRes.data as unknown as SessionRow);
      setReady(true);
    };

    void refetch();

    let hasSubscribedBefore = false;
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stages', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (cancelled) return;
          const eventType = (payload as unknown as { eventType?: string }).eventType;
          const next = (payload as unknown as { new?: StageRow }).new;
          const old = (payload as unknown as { old?: { id: string } }).old;
          if (eventType === 'INSERT' && next) {
            setStages((prev) => [...prev, next].sort((a, b) => a.position - b.position));
          } else if (eventType === 'UPDATE' && next) {
            setStages((prev) => prev.map((s) => (s.id === next.id ? next : s)));
          } else if (eventType === 'DELETE' && old) {
            setStages((prev) => prev.filter((s) => s.id !== old.id));
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (cancelled) return;
          const next = (payload as unknown as { new?: SessionRow }).new;
          if (next) setSession(next);
        },
      )
      .subscribe((status) => {
        // Skip the initial SUBSCRIBED — refetch() was called inline at mount.
        // Subsequent SUBSCRIBED events indicate a reconnect after CHANNEL_ERROR /
        // CLOSED, where we need to backfill any missed postgres_changes.
        if (status === 'SUBSCRIBED') {
          if (hasSubscribedBefore) void refetch();
          hasSubscribedBefore = true;
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { stages, session, ready };
}
