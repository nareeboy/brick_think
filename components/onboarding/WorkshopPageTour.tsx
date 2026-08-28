'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useState } from 'react';

import { celebrate } from '@/lib/onboarding/celebrate';

import { useOnboardingState } from './useOnboardingState';
import { useSpotlightRect } from './useSpotlightRect';

const ONBOARDING_PARAM = 'onboarding';
const ONBOARDING_VALUE = 'workshop-tour';

interface Step {
  selector: string;
  title: string;
  body: string;
}

// Five-stop tour of a freshly created workshop. Targets whose element is
// missing (e.g. Delete workshop for a non-owner) are silently skipped.
const STEPS: Step[] = [
  {
    selector: '[data-tour-id="create-session-button"]',
    title: 'Create a session',
    body: 'Sessions are the working meetings of this workshop. Click Create session whenever you are ready to run one with your team.',
  },
  {
    selector: '[data-tour-id="sessions-container"]',
    title: 'Your sessions live here',
    body: 'Every session in this workshop is listed here. Open one to run its stages, follow the timers, and see everyone’s models.',
  },
  {
    selector: '[data-tour-id="add-member-button"]',
    title: 'Invite your team',
    body: 'Add members by email so they can join your sessions and see the workshop’s shared designs.',
  },
  {
    selector: '[data-tour-id="members-container"]',
    title: 'Who’s in this workshop',
    body: 'Everyone with access appears here with their role. Admins can add or remove people at any time.',
  },
  {
    selector: '[data-tour-id="delete-workshop-button"]',
    title: 'Clean up when done',
    body: 'Finished experimenting? Delete workshop removes this workshop and its sessions. Careful — this cannot be undone.',
  },
];

// If a step's target never appears within this window, skip it.
const SKIP_AFTER_MS = 1200;

const TOOLTIP_W = 320;
const GAP = 16;
const TOOLTIP_H_EST = 190;

/**
 * Guided tour of the workshop page. Fires on the first visit to any workshop
 * page (own seen-flag, like the session tour) and via the chained
 * `?onboarding=workshop-tour` param (redirect after creation).
 * Completing the last step fires confetti and ticks the welcome modal's
 * workshop pathway; Skip records an honest skip (no tick, no confetti); Esc
 * dismisses without any state change.
 */
export function WorkshopPageTour() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const {
    markPathway,
    hydrated,
    role,
    roleChoice,
    tutorialGuestSticky,
    workshopTourSeen,
    markWorkshopTourSeen,
  } = useOnboardingState();
  const titleId = useId();
  const bodyId = useId();
  const maskId = useId();

  const requested = searchParams.get(ONBOARDING_PARAM) === ONBOARDING_VALUE;
  const [dismissed, setDismissed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // First visit to any workshop page re-arms the tour (own seen-flag, like
  // the session tour); the ?onboarding=workshop-tour param still forces it.
  // Guests never get it auto-fired.
  const firstVisit =
    hydrated &&
    !workshopTourSeen &&
    role === 'facilitator' &&
    roleChoice !== 'guest' &&
    !tutorialGuestSticky;

  const active = (requested || firstVisit) && !dismissed && stepIndex < STEPS.length;
  const step = active ? STEPS[stepIndex]! : null;
  const rect = useSpotlightRect(step ? step.selector : null, active);

  useEffect(() => {
    if (requested) {
      setDismissed(false);
      setStepIndex(0);
    }
  }, [requested]);

  const stripParam = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(ONBOARDING_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const complete = useCallback(() => {
    setDismissed(true);
    markWorkshopTourSeen();
    // Genuine completion: tick the welcome modal's workshop card and
    // celebrate in place (the modal returns on the next hub visit).
    markPathway('workshop', 'completed');
    void celebrate();
    stripParam();
  }, [markPathway, markWorkshopTourSeen, stripParam]);

  // The Skip button records an honest skip: it stops the prompting but never
  // ticks the pathway and never celebrates. Esc stays quiet (no state).
  const skip = useCallback(() => {
    setDismissed(true);
    markWorkshopTourSeen();
    markPathway('workshop', 'skipped');
    stripParam();
  }, [markPathway, markWorkshopTourSeen, stripParam]);

  const quietExit = useCallback(() => {
    setDismissed(true);
    markWorkshopTourSeen();
    stripParam();
  }, [markWorkshopTourSeen, stripParam]);

  const goNext = useCallback(() => {
    if (stepIndex + 1 >= STEPS.length) complete();
    else setStepIndex((i) => i + 1);
  }, [stepIndex, complete]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Silent-skip a step whose target never renders. Skipping past the end is
  // a quiet exit — a missing target is not the user finishing the tour, so
  // it never ticks the pathway or celebrates.
  useEffect(() => {
    if (!active || rect) return;
    const t = setTimeout(() => {
      if (stepIndex + 1 >= STEPS.length) quietExit();
      else setStepIndex((i) => i + 1);
    }, SKIP_AFTER_MS);
    return () => clearTimeout(t);
  }, [active, rect, stepIndex, quietExit]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') quietExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, quietExit]);

  if (!active || !rect || !step) return null;

  const padding = 8;
  const x = rect.left - padding;
  const y = rect.top - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  // Small targets get the tooltip below (flipping above near the fold); the
  // wide section containers get it centred beneath their top edge.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isWide = rect.width > vw * 0.7;
  let tooltipLeft: number;
  let tooltipTop: number;
  if (isWide) {
    tooltipLeft = Math.min(
      Math.max(16, rect.left + rect.width / 2 - TOOLTIP_W / 2),
      vw - TOOLTIP_W - 16,
    );
    const below = rect.top + 96 + GAP;
    tooltipTop = Math.min(below, vh - TOOLTIP_H_EST - 16);
  } else {
    tooltipLeft = Math.min(Math.max(16, rect.left), vw - TOOLTIP_W - 16);
    const below = rect.bottom + GAP;
    tooltipTop =
      below + TOOLTIP_H_EST > vh - 16 ? Math.max(16, rect.top - TOOLTIP_H_EST - GAP) : below;
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div data-testid="workshop-page-tour" className="pointer-events-none fixed inset-0 z-30">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full motion-safe:transition-opacity"
        width="100%"
        height="100%"
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} rx="12" fill="black" />
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
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <h2 id={titleId} className="mt-1 text-[16px] font-semibold tracking-tight text-zinc-950">
          {step.title}
        </h2>
        <p id={bodyId} className="mt-2 text-[13px] leading-relaxed text-zinc-700">
          {step.body}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={skip}
            data-testid="workshop-tour-skip"
            className="cursor-pointer text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={isFirst}
              data-testid="workshop-tour-back"
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl px-3 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-900/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              data-testid="workshop-tour-next"
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47]"
            >
              {isLast ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
