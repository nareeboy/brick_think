'use client';

import { useEffect, useState, useRef } from 'react';
import { getBrowserSupabaseClient } from '@/lib/db/client';
import { removeParticipantAction, setSpotlightAction } from '@/app/(authed)/app/sessions/roster-actions';
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
  const [spotlightTargetId, setSpotlightTargetId] = useState<string | null>(null);
  const [openMenuRow, setOpenMenuRow] = useState<string | null>(null);
  const menuRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Initial load + realtime subscription
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

    // Subscribe to sessions spotlight changes. Distinct channel name from
    // SpotlightBanner.tsx (which also subscribes to spotlight changes on
    // the same session): the Realtime client throws
    // "cannot add `postgres_changes` callbacks ... after subscribe()" when
    // two mount sites collide on a channel name. Suffix this listener so
    // the two channels stay independent.
    const sessChannel = supabase
      .channel(`roster-spotlight:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new?.spotlight_target_profile_id) {
            setSpotlightTargetId(payload.new.spotlight_target_profile_id as string);
          } else {
            setSpotlightTargetId(null);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(partChannel);
      supabase.removeChannel(sessChannel);
    };
  }, [sessionId]);

  // Close menu on outside click
  useEffect(() => {
    if (!openMenuRow) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is inside the menu for the open row
      if (openMenuRow && menuRef.current[openMenuRow]?.contains(target)) {
        return;
      }
      // Check if click is on a kebab button
      if (target.closest('[data-roster-kebab]')) {
        return;
      }
      setOpenMenuRow(null);
    };

    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [openMenuRow]);

  const handleRemove = async (profileId: string) => {
    const result = await removeParticipantAction(sessionId, profileId);
    if (result.ok) {
      setOpenMenuRow(null);
    }
  };

  const handleToggleSpotlight = async (profileId: string) => {
    const newTarget = spotlightTargetId === profileId ? null : profileId;
    const result = await setSpotlightAction(sessionId, newTarget);
    if (result.ok) {
      setOpenMenuRow(null);
      setSpotlightTargetId(newTarget);
    }
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
            const isSpotlit = spotlightTargetId === row.profile_id;
            const isMenuOpen = openMenuRow === row.profile_id;

            return (
              <li
                key={row.profile_id}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  isSpotlit
                    ? 'border-l-2 border-l-[#c0613d] bg-[#c0613d]/5'
                    : 'hover:bg-zinc-50'
                }`}
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
                  <div className="relative">
                    <button
                      type="button"
                      data-roster-kebab={row.profile_id}
                      onClick={() => setOpenMenuRow(isMenuOpen ? null : row.profile_id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-zinc-200 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                      title="Actions"
                      aria-label="Actions for this participant"
                    >
                      <svg
                        className="h-4 w-4 text-zinc-600"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <circle cx="8" cy="3" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                        <circle cx="8" cy="13" r="1.5" />
                      </svg>
                    </button>

                    {isMenuOpen && (
                      <div
                        ref={(el) => {
                          if (el) menuRef.current[row.profile_id] = el;
                        }}
                        className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-zinc-200 bg-white shadow-lg"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSpotlight(row.profile_id)}
                          className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 first:rounded-t-md"
                        >
                          {spotlightTargetId === row.profile_id
                            ? 'Remove spotlight'
                            : 'Spotlight'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(row.profile_id)}
                          className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 last:rounded-b-md"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
