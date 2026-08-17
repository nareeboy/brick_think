'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';

import { celebrate } from '@/lib/onboarding/celebrate';

import { requestWelcomeReprise, useOnboardingState } from './useOnboardingState';
import { useSpotlightRect } from './useSpotlightRect';

const ONBOARDING_PARAM = 'onboarding';
const ONBOARDING_VALUE = 'create-workshop';

interface Step {
  selector: string;
  title: string;
  body: ReactNode;
}

// Three-step walk through the new-workshop form: name, slug, create. The
// data-tour-id anchors live in CreateOrgForm.
const STEPS: Step[] = [
  {
    selector: '[data-tour-id="workshop-name-field"]',
    title: 'Name your workshop',
    body: 'Give it a name your team will recognise — the web address below fills itself in as you type.',
  },
  {
    selector: '[data-tour-id="workshop-slug-field"]',
    title: 'Check the address',
    body: 'This short slug identifies your workshop in links. The suggestion is usually fine to keep.',
  },
  {
    selector: '[data-tour-id="create-workshop-submit"]',
    title: 'Create it',
    body: (
      <>
        <span className="font-semibold text-zinc-950">Click Create workshop</span> when you are
        ready — you will land inside your new workshop.
      </>
    ),
  },
];

/**
 * Continues the create-workshop tour on /app/workshops/new (the New workshop
 * link carries `?onboarding=create-workshop` here). Highlights the name field,
 * the slug field, then the Create button. The form stays fully interactive —
 * the overlay is pointer-events-none — so typing works while the spotlight is
 * up. Clicking the highlighted Create button finishes the tour by stripping
 * the param with a synchronous history.replaceState: the form's own submit is
 * about to router.push to the new workshop, and a router.replace here would
 * race it (the replace-vs-push race the start-model spotlight hit).
 */
export function CreateWorkshopFormSpotlight() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const bodyId = useId();
  const maskId = useId();

  const { markPathDone, markSessionTourSeen } = useOnboardingState();
  const requested = searchParams.get(ONBOARDING_PARAM) === ONBOARDING_VALUE;
  // Session-pathway detour (see CreateWorkshopSpotlight) — skips tick the
  // session card instead of the workshop card.
  const sessionIntent = searchParams.get('intent') === 'session';
  const [dismissed, setDismissed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [nameFilled, setNameFilled] = useState(false);

  const active = requested && !dismissed && stepIndex < STEPS.length;
  const step = active ? STEPS[stepIndex]! : null;
  const rect = useSpotlightRect(step ? step.selector : null, active);

  // Step 1 gates Next on the name actually being typed. Watch the real input
  // inside the highlighted field (rect in the deps ensures it's mounted).
  useEffect(() => {
    if (!active || stepIndex !== 0 || !rect) return;
    const input = document.querySelector<HTMLInputElement>(
      '[data-tour-id="workshop-name-field"] input',
    );
    if (!input) return;
    setNameFilled(input.value.trim().length > 0);
    const onInput = () => setNameFilled(input.value.trim().length > 0);
    input.addEventListener('input', onInput);
    return () => input.removeEventListener('input', onInput);
  }, [active, stepIndex, rect]);

  // Reset when a fresh request arrives.
  useEffect(() => {
    if (requested) {
      setDismissed(false);
      setStepIndex(0);
    }
  }, [requested]);

  const strippedUrl = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(ONBOARDING_PARAM);
    next.delete('intent');
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const finish = useCallback(() => {
    setDismissed(true);
    router.replace(strippedUrl(), { scroll: false });
  }, [router, strippedUrl]);

  // The Skip button is a warm exit: the pathway this tour runs FOR ticks as
  // done (session card on a session-intent detour, workshop card otherwise),
  // confetti fires, and the welcome modal returns. Esc stays quiet.
  const skip = useCallback(() => {
    if (sessionIntent) {
      markPathDone('session');
      markSessionTourSeen();
    } else {
      markPathDone('workshop');
    }
    void celebrate();
    requestWelcomeReprise();
    finish();
  }, [sessionIntent, markPathDone, markSessionTourSeen, finish]);

  // Finish triggered by clicking the highlighted Create button: strip the
  // param synchronously so no competing router navigation exists (see the
  // component docblock). The pathway's tick happens later, when the workshop
  // page tour (chained via ?onboarding=workshop-tour) is completed.
  const finishFromTargetClick = useCallback(() => {
    setDismissed(true);
    window.history.replaceState(null, '', strippedUrl());
  }, [strippedUrl]);

  // On the last step the primary button IS the create action: "Got it" clicks
  // the real Create workshop button, so the form submits exactly as if the
  // user clicked it (our target-click listener then finishes the tour).
  const advance = useCallback(() => {
    if (stepIndex + 1 >= STEPS.length) {
      document.querySelector<HTMLButtonElement>('[data-tour-id="create-workshop-submit"]')?.click();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [stepIndex]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish]);

  // Only the LAST step's target (the Create button) advances on click — the
  // field steps are clicked to type into, which must not move the tour along.
  const isLast = stepIndex === STEPS.length - 1;
  useEffect(() => {
    if (!active || !rect || !step || !isLast) return;
    const el = document.querySelector(step.selector);
    if (!el) return;
    const onClick = () => finishFromTargetClick();
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [active, rect, step, isLast, finishFromTargetClick]);

  if (!active || !rect || !step) return null;

  const padding = 8;
  const x = rect.left - padding;
  const y = rect.top - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  // The form sits in a narrow centred column — prefer the right of the field,
  // flipping left then below when the viewport is too tight.
  const TOOLTIP_W = 300;
  const GAP = 16;
  const viewportW = window.innerWidth;
  let tooltipLeft = rect.right + GAP;
  let tooltipTop = rect.top;
  if (tooltipLeft + TOOLTIP_W > viewportW - 16) {
    tooltipLeft = rect.left - TOOLTIP_W - GAP;
  }
  if (tooltipLeft < 16) {
    tooltipLeft = Math.max(16, Math.min(rect.left, viewportW - TOOLTIP_W - 16));
    tooltipTop = rect.bottom + GAP;
  }

  return (
    <div
      data-testid="create-workshop-form-spotlight"
      className="pointer-events-none fixed inset-0 z-30"
    >
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
        {stepIndex === 0 ? (
          <p className="mt-2 text-[13px] font-semibold leading-relaxed text-zinc-950">
            Please add a name for your workshop.
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={skip}
            data-testid="create-workshop-form-spotlight-skip"
            className="cursor-pointer text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={advance}
            disabled={stepIndex === 0 && !nameFilled}
            data-testid="create-workshop-form-spotlight-next"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
