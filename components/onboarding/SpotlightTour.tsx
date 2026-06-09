'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { celebrate } from '@/lib/onboarding/celebrate';

import { useOnboardingState } from './useOnboardingState';

interface Step {
  selector: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    selector: '[data-tour-id="session-header"]',
    title: 'This is a session',
    body: 'The cards below are stages — different exercises you move through together.',
  },
  {
    selector: '[data-tour-id="first-stage-card"]',
    title: 'Stages',
    body: 'Click a stage to start your model for it.',
  },
  {
    selector: '[data-tour-id="stage-meta-pencil"]',
    title: 'Rename a stage',
    body: "Edit a stage's title or description for this session if the defaults don't fit.",
  },
];

interface Props {
  canManageSession: boolean;
  /** Suppress the auto-tour when another onboarding spotlight is taking over
   *  this page (e.g. the checklist step-3 "start your model" sequence), so the
   *  two overlays don't stack. */
  suppressed?: boolean;
}

export function SpotlightTour({ canManageSession, suppressed = false }: Props) {
  const { role, sessionTourSeen, hydrated, markSessionTourSeen } = useOnboardingState();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const titleId = useId();
  const bodyId = useId();
  const maskId = useId();
  const ctaRef = useRef<HTMLButtonElement>(null);

  // Steps the current viewer can actually see. The pencil only renders for
  // facilitators/admins, so it's filtered out for plain participants — they
  // never get the tour at all here (the participant branch uses the coach-
  // mark instead) but this keeps the filter honest if reused later.
  // Memoized on canManageSession to avoid a new array reference every render,
  // which would cause the useLayoutEffect to re-fire needlessly.
  const visibleSteps = useMemo(
    () =>
      STEPS.filter((step) => {
        if (step.selector === '[data-tour-id="stage-meta-pencil"]' && !canManageSession) {
          return false;
        }
        return true;
      }),
    [canManageSession],
  );

  const active =
    !suppressed &&
    hydrated &&
    role === 'facilitator' &&
    !sessionTourSeen &&
    stepIndex < visibleSteps.length;

  const finish = useCallback(() => {
    markSessionTourSeen();
  }, [markSessionTourSeen]);

  // Track the target every frame so the cut-out stays glued to it through
  // hydration and layout shifts — e.g. the FacilitatorChecklist mounts above
  // the header after hydration and pushes targets down, a shift that fires no
  // scroll/resize event. setRect only fires when the box actually moves, so
  // tracking settles to a no-op. A missing target silently advances.
  useLayoutEffect(() => {
    if (!active) return;
    // stepIndex < visibleSteps.length is asserted by `active`
    const step = visibleSteps[stepIndex]!;
    let rafId = 0;
    let lastKey = '';
    let scrolled = false;
    const tick = () => {
      const el = document.querySelector(step.selector);
      if (!el) {
        // Silent skip — advance to the next step (finish past the end).
        setRect(null);
        setStepIndex((i) => {
          const next = i + 1;
          if (next >= visibleSteps.length) {
            finish();
          }
          return next;
        });
        return; // effect re-runs for the new step; schedule no further frames
      }
      // Bring an off-screen target (e.g. a stage card below the fold) into
      // view once, so its highlight + tooltip are actually visible. Skip when
      // it's already fully in view so visible steps (the header) don't jump.
      if (!scrolled) {
        scrolled = true;
        const vr = el.getBoundingClientRect();
        if (vr.top < 0 || vr.bottom > window.innerHeight) {
          el.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
      }
      const r = el.getBoundingClientRect();
      const key = `${r.left},${r.top},${r.width},${r.height}`;
      if (key !== lastKey) {
        lastKey = key;
        setRect(r);
      }
      rafId = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(rafId);
  }, [active, stepIndex, visibleSteps, finish]);

  useEffect(() => {
    if (active) ctaRef.current?.focus();
  }, [active, stepIndex]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish]);

  if (!active || !rect) return null;

  // stepIndex < visibleSteps.length is asserted by `active`
  const step = visibleSteps[stepIndex]!;
  const isLast = stepIndex === visibleSteps.length - 1;
  const padding = 8;
  const x = rect.left - padding;
  const y = rect.top - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  // Tooltip position: prefer right, flip to left if overflow, fall back to
  // below if neither horizontal side fits.
  const TOOLTIP_W = 320;
  const TOOLTIP_GAP = 16;
  const viewportW = window.innerWidth;
  let tooltipLeft = rect.right + TOOLTIP_GAP;
  let tooltipTop = rect.top;
  if (tooltipLeft + TOOLTIP_W > viewportW - 16) {
    tooltipLeft = rect.left - TOOLTIP_W - TOOLTIP_GAP;
  }
  if (tooltipLeft < 16) {
    tooltipLeft = Math.max(16, rect.left);
    tooltipTop = rect.bottom + TOOLTIP_GAP;
  }

  return (
    <div data-testid="onboarding-spotlight" className="fixed inset-0 z-50">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full motion-safe:transition-opacity"
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
        className="absolute rounded-2xl bg-white p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Step {stepIndex + 1} of {visibleSteps.length}
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
            onClick={finish}
            data-testid="onboarding-spotlight-skip"
            className="cursor-pointer text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
          >
            Skip
          </button>
          <button
            ref={ctaRef}
            type="button"
            onClick={() => {
              if (isLast) {
                // Genuine completion — celebrate. (Skip/Esc also call finish()
                // but deliberately get no confetti.)
                void celebrate();
                finish();
                return;
              }
              setRect(null);
              setStepIndex((i) => i + 1);
            }}
            data-testid="onboarding-spotlight-next"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47]"
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
