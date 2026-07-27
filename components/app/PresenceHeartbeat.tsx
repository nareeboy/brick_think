'use client';

import { useEffect } from 'react';

import { getBrowserSupabaseClient } from '@/lib/db/client';

const PING_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Invisible presence heartbeat: upserts profile_presence.last_seen_at via the
 * touch_presence RPC on mount and every 2 minutes while the tab is visible.
 * "Online" on the admin dashboard = seen within the last 5 minutes.
 * Fire-and-forget — a failed ping must never surface to the user.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let lastPingAt = 0;
    let cancelled = false;

    const ping = () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      lastPingAt = Date.now();
      supabase.rpc('touch_presence').then(
        () => undefined,
        () => undefined,
      );
    };

    ping();
    const interval = setInterval(ping, PING_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastPingAt >= PING_INTERVAL_MS) {
        ping();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}
