'use client';

import { useEffect, useState } from 'react';

import { getBrowserSupabaseClient } from '@/lib/db/client';
import { subscribeAuthedChannel } from '@/lib/db/realtimeChannel';
import type { StageRuntime } from '@/lib/sessions/computeRemainingMs';

export type StageRow = StageRuntime & {
  id: string;
  session_id: string;
  stage_type: string;
  position: number;
  title: string | null;
  description: string | null;
  ended_at: string | null;
  // Optional in the type so existing test fixtures don't have to set it;
  // every Postgres-sourced row carries this column (added 2026-05-19).
  scenario_id?: string | null;
  // Per-session overrides of the canonical scenario title / body
  // (added 2026-05-20). Null = use the canonical value.
  scenario_body_override?: string | null;
  scenario_title_override?: string | null;
};

export type SessionRow = {
  id: string;
  current_stage_id: string | null;
  status: string;
};

// One subscription per page: on the session detail page consumers share it
// via SessionStagesProvider rather than each calling this hook — Phoenix
// rejects two joins to the same topic on one socket anyway.
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
            'id, session_id, stage_type, position, title, description, duration_seconds, started_at, ended_at, status, paused_at, total_paused_ms, extended_seconds, scenario_id, scenario_body_override, scenario_title_override',
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
      if (sessionRes.error)
        console.error('useSessionStages: session fetch failed', sessionRes.error);
      if (stagesRes.data) setStages(stagesRes.data);
      if (sessionRes.data) setSession(sessionRes.data);
      setReady(true);
    };

    // Auth priming (setAuth before the channel exists — see the rationale in
    // lib/db/realtimeChannel.ts) is owned by subscribeAuthedChannel.
    void refetch();

    let hasSubscribedBefore = false;
    const cleanupChannel = subscribeAuthedChannel({
      channelKey: `session:${sessionId}`,
      attach: (ch) =>
        ch
          .on<StageRow>(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'stages', filter: `session_id=eq.${sessionId}` },
            (payload) => {
              if (cancelled) return;
              if (payload.eventType === 'INSERT') {
                const next = payload.new;
                setStages((prev) => {
                  // Guard against Realtime replaying INSERT events for rows
                  // already present in the initial fetch (can happen when the
                  // subscription catches up to WAL events emitted just before
                  // the channel joined, particularly on the local Supabase CLI stack).
                  if (prev.some((s) => s.id === next.id)) return prev;
                  return [...prev, next].sort((a, b) => a.position - b.position);
                });
              } else if (payload.eventType === 'UPDATE') {
                const next = payload.new;
                setStages((prev) => prev.map((s) => (s.id === next.id ? next : s)));
              } else if (payload.eventType === 'DELETE') {
                // `old` is Partial<StageRow> — only REPLICA IDENTITY columns arrive.
                const oldId = payload.old.id;
                if (oldId) setStages((prev) => prev.filter((s) => s.id !== oldId));
              }
            },
          )
          .on<SessionRow>(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
            (payload) => {
              if (cancelled) return;
              setSession(payload.new);
            },
          ),
      onStatus: (status) => {
        // Skip the initial SUBSCRIBED — refetch() was called inline at mount.
        // Subsequent SUBSCRIBED events indicate a reconnect after CHANNEL_ERROR /
        // CLOSED, where we need to backfill any missed postgres_changes.
        if (status === 'SUBSCRIBED') {
          if (hasSubscribedBefore) void refetch();
          hasSubscribedBefore = true;
        }
      },
    });

    return () => {
      cancelled = true;
      cleanupChannel();
    };
  }, [sessionId]);

  return { stages, session, ready };
}
