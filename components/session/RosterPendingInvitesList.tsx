'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/db/client';
import { subscribeAuthedChannel } from '@/lib/db/realtimeChannel';
import {
  cancelInvitationAction,
  resendInvitationAction,
} from '@/app/(authed)/app/sessions/roster-actions';

interface Row {
  id: string;
  email: string;
  invited_at: string;
}

interface Props {
  sessionId: string;
  /** Fired with the invitee's email once a cancel removes the invitation. */
  onCancelled?: (email: string) => void;
}

function relativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const ms = now.getTime() - date.getTime();
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function RosterPendingInvitesList({ sessionId, onCancelled }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  // Initial load + realtime subscription
  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let active = true;

    const reload = async () => {
      const { data, error } = await supabase
        .from('session_invitations')
        .select('id, email, invited_at')
        .eq('session_id', sessionId)
        .is('claimed_at', null)
        .order('invited_at', { ascending: false });

      if (!active) return;

      if (error) {
        console.error('Failed to load pending invitations:', error);
        return;
      }

      setRows(data || []);
    };

    void reload();

    // Subscribe to session_invitations changes
    const cleanupChannel = subscribeAuthedChannel({
      channelKey: `pending-invites:${sessionId}`,
      attach: (channel) =>
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'session_invitations',
            filter: `session_id=eq.${sessionId}`,
          },
          () => void reload(),
        ),
    });

    return () => {
      active = false;
      cleanupChannel();
    };
  }, [sessionId]);

  const handleCancel = async (invitationId: string, email: string) => {
    const result = await cancelInvitationAction(invitationId);
    // Drop the row immediately — the Realtime DELETE event confirms it, and
    // `invitation_not_found` means the row is already gone (stale list).
    if (result.ok || result.code === 'invitation_not_found') {
      setRows((prev) => prev.filter((row) => row.id !== invitationId));
      onCancelled?.(email);
      return;
    }
    console.error('Failed to cancel invitation:', result.code);
  };

  const handleResend = async (invitationId: string) => {
    const result = await resendInvitationAction(invitationId);
    // Realtime subscription refreshes the list; a not-found row is already
    // gone, so drop it rather than leaving a dead entry on screen.
    if (!result.ok) {
      if (result.code === 'invitation_not_found') {
        setRows((prev) => prev.filter((row) => row.id !== invitationId));
        return;
      }
      console.error('Failed to resend invitation:', result.code);
    }
  };

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
        aria-label={
          collapsed
            ? `Expand pending invites (${rows.length})`
            : `Collapse pending invites (${rows.length})`
        }
      >
        <span className="text-xs">{collapsed ? '▶' : '▼'}</span>
        Pending invites ({rows.length})
      </button>

      {!collapsed && (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-900 truncate">{row.email}</div>
                <div className="text-xs text-zinc-500">Invited {relativeTime(row.invited_at)}</div>
              </div>

              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleResend(row.id)}
                  className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
                  title="Resend invitation email"
                  aria-label={`Resend invitation to ${row.email}`}
                >
                  Resend
                </button>
                <button
                  type="button"
                  onClick={() => handleCancel(row.id, row.email)}
                  className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  title="Cancel this invitation"
                  aria-label={`Cancel invitation to ${row.email}`}
                >
                  Cancel
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
