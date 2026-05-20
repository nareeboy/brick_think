'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/db/client';
import { restoreParticipantAction } from '@/app/(authed)/app/sessions/roster-actions';
import { Avatar } from '@/components/app/Avatar';

interface Row {
  profile_id: string;
  removed_at: string;
  full_name: string | null;
  email: string;
}

interface Props {
  sessionId: string;
}

export function RosterRemovedList({ sessionId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [collapsed, setCollapsed] = useState(true);

  // Initial load + realtime subscription
  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let active = true;

    const reload = async () => {
      const { data: parts, error } = await supabase
        .from('session_participants')
        .select('profile_id, removed_at')
        .eq('session_id', sessionId)
        .not('removed_at', 'is', null)
        .order('removed_at', { ascending: false });

      if (!active) return;

      if (error) {
        console.error('Failed to load removed participants:', error);
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
        .select('id, full_name, email')
        .in('id', profileIds);

      if (profError) {
        console.error('Failed to load profiles:', profError);
        return;
      }

      // Create a map of profiles by id for fast lookup
      const profileMap = new Map(
        (profiles || []).map((p: { id: string; full_name: string | null; email: string }) => [
          p.id,
          {
            full_name: p.full_name ?? null,
            email: p.email,
          },
        ]),
      );

      // Flatten and merge
      const flattened = (parts || [])
        .map((row: { profile_id: string; removed_at: string }) => {
          const profile = profileMap.get(row.profile_id);
          return {
            profile_id: row.profile_id,
            removed_at: row.removed_at,
            full_name: profile?.full_name ?? null,
            email: profile?.email ?? '',
          };
        })
        .filter((row) => row.email); // Ensure we have email data

      setRows(flattened);
    };

    void reload();

    // Subscribe to session_participants changes
    const channel = supabase
      .channel(`removed-participants:${sessionId}`)
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
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleRestore = async (profileId: string) => {
    const result = await restoreParticipantAction(sessionId, profileId);
    // Realtime subscription will refresh the list automatically
    if (!result.ok) {
      console.error('Failed to restore participant:', result.code);
    }
  };

  const displayName = (row: Row) => row.full_name || row.email;

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:text-zinc-700 transition-colors"
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Expand removed participants (${rows.length})` : `Collapse removed participants (${rows.length})`}
      >
        <span className="text-xs">{collapsed ? '▶' : '▼'}</span>
        Removed ({rows.length})
      </button>

      {!collapsed && (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li
              key={row.profile_id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar
                  url={null}
                  name={displayName(row)}
                  size="sm"
                />

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-900 truncate">
                    {displayName(row)}
                  </div>
                  {row.full_name && (
                    <div className="text-xs text-zinc-500 truncate">
                      {row.email}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRestore(row.profile_id)}
                className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors shrink-0"
                title="Restore this participant"
                aria-label={`Restore ${displayName(row)} to the session`}
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
