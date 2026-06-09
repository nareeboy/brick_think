'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useState } from 'react';

import { useSpotlightRect } from './useSpotlightRect';

const ONBOARDING_PARAM = 'onboarding';
const ONBOARDING_VALUE = 'start-model';

interface Step {
  selector: string;
  title: string;
  body: string;
}

// Two-step sequence for checklist step 3 ("Open a stage and start your first
// model"): first the stage-timer Start button, then Start your model. Both
// targets live on the first stage card (data-tour-id set when isFirst).
const STEPS: Step[] = [
  {
    selector: '[data-tour-id="stage-timer-start"]',
    title: 'Open the stage',
    body: 'Click Start to open this stage and get its timer ready.',
  },
  {
    selector: '[data-tour-id="start-model-button"]',
    title: 'Start your model',
    body: 'Click Start your model to open your canvas and place your first bricks.',
  },
];

/**
 * Triggered by the checklist step-3 link (`?onboarding=start-model`). Scrolls
 * the first stage into view and spotlights the Start button, then the Start
 * your model button. The highlighted buttons stay clickable (overlay is
 * pointer-events-none); clicking one advances. Esc / Skip dismiss; the param
 * is stripped on finish so a refresh doesn't re-fire it.
 */
export function StartModelSpotlight() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const bodyId = useId();
  const maskId = useId();

  const requested = searchParams.get(ONBOARDING_PARAM) === ONBOARDING_VALUE;
  const [dismissed, setDismissed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const active = requested && !dismissed && stepIndex < STEPS.length;
  const step = active ? STEPS[stepIndex]! : null;
  const rect = useSpotlightRect(step ? step.selector : null, active);

  // Reset when a fresh request arrives (user clicks the step again).
  useEffect(() => {
    if (requested) {
      setDismissed(false);
      setStepIndex(0);
    }
  }, [requested]);

  const finish = useCallback(() => {
    setDismissed(true);
    const next = new URLSearchParams(searchParams);
    next.delete(ONBOARDING_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const advance = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= STEPS.length) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [finish]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish]);

  // Clicking the highlighted button advances the sequence (and runs its own
  // action — start the stage / open the canvas).
  useEffect(() => {
    if (!active || !rect || !step) return;
    const el = document.querySelector(step.selector);
    if (!el) return;
    const onClick = () => advance();
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [active, rect, step, advance]);

  if (!active || !rect || !step) return null;

  const isLast = stepIndex === STEPS.length - 1;
  const padding = 8;
  const x = rect.left - padding;
  const y = rect.top - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  // Tooltip prefers the left of the button (these targets sit on the right of
  // the card), flipping right then below if it would clip the viewport.
  const TOOLTIP_W = 300;
  const GAP = 16;
  const viewportW = window.innerWidth;
  let tooltipLeft = rect.left - TOOLTIP_W - GAP;
  let tooltipTop = rect.top;
  if (tooltipLeft < 16) {
    tooltipLeft = rect.right + GAP;
    if (tooltipLeft + TOOLTIP_W > viewportW - 16) {
      tooltipLeft = Math.max(16, rect.left);
      tooltipTop = rect.bottom + GAP;
    }
  }

  return (
    <div data-testid="start-model-spotlight" className="pointer-events-none fixed inset-0 z-30">
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
            onClick={finish}
            data-testid="start-model-spotlight-skip"
            className="cursor-pointer text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={advance}
            data-testid="start-model-spotlight-next"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47]"
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
