'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/db/client';
import {
  getSpotlightBannerAction,
  type SpotlightBannerState,
} from '@/app/(authed)/app/sessions/roster-actions';
import { usePrefersReducedMotion } from '@/lib/a11y/usePrefersReducedMotion';

interface Props {
  sessionId: string;
}

export function SpotlightBanner({ sessionId }: Props) {
  const [target, setTarget] = useState<SpotlightBannerState | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Resolve the spotlight server-side (it decides whether this viewer should
  // see the banner at all) and re-resolve on any sessions UPDATE.
  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let active = true;

    const loadTarget = async () => {
      const next = await getSpotlightBannerAction(sessionId);
      if (active) setTarget(next);
    };

    // Prime realtime auth so RLS-filtered payloads reach this client.
    // See useSessionStages.ts for the canonical pattern + rationale.
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (active && token) await supabase.realtime.setAuth(token);
    })();

    void loadTarget();

    const channel = supabase
      .channel(`spotlight:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        () => void loadTarget(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (!target || dismissedKey === `${sessionId}:${target.modelId}`) {
    return null;
  }

  const currentKey = `${sessionId}:${target.modelId}`;

  const animationClasses = prefersReducedMotion
    ? ''
    : 'motion-safe:animate-in motion-safe:slide-in-from-top motion-safe:duration-300';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-0 z-40 w-full bg-emerald-50 border-b border-emerald-200/60 px-5 py-3 text-sm ${animationClasses}`}
    >
      <div className="mx-auto max-w-[900px] flex items-center justify-between gap-4">
        <p className="text-zinc-900">
          <span className="font-semibold">{target.facilitatorName}</span> is showing{' '}
          <span className="font-semibold">{target.presenterLabel}</span>
          {target.isRoom ? '' : "'s canvas"}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push(target.url)}
            className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 active:scale-[0.98] transition-colors"
          >
            Open it
          </button>
          <button
            onClick={() => setDismissedKey(currentKey)}
            className="inline-flex items-center px-3 py-1.5 rounded-md bg-white text-zinc-700 text-xs font-medium border border-zinc-200 hover:bg-zinc-50 active:scale-[0.98] transition-colors"
            aria-label="Dismiss spotlight banner"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
