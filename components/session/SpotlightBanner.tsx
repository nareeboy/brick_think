'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/lib/db/client';
import { resolveSpotlightTargetModelAction } from '@/app/(authed)/app/sessions/roster-actions';
import { usePrefersReducedMotion } from '@/lib/a11y/usePrefersReducedMotion';

interface Props {
  sessionId: string;
  viewerProfileId: string;
}

interface SpotlightTarget {
  profileId: string;
  name: string;
  facilitatorName: string;
}

function getDisplayName(fullName: string | null, email: string | null, fallback: string): string {
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed;
  if (email) return email;
  return fallback;
}

export function SpotlightBanner({ sessionId, viewerProfileId }: Props) {
  const [target, setTarget] = useState<SpotlightTarget | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Load initial state and subscribe to realtime updates
  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    let active = true;

    const loadTarget = async () => {
      // Fetch session with facilitator and spotlight target
      const { data: session, error: sessionErr } = await supabase
        .from('sessions')
        .select('facilitator_id, spotlight_target_profile_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (!active || sessionErr || !session) return;

      const facilitator_id = session.facilitator_id as string | null;
      const spotlight_target_profile_id = session.spotlight_target_profile_id as string | null;

      // If no target set, target equals null, target equals viewer, or target equals facilitator: hide
      if (
        !spotlight_target_profile_id ||
        spotlight_target_profile_id === viewerProfileId ||
        spotlight_target_profile_id === facilitator_id
      ) {
        setTarget(null);
        return;
      }

      // At this point facilitator_id and spotlight_target_profile_id are definitely strings
      const fId = facilitator_id as string;
      const tId = spotlight_target_profile_id as string;

      // Fetch facilitator + target profile names
      const { data: profilesRaw, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', [fId, tId]);

      const profiles = profilesRaw as Array<{
        id: string;
        full_name: string | null;
        email: string | null;
      }> | null;

      if (!active || profileErr || !profiles) return;

      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      const facilitatorProfile = profileMap.get(fId);
      const targetProfile = profileMap.get(tId);

      if (!facilitatorProfile || !targetProfile) return;

      setTarget({
        profileId: tId,
        name: getDisplayName(targetProfile.full_name, targetProfile.email, 'A participant'),
        facilitatorName: getDisplayName(
          facilitatorProfile.full_name,
          facilitatorProfile.email,
          'Facilitator',
        ),
      });
    };

    // Prime realtime auth so RLS-filtered payloads reach this client.
    // See useSessionStages.ts for the canonical pattern + rationale.
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (active && token) await supabase.realtime.setAuth(token);
    })();

    void loadTarget();

    // Subscribe to sessions UPDATE events
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
  }, [sessionId, viewerProfileId]);

  if (!target || dismissedKey === `${sessionId}:${target.profileId}`) {
    return null;
  }

  const currentKey = `${sessionId}:${target.profileId}`;

  const handleOpenClick = async () => {
    setLoading(true);
    const result = await resolveSpotlightTargetModelAction(sessionId, target.profileId);
    setLoading(false);

    if (!result.ok) {
      // Silently handle failure — the banner doesn't have a toast system
      return;
    }

    if (result.modelUrl) {
      router.push(result.modelUrl);
    }
  };

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
          <span className="font-semibold">{target.name}</span>&apos;s canvas
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenClick}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Opening…' : 'Open it'}
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
