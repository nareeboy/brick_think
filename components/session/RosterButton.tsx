'use client';

import { useState, useEffect } from 'react';
import { RosterModal } from './RosterModal';
import { getBrowserSupabaseClient } from '@/lib/db/client';

export function RosterButton({ sessionId, joinCode }: { sessionId: string; joinCode: string }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let active = true;

    const reload = async () => {
      const { count: c } = await supabase
        .from('session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .is('removed_at', null);
      if (active) setCount(c ?? 0);
    };

    // Prime realtime auth so RLS-filtered payloads reach this client.
    // See useSessionStages.ts for the canonical pattern + rationale.
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (active && token) await supabase.realtime.setAuth(token);
    })();

    void reload();

    const channel = supabase
      .channel(`roster-count:${sessionId}`)
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-900/10 bg-white px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-zinc-50 active:scale-[0.98]"
      >
        Roster{count !== null ? ` (${count})` : ''}
      </button>
      <RosterModal sessionId={sessionId} joinCode={joinCode} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
