'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { celebrate } from '@/lib/onboarding/celebrate';

import {
  CHECKLIST_BASELINE_KEY,
  CHECKLIST_CELEBRATED_KEY,
  useOnboardingState,
} from './useOnboardingState';
import { WelcomeModal } from './WelcomeModal';

export interface FacilitatorChecklistProgress {
  hasOrg: boolean;
  hasSessionInAnyOrg: boolean;
  hasOwnedSessionDesign: boolean;
  // The "next click" destinations resolved server-side.
  firstOrgId: string | null;
  firstSessionId: string | null;
  // Entity counts, so a replayed walkthrough can show a step done only once a
  // NEW workshop / session / model is created beyond the replay-start baseline.
  orgCount: number;
  sessionCount: number;
  ownedSessionDesignCount: number;
}

interface Props {
  progress: FacilitatorChecklistProgress;
}

type StepKey = 'org' | 'session' | 'model';

// Entity counts captured at replay start.
interface StepBaseline {
  org: number;
  session: number;
  model: number;
}

function readCelebratedSteps(): StepKey[] | null {
  const raw = window.localStorage.getItem(CHECKLIST_CELEBRATED_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is StepKey => s === 'org' || s === 'session' || s === 'model');
    }
  } catch {
    // Corrupt value — treat as nothing celebrated yet.
  }
  return [];
}

function readBaseline(): StepBaseline | null {
  const raw = window.localStorage.getItem(CHECKLIST_BASELINE_KEY);
  if (raw === null) return null;
  try {
    const p = JSON.parse(raw);
    if (
      p &&
      typeof p.org === 'number' &&
      typeof p.session === 'number' &&
      typeof p.model === 'number'
    ) {
      return { org: p.org, session: p.session, model: p.model };
    }
  } catch {
    // Corrupt value — treat as no baseline yet.
  }
  return null;
}

export function FacilitatorChecklist({ progress }: Props) {
  const {
    role,
    checklistComplete,
    checklistDismissed,
    walkthroughReplay,
    hydrated,
    markChecklistComplete,
    dismissChecklist,
  } = useOnboardingState();

  // Replay-start baseline. While replaying, a step counts as done only once the
  // user has created a NEW entity beyond what existed when they hit "Replay
  // walkthrough" — so a finished facilitator sees an empty checklist that ticks
  // as they redo each step. Captured once (on the first replay render) and held
  // in localStorage so it survives navigation across the funnel pages.
  const [baseline, setBaseline] = useState<StepBaseline | null>(null);
  useEffect(() => {
    if (!hydrated || !walkthroughReplay) {
      setBaseline(null);
      return;
    }
    const existing = readBaseline();
    if (existing) {
      setBaseline(existing);
      return;
    }
    const captured: StepBaseline = {
      org: progress.orgCount,
      session: progress.sessionCount,
      model: progress.ownedSessionDesignCount,
    };
    window.localStorage.setItem(CHECKLIST_BASELINE_KEY, JSON.stringify(captured));
    setBaseline(captured);
  }, [
    hydrated,
    walkthroughReplay,
    progress.orgCount,
    progress.sessionCount,
    progress.ownedSessionDesignCount,
  ]);

  // The done-state the checklist actually renders. Normally this is the real
  // server-derived progress; during replay it's progress *relative to the
  // baseline* (so steps start empty and tick only on genuinely new entities).
  // Until the baseline is captured, replay shows everything not-done.
  const effHasOrg = walkthroughReplay
    ? baseline !== null && progress.orgCount > baseline.org
    : progress.hasOrg;
  const effHasSession = walkthroughReplay
    ? baseline !== null && progress.sessionCount > baseline.session
    : progress.hasSessionInAnyOrg;
  const effHasModel = walkthroughReplay
    ? baseline !== null && progress.ownedSessionDesignCount > baseline.model
    : progress.hasOwnedSessionDesign;
  const allDone = effHasOrg && effHasSession && effHasModel;

  // Capture the checklistComplete value at hydration time (i.e. what was in
  // localStorage when the page loaded). We use a ref so re-renders caused by
  // markChecklistComplete() writing the flag don't re-enter this logic and
  // trigger an immediate auto-dismiss on the same page visit.
  const completeAtHydration = useRef<boolean | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (completeAtHydration.current === null) {
      completeAtHydration.current = checklistComplete;
    }
  }, [hydrated, checklistComplete]);

  // Per-step confetti. On first sighting we baseline the celebrated set to
  // whatever's already done (no retroactive bursts); after that, each step that
  // newly completes fires one burst. replayAll() clears this, so a replayed
  // walkthrough re-arms every step. Keyed off the *effective* done-state, so in
  // replay a step celebrates when the user re-creates it past the baseline.
  useEffect(() => {
    if (!hydrated || role !== 'facilitator') return;
    const doneNow: StepKey[] = [];
    if (effHasOrg) doneNow.push('org');
    if (effHasSession) doneNow.push('session');
    if (effHasModel) doneNow.push('model');
    const celebratedSteps = readCelebratedSteps();
    if (celebratedSteps === null) {
      window.localStorage.setItem(CHECKLIST_CELEBRATED_KEY, JSON.stringify(doneNow));
      return;
    }
    const fresh = doneNow.filter((s) => !celebratedSteps.includes(s));
    if (fresh.length > 0) {
      void celebrate();
      window.localStorage.setItem(
        CHECKLIST_CELEBRATED_KEY,
        JSON.stringify([...celebratedSteps, ...fresh]),
      );
    }
  }, [hydrated, role, effHasOrg, effHasSession, effHasModel]);

  // Completion bookkeeping (show the "complete" card for one visit, then
  // auto-dismiss). Confetti is owned by the per-step effect above. Suspended
  // during replay so the steps stay visible instead of auto-dismissing.
  useEffect(() => {
    if (!hydrated || role !== 'facilitator' || checklistDismissed || walkthroughReplay || !allDone)
      return;
    if (completeAtHydration.current) {
      // User already saw the complete card on a previous visit — auto-dismiss.
      dismissChecklist();
    } else {
      // First time reaching all-done: mark it so the next visit auto-dismisses.
      markChecklistComplete();
    }
  }, [
    allDone,
    checklistDismissed,
    dismissChecklist,
    hydrated,
    markChecklistComplete,
    role,
    walkthroughReplay,
  ]);

  if (!hydrated || role !== 'facilitator' || checklistDismissed) return null;

  // In replay, always show the steps (even when allDone) rather than the terse
  // complete card, so "Replay walkthrough" actually re-shows the checklist.
  if (allDone && !walkthroughReplay) {
    return (
      <section
        id={WelcomeModal.CHECKLIST_ANCHOR_ID}
        data-testid="onboarding-checklist-complete"
        className="rounded-2xl border border-zinc-900/10 bg-white p-5 text-[13px] text-zinc-700"
      >
        Walkthrough complete — replay from{' '}
        <Link href="/app/account" className="text-[#a8482a] underline-offset-2 hover:underline">
          account settings
        </Link>
        .
      </section>
    );
  }

  return (
    <section
      id={WelcomeModal.CHECKLIST_ANCHOR_ID}
      data-testid="onboarding-checklist"
      className="relative rounded-2xl border border-zinc-900/10 bg-white p-5"
    >
      <button
        type="button"
        onClick={dismissChecklist}
        aria-label="Dismiss walkthrough"
        title="Dismiss walkthrough"
        data-testid="onboarding-checklist-dismiss"
        className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-900/5"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Get started</p>
      <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-zinc-950">
        Three steps to your first session
      </h2>
      <ol className="mt-4 flex flex-col gap-3">
        <ChecklistRow
          done={effHasOrg}
          label="Create your first workshop"
          href="/app/workshops"
          testid="onboarding-step-org"
          isNext={!effHasOrg}
        />
        <ChecklistRow
          done={effHasSession}
          label="Create a session inside it"
          // Until the step is done, deep-link to the org and trigger the
          // "Create session" spotlight there (CreateSessionSpotlight reads this
          // param). From the org page itself firstOrgId is the current org, so
          // it's a same-page nav; from elsewhere it routes to the first org.
          href={
            progress.firstOrgId
              ? `/app/workshops/${progress.firstOrgId}${
                  effHasSession ? '' : '?onboarding=create-session'
                }`
              : '/app/workshops'
          }
          testid="onboarding-step-session"
          isNext={effHasOrg && !effHasSession}
        />
        <ChecklistRow
          done={effHasModel}
          label="Open a stage and start your first model"
          // Until done, deep-link to the session and run the start-model
          // spotlight there (StartModelSpotlight reads this param). On the
          // session page firstSessionId is the current session (same-page nav);
          // from elsewhere it routes to the user's first session.
          href={
            progress.firstSessionId
              ? `/app/sessions/${progress.firstSessionId}${
                  effHasModel ? '' : '?onboarding=start-model'
                }`
              : '/app/workshops'
          }
          testid="onboarding-step-model"
          isNext={effHasOrg && effHasSession && !effHasModel}
        />
      </ol>
    </section>
  );
}

interface RowProps {
  done: boolean;
  label: string;
  href: string;
  testid: string;
  isNext: boolean;
}

function ChecklistRow({ done, label, href, testid, isNext }: RowProps) {
  return (
    <li className="flex items-center gap-3" data-testid={testid} data-done={done ? '1' : '0'}>
      <span
        aria-hidden="true"
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          done ? 'border-[#a8482a] bg-[#a8482a] text-white' : 'border-zinc-300 bg-white'
        }`}
      >
        {done ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        ) : null}
      </span>
      <Link
        href={href}
        // Don't reset scroll to top on navigation — the spotlight that some of
        // these links trigger scrolls to its own target, and a scroll-to-top
        // would fight it.
        scroll={false}
        className={`text-[13px] underline-offset-2 hover:underline ${
          done
            ? 'text-zinc-500 line-through decoration-zinc-400'
            : isNext
              ? 'font-semibold text-[#a8482a]'
              : 'text-zinc-800'
        }`}
      >
        {label}
      </Link>
    </li>
  );
}
