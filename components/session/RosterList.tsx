'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/db/client';
import { removeParticipantAction } from '@/app/(authed)/app/sessions/roster-actions';
import { Avatar } from '@/components/app/Avatar';

interface Row {
  profile_id: string;
  joined_at: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface Props {
  sessionId: string;
  facilitatorId?: string;
}

export function RosterList({ sessionId, facilitatorId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);

  // Initial load + realtime subscription.
  //
  // We eagerly prime `supabase.realtime.setAuth(token)` before creating
  // any channels so the WS join frame carries the JWT — otherwise the
  // RLS row-filter on `session_participants` drops every payload and
  // the live count / roster never updates. See useSessionStages.ts for
  // the canonical pattern + rationale.
  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let active = true;

    const reload = async () => {
      const { data: parts, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .is('removed_at', null)
        .order('joined_at', { ascending: true });

      if (!active) return;

      if (error) {
        console.error('Failed to load roster:', error);
        return;
      }

      // Fetch profile details separately
      const profileIds = (parts || []).map((p) => p.profile_id);
      if (profileIds.length === 0) {
        setRows([]);
        return;
      }

      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', profileIds);

      if (profError) {
        console.error('Failed to load profiles:', profError);
        return;
      }

      // Create a map of profiles by id for fast lookup
      const profileMap = new Map(
        (profiles || []).map((p: { id: string; full_name: string | null; email: string; avatar_url: string | null }) => [
          p.id,
          {
            full_name: p.full_name ?? null,
            email: p.email,
            avatar_url: p.avatar_url ?? null,
          },
        ]),
      );

      // Flatten and merge
      const flattened = (parts || [])
        .map((row: { profile_id: string; joined_at: string }) => {
          const profile = profileMap.get(row.profile_id);
          return {
            profile_id: row.profile_id,
            joined_at: row.joined_at,
            full_name: profile?.full_name ?? null,
            email: profile?.email ?? '',
            avatar_url: profile?.avatar_url ?? null,
          };
        })
        .filter((row) => row.email); // Ensure we have email data

      setRows(flattened);
    };

    // Prime realtime auth so RLS-filtered payloads reach this client.
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (active && token) await supabase.realtime.setAuth(token);
    })();

    void reload();

    // Subscribe to session_participants changes
    const partChannel = supabase
      .channel(`roster:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        () => void reload(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(partChannel);
    };
  }, [sessionId]);

  const handleRemove = async (profileId: string) => {
    await removeParticipantAction(sessionId, profileId);
    // Realtime subscription refreshes the list.
  };

  const displayName = (row: Row) => row.full_name || row.email;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-zinc-900">
        In the session ({rows.length})
      </h3>

      {rows.length === 0 ? (
        <div className="text-sm text-zinc-500">No participants yet</div>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => {
            const isFacilitator = row.profile_id === facilitatorId;

            return (
              <li
                key={row.profile_id}
                className="relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-zinc-50"
              >
                <Avatar
                  url={row.avatar_url}
                  name={displayName(row)}
                  size="sm"
                />

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-900 truncate">
                    {displayName(row)}
                    {isFacilitator && (
                      <span className="ml-2 inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                        Facilitator
                      </span>
                    )}
                  </div>
                  {row.full_name && (
                    <div className="text-xs text-zinc-500 truncate">
                      {row.email}
                    </div>
                  )}
                </div>

                {!isFacilitator && (
                  <button
                    type="button"
                    onClick={() => void handleRemove(row.profile_id)}
                    title="Remove from session"
                    aria-label={`Remove ${displayName(row)} from the session`}
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
