'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useState } from 'react';

import { useOnboardingState } from './useOnboardingState';
import { useSpotlightRect } from './useSpotlightRect';

const TARGET_SELECTOR = '[data-tour-id="new-workshop-button"]';
const ONBOARDING_PARAM = 'onboarding';
const ONBOARDING_VALUE = 'create-workshop';

/**
 * Single-target spotlight on the workshops list: dims the screen and cuts out
 * the "New workshop" button. Triggered by the welcome modal's workshop card
 * (`?onboarding=create-workshop`). The highlighted button stays clickable —
 * its link carries the param to /app/workshops/new, where the form spotlight
 * (CreateWorkshopFormSpotlight) continues the tour.
 */
export function CreateWorkshopSpotlight() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const bodyId = useId();
  const maskId = useId();

  const { markPathway, markSessionTourSeen } = useOnboardingState();
  const requested = searchParams.get(ONBOARDING_PARAM) === ONBOARDING_VALUE;
  // Session-pathway detour: the user clicked "Start a session" with no
  // workshop yet, so this tour is running on the session card's behalf.
  const sessionIntent = searchParams.get('intent') === 'session';
  const [dismissed, setDismissed] = useState(false);

  const active = requested && !dismissed;
  const rect = useSpotlightRect(active ? TARGET_SELECTOR : null, active);

  // Reset the dismissed latch whenever a fresh request comes in.
  useEffect(() => {
    if (requested) setDismissed(false);
  }, [requested]);

  const quietExit = useCallback(() => {
    setDismissed(true);
    const next = new URLSearchParams(searchParams);
    next.delete(ONBOARDING_PARAM);
    next.delete('intent');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  // The Skip button records an honest skip: it stops the prompting for the
  // pathway this tour is running FOR (the session pathway on a session-intent
  // detour, otherwise the workshop pathway) but never ticks it as done and
  // never celebrates. Esc stays quiet (no state at all).
  const skip = useCallback(() => {
    if (sessionIntent) {
      markPathway('session', 'skipped');
      // Opting out of the session teaching — the session page's stage tour
      // shouldn't ambush them later either.
      markSessionTourSeen();
    } else {
      markPathway('workshop', 'skipped');
    }
    quietExit();
  }, [sessionIntent, markPathway, markSessionTourSeen, quietExit]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') quietExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, quietExit]);

  // Clicking the highlighted button proceeds to /app/workshops/new (the link
  // itself carries the onboarding param) — just get the overlay out of the way.
  useEffect(() => {
    if (!active || !rect) return;
    const el = document.querySelector(TARGET_SELECTOR);
    if (!el) return;
    const onTargetClick = () => setDismissed(true);
    el.addEventListener('click', onTargetClick);
    return () => el.removeEventListener('click', onTargetClick);
  }, [active, rect]);

  if (!active || !rect) return null;

  const padding = 8;
  const x = rect.left - padding;
  const y = rect.top - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  // Tooltip below the button (it lives in the page header), flipping above if
  // it would clip, right-aligned to read as attached to a header-right action.
  const TOOLTIP_W = 300;
  const GAP = 14;
  const viewportH = window.innerHeight;
  let tooltipTop = rect.bottom + GAP;
  if (tooltipTop + 160 > viewportH) tooltipTop = Math.max(16, rect.top - 160 - GAP);
  let tooltipLeft = rect.right - TOOLTIP_W;
  if (tooltipLeft < 16) tooltipLeft = 16;

  return (
    <div data-testid="create-workshop-spotlight" className="pointer-events-none fixed inset-0 z-30">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full motion-safe:transition-opacity"
        width="100%"
        height="100%"
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} rx="10" fill="black" />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.55)"
          mask={`url(#${maskId})`}
        />
      </svg>
      <div
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        style={{ left: tooltipLeft, top: tooltipTop, width: TOOLTIP_W }}
        className="pointer-events-auto absolute rounded-2xl bg-white p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Get started
        </p>
        <h2 id={titleId} className="mt-1 text-[16px] font-semibold tracking-tight text-zinc-950">
          Create your first workshop
        </h2>
        <p id={bodyId} className="mt-2 text-[13px] leading-relaxed text-zinc-700">
          Click <span className="font-semibold text-zinc-900">New workshop</span> to set up the
          space your remote team will share.
        </p>
        <div className="mt-4 flex justify-start">
          <button
            type="button"
            onClick={skip}
            data-testid="create-workshop-spotlight-skip"
            className="cursor-pointer text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
          >
            Skip tour
          </button>
        </div>
      </div>
    </div>
  );
}
