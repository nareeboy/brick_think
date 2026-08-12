'use client';

import { useState, useEffect } from 'react';
import { RosterModal } from './RosterModal';
import { getBrowserSupabaseClient } from '@/lib/db/client';
import { subscribeAuthedChannel } from '@/lib/db/realtimeChannel';

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

    void reload();

    const cleanupChannel = subscribeAuthedChannel({
      channelKey: `roster-count:${sessionId}`,
      attach: (channel) =>
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'session_participants',
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5 active:scale-[0.98]"
      >
        Invite Members{count !== null ? ` (${count})` : ''}
      </button>
      <RosterModal
        sessionId={sessionId}
        joinCode={joinCode}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
