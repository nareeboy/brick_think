'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';

import { useOnboardingState } from './useOnboardingState';

const CHECKLIST_ANCHOR_ID = 'onboarding-checklist';

const STEPS = [
  {
    n: '01',
    title: 'Workshops',
    body: 'A shared space for your team — everything you run together lives inside one.',
  },
  {
    n: '02',
    title: 'Sessions',
    body: 'A working meeting inside an org, run as a sequence of stages you move through together.',
  },
  {
    n: '03',
    title: 'Designs',
    body: 'The canvases you actually work on — personal ones on your own, or session ones inside a stage.',
  },
];

export function WelcomeModal() {
  const { role, welcomeSeen, hydrated, markWelcomeSeen } = useOnboardingState();
  const titleId = useId();
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hydrated && role === 'facilitator' && !welcomeSeen) ctaRef.current?.focus();
  }, [hydrated, welcomeSeen, role]);

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
    <ModalBackdrop
      dataTestid="onboarding-welcome-modal"
      titleId={titleId}
      onClose={markWelcomeSeen}
      panelClassName="w-full max-w-3xl"
    >
      <div className="animate-modal-in grid overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.32)] md:grid-cols-[1.04fr_0.96fr]">
        {/* Left — editorial copy */}
        <div className="flex flex-col p-7 sm:p-9">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Welcome to BrickThink
          </p>
          <h2
            id={titleId}
            className="mt-2 font-display text-[30px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 sm:text-[34px]"
          >
            How it fits together
          </h2>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-zinc-600">
            BrickThink nests in three layers. Here&rsquo;s the shape before you dive in.
          </p>

          <ol className="mt-7 flex flex-col gap-5">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="select-none font-display text-[26px] font-medium leading-none tracking-[-0.02em] text-[#c0613d]/35"
                >
                  {step.n}
                </span>
                <div className="pt-0.5">
                  <p className="text-[13px] font-semibold text-zinc-950">{step.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex items-center justify-end gap-3 md:mt-auto md:pt-8">
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
              className="group inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47]"
            >
              Show me how
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                &rarr;
              </span>
            </button>
          </div>
        </div>

        {/* Right — nesting diagram (decorative, replaces the screenshot pane) */}
        <NestingVisual />
      </div>
    </ModalBackdrop>
  );
}

/**
 * The right-hand pane: the Organisation ▸ Session ▸ Stage ▸ Design hierarchy
 * drawn as literal nested frames on a warm terracotta wash, so "how it fits
 * together" is shown rather than just described. Purely decorative — all the
 * semantic copy lives in the left pane — so it's aria-hidden and hidden on
 * narrow viewports where the split layout collapses to a single column.
 */
function NestingVisual() {
  const brickColours = ['#c0613d', '#d8d3cd', '#5f7d72', '#d8d3cd', '#c0613d', '#cbb9ad'];

  return (
    <div
      aria-hidden="true"
      className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-[#f8efe9] via-[#f3e2d7] to-[#ecd2c2] p-7 md:flex"
    >
      <div className="w-full max-w-[300px]">
        <Frame label="Workshop" tint="bg-white/55">
          <Frame label="Session" tint="bg-white/70">
            <Frame label="Stage" tint="bg-white/85">
              <Frame label="Design" tint="bg-white" innermost>
                <div className="grid grid-cols-3 gap-1.5">
                  {brickColours.map((c, i) => (
                    <span
                      key={i}
                      className="h-5 rounded-[3px]"
                      style={{ backgroundColor: c, opacity: 0.85 }}
                    />
                  ))}
                </div>
              </Frame>
            </Frame>
          </Frame>
        </Frame>
      </div>
    </div>
  );
}

function Frame({
  label,
  tint,
  innermost = false,
  children,
}: {
  label: string;
  tint: string;
  innermost?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-3 backdrop-blur-[1px] ${
        innermost
          ? 'border-[#c0613d]/30 shadow-[0_8px_20px_-12px_rgba(150,70,40,0.45)]'
          : 'border-[#c0613d]/15'
      } ${tint}`}
    >
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#9a4a2c]">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

WelcomeModal.CHECKLIST_ANCHOR_ID = CHECKLIST_ANCHOR_ID;
