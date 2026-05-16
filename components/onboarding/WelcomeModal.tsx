'use client';

import { useEffect, useId, useRef } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';

import { useOnboardingState } from './useOnboardingState';

const CHECKLIST_ANCHOR_ID = 'onboarding-checklist';

export function WelcomeModal() {
  const { role, welcomeSeen, hydrated, markWelcomeSeen } = useOnboardingState();
  const titleId = useId();
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    ctaRef.current?.focus();
  }, []);

  if (!hydrated || role !== 'facilitator' || welcomeSeen) return null;

  function dismissAndScroll() {
    markWelcomeSeen();
    requestAnimationFrame(() => {
      document
        .getElementById(CHECKLIST_ANCHOR_ID)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <ModalBackdrop dataTestid="onboarding-welcome-modal" titleId={titleId} onClose={markWelcomeSeen}>
      <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Welcome to BrickThink
        </p>
        <h2 id={titleId} className="mt-1 text-[20px] font-semibold tracking-tight text-zinc-950">
          A quick tour of how it fits together
        </h2>
        <ol className="mt-5 flex flex-col gap-4 text-[13px] leading-relaxed text-zinc-700">
          <li>
            <p className="font-semibold text-zinc-950">1. Organisations</p>
            <p className="text-zinc-600">A shared space for your team.</p>
          </li>
          <li>
            <p className="font-semibold text-zinc-950">2. Sessions</p>
            <p className="text-zinc-600">
              A working meeting inside an org. Each session has stages — different exercises you move through together.
            </p>
          </li>
          <li>
            <p className="font-semibold text-zinc-950">3. Designs</p>
            <p className="text-zinc-600">
              The actual canvases. Personal designs live on your own; session designs live inside a stage.
            </p>
          </li>
        </ol>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={markWelcomeSeen}
            data-testid="onboarding-welcome-skip"
            className="cursor-pointer rounded-md px-3 py-2 text-[13px] font-medium text-zinc-600 hover:bg-zinc-900/5"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={dismissAndScroll}
            ref={ctaRef}
            data-testid="onboarding-welcome-cta"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47]"
          >
            Show me how
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

WelcomeModal.CHECKLIST_ANCHOR_ID = CHECKLIST_ANCHOR_ID;
