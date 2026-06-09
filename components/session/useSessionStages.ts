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

export function useSessionStages(
  sessionId: string,
  // Optional suffix so a second consumer on the same page (e.g. the sidebar
  // active-stage bar) subscribes on a distinct Realtime topic — Phoenix rejects
  // two joins to the same topic on one socket, so the channel name must differ.
  channelKey?: string,
): {
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
    let channel: ReturnType<typeof supabase.channel> | null = null;

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
      if (stagesRes.data) setStages(stagesRes.data as unknown as StageRow[]);
      if (sessionRes.data) setSession(sessionRes.data as unknown as SessionRow);
      setReady(true);
    };

    const start = async () => {
      // Supabase Realtime only calls setAuth on TOKEN_REFRESHED / SIGNED_IN events.
      // When the user already has an active session on page load, the auth-js library
      // emits INITIAL_SESSION instead — which is NOT handled by SupabaseClient's
      // _handleTokenChanged, so realtime.setAuth is never called and all
      // postgres_changes events are evaluated as the anon user (failing RLS).
      // Fix: eagerly fetch the current token and set it on the Realtime client
      // before creating any channels so the WS join frame carries the JWT.
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      void refetch();

      let hasSubscribedBefore = false;
      channel = supabase
        .channel(`session:${sessionId}${channelKey ? `:${channelKey}` : ''}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'stages', filter: `session_id=eq.${sessionId}` },
          (payload) => {
            if (cancelled) return;
            const eventType = (payload as unknown as { eventType?: string }).eventType;
            const next = (payload as unknown as { new?: StageRow }).new;
            const old = (payload as unknown as { old?: { id: string } }).old;
            if (eventType === 'INSERT' && next) {
              setStages((prev) => {
                // Guard against Realtime replaying INSERT events for rows
                // already present in the initial fetch (can happen when the
                // subscription catches up to WAL events emitted just before
                // the channel joined, particularly on the local Supabase CLI stack).
                if (prev.some((s) => s.id === next.id)) return prev;
                return [...prev, next].sort((a, b) => a.position - b.position);
              });
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
    };

    void start();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionId, channelKey]);

  return { stages, session, ready };
}
