'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { useOnboardingState } from './useOnboardingState';
import { WelcomeModal } from './WelcomeModal';

export interface FacilitatorChecklistProgress {
  hasOrg: boolean;
  hasSessionInAnyOrg: boolean;
  hasOwnedSessionDesign: boolean;
  // The "next click" destinations resolved server-side.
  firstOrgId: string | null;
  firstSessionId: string | null;
}

interface Props {
  progress: FacilitatorChecklistProgress;
}

export function FacilitatorChecklist({ progress }: Props) {
  const {
    role,
    checklistComplete,
    checklistDismissed,
    hydrated,
    markChecklistComplete,
    dismissChecklist,
  } = useOnboardingState();
  const allDone = progress.hasOrg && progress.hasSessionInAnyOrg && progress.hasOwnedSessionDesign;

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

  useEffect(() => {
    if (!hydrated || role !== 'facilitator' || checklistDismissed || !allDone) return;
    if (completeAtHydration.current) {
      // User already saw the complete card on a previous visit — auto-dismiss.
      dismissChecklist();
    } else {
      // First time reaching all-done: mark it so the next visit auto-dismisses.
      markChecklistComplete();
    }
  }, [allDone, checklistDismissed, dismissChecklist, hydrated, markChecklistComplete, role]);

  if (!hydrated || role !== 'facilitator' || checklistDismissed) return null;

  if (allDone) {
    return (
      <section
        id={WelcomeModal.CHECKLIST_ANCHOR_ID}
        data-testid="onboarding-checklist-complete"
        className="rounded-2xl border border-zinc-900/10 bg-white p-5 text-[13px] text-zinc-700"
      >
        Walkthrough complete — replay from{' '}
        <Link href="/app/account" className="text-[#c0613d] underline-offset-2 hover:underline">
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
          done={progress.hasOrg}
          label="Create your first organisation"
          href="/app/orgs"
          testid="onboarding-step-org"
          isNext={!progress.hasOrg}
        />
        <ChecklistRow
          done={progress.hasSessionInAnyOrg}
          label="Create a session inside it"
          // Until the step is done, deep-link to the org and trigger the
          // "Create session" spotlight there (CreateSessionSpotlight reads this
          // param). From the org page itself firstOrgId is the current org, so
          // it's a same-page nav; from elsewhere it routes to the first org.
          href={
            progress.firstOrgId
              ? `/app/orgs/${progress.firstOrgId}${
                  progress.hasSessionInAnyOrg ? '' : '?onboarding=create-session'
                }`
              : '/app/orgs'
          }
          testid="onboarding-step-session"
          isNext={progress.hasOrg && !progress.hasSessionInAnyOrg}
        />
        <ChecklistRow
          done={progress.hasOwnedSessionDesign}
          label="Open a stage and start your first model"
          href={progress.firstSessionId ? `/app/sessions/${progress.firstSessionId}` : '/app/orgs'}
          testid="onboarding-step-model"
          isNext={progress.hasOrg && progress.hasSessionInAnyOrg && !progress.hasOwnedSessionDesign}
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
          done ? 'border-[#c0613d] bg-[#c0613d] text-white' : 'border-zinc-300 bg-white'
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
        className={`text-[13px] underline-offset-2 hover:underline ${
          done
            ? 'text-zinc-500 line-through decoration-zinc-400'
            : isNext
              ? 'font-semibold text-[#c0613d]'
              : 'text-zinc-800'
        }`}
      >
        {label}
      </Link>
    </li>
  );
}
