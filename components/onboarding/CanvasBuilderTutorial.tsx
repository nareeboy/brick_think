'use client';

import { useCallback, useEffect, useId, useState } from 'react';

import { celebrate } from '@/lib/onboarding/celebrate';

import { useOnboardingState } from './useOnboardingState';
import { useSpotlightRect } from './useSpotlightRect';

interface Step {
  selector: string;
  title: string;
  body: string;
}

// Six-step first-visit tour of the canvas builder. Each selector targets a
// data-tour-id anchor added to the builder components. Steps whose target is
// absent (e.g. the model-title button on a read-only canvas, or the export
// button before a model exists) are silently skipped.
const STEPS: Step[] = [
  {
    selector: '[data-tour-id="canvas-area"]',
    title: 'Your build space',
    body: 'This is your canvas. Drag the background to pan, and scroll or pinch to zoom.',
  },
  {
    selector: '[data-tour-id="pieces-drawer-toggle"]',
    title: 'The piece library',
    body: 'Open the library here, then drag LEGO bricks straight onto the canvas.',
  },
  {
    selector: '[data-tour-id="layers-panel"]',
    title: 'Layers',
    body: 'Every brick and group is a layer. Drag layers here to reorder and stack them.',
  },
  {
    selector: '[data-tour-id="layers-panel"]',
    title: 'Rename a layer',
    body: 'Double-click a layer (or press F2) to give it a name that makes sense.',
  },
  {
    selector: '[data-tour-id="model-title-edit"]',
    title: 'Name your model',
    body: 'Click the title to rename your whole model.',
  },
  {
    selector: '[data-tour-id="builder-toolbar"]',
    title: 'Share, export & save',
    body: 'Use the toolbar up here to share your model, export it as an image, and save versions.',
  },
];

// If a step's target never appears within this window, skip it. Long enough to
// cover hydration / soft-nav mount, short enough not to strand the user.
const SKIP_AFTER_MS = 1200;

const TOOLTIP_W = 320;
const GAP = 16;
const TOOLTIP_H_EST = 190; // used only to decide above-vs-below placement

/**
 * First-visit spotlight tutorial for the canvas builder. Auto-launches on the
 * first canvas open (gated on `bt_canvas_tutorial_seen` only — not role, so
 * participants see it too) and persists the flag on finish or skip. Replayable
 * via the account-page "Replay walkthrough" (replayAll clears the flag).
 */
export function CanvasBuilderTutorial() {
  const { hydrated, canvasTutorialSeen, markCanvasTutorialSeen } = useOnboardingState();
  const titleId = useId();
  const bodyId = useId();
  const maskId = useId();

  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);

  const active = hydrated && !canvasTutorialSeen && !done && stepIndex < STEPS.length;
  const step = active ? STEPS[stepIndex]! : null;
  const rect = useSpotlightRect(step ? step.selector : null, active);

  const finish = useCallback(
    (withConfetti: boolean) => {
      setDone(true);
      markCanvasTutorialSeen();
      if (withConfetti) void celebrate();
    },
    [markCanvasTutorialSeen],
  );

  const goNext = useCallback(() => {
    if (stepIndex + 1 >= STEPS.length) finish(true);
    else setStepIndex((i) => i + 1);
  }, [stepIndex, finish]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Silent-skip a step whose target hasn't rendered. Runs only while active and
  // the rect is still null; resolves once the target appears (effect re-runs
  // with a non-null rect and clears the timer). Skipping past the last step
  // finishes without confetti.
  useEffect(() => {
    if (!active || rect) return;
    const t = setTimeout(() => {
      if (stepIndex + 1 >= STEPS.length) finish(false);
      else setStepIndex((i) => i + 1);
    }, SKIP_AFTER_MS);
    return () => clearTimeout(t);
  }, [active, rect, stepIndex, finish]);

  // Escape skips the whole tour (no confetti).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish]);

  if (!active || !rect || !step) return null;

  const padding = 8;
  const x = rect.left - padding;
  const y = rect.top - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  // Placement: a target that fills most of the viewport (the canvas) gets a
  // centred tooltip; small targets get the tooltip below, flipping above when
  // it would clip, and clamped horizontally.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isLarge = rect.height > vh * 0.6 || rect.width > vw * 0.7;
  let tooltipLeft: number;
  let tooltipTop: number;
  if (isLarge) {
    tooltipLeft = (vw - TOOLTIP_W) / 2;
    tooltipTop = Math.max(16, (vh - TOOLTIP_H_EST) / 2);
  } else {
    tooltipLeft = Math.min(Math.max(16, rect.left), vw - TOOLTIP_W - 16);
    const below = rect.bottom + GAP;
    tooltipTop =
      below + TOOLTIP_H_EST > vh - 16 ? Math.max(16, rect.top - TOOLTIP_H_EST - GAP) : below;
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div data-testid="canvas-builder-tutorial" className="pointer-events-none fixed inset-0 z-30">
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
            onClick={() => finish(false)}
            data-testid="canvas-tutorial-skip"
            className="cursor-pointer text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={isFirst}
              data-testid="canvas-tutorial-back"
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl px-3 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-900/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              data-testid="canvas-tutorial-next"
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
