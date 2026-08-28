'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { createDesignAction } from '@/app/(authed)/app/my-designs/actions';
import { EmailChipInput, splitEmailDraft } from '@/components/session/EmailChipInput';
import { useOnboardingState } from '@/components/onboarding/useOnboardingState';
import { saveOnboardingConfig } from '@/lib/onboarding/actions';
import type {
  OnboardingConfigRole,
  OnboardingFluency,
  OnboardingGroupSize,
  OnboardingPurpose,
} from '@/lib/onboarding/config';
import { RECOMMENDED_MAX_PARTICIPANTS } from '@/lib/sessions/limits';

/**
 * The five-step configuration wizard. Configuration only: it asks questions
 * and writes state (server-side via saveOnboardingConfig, locally via the
 * bt_ caches). It teaches nothing and never points at UI. One question per
 * screen; split layout with the illustration on the left. Steps 2 to 5
 * render only for facilitators — the other two roles end the flow at step 1.
 */

const TOTAL_STEPS = 5;

type StepId = 1 | 2 | 3 | 4 | 5;

interface Option<T extends string> {
  value: T;
  label: string;
}

const ROLE_OPTIONS: Option<OnboardingConfigRole>[] = [
  { value: 'facilitator', label: 'I run workshops with my team' },
  { value: 'participant', label: "I'm joining someone else's workshop" },
  { value: 'explorer', label: 'Just exploring for now' },
];

const FLUENCY_OPTIONS: Option<OnboardingFluency>[] = [
  { value: 'certified', label: 'Certified facilitator' },
  { value: 'run_before', label: "I've run it before" },
  { value: 'read_about', label: "I've read about it" },
  { value: 'new', label: 'New to it' },
];

// "Not sure yet" is the no-preference option, placed first.
const PURPOSE_OPTIONS: Option<OnboardingPurpose>[] = [
  { value: 'not_sure', label: 'Not sure yet' },
  { value: 'team_alignment', label: 'Team alignment' },
  { value: 'strategy', label: 'Strategy or vision' },
  { value: 'retrospective', label: 'Retrospective' },
  { value: 'team_onboarding', label: 'Onboarding a new team' },
  { value: 'product_discovery', label: 'Product discovery' },
];

const SIZE_OPTIONS: Option<OnboardingGroupSize>[] = [
  { value: 'solo', label: 'Just me for now' },
  { value: '2_4', label: '2 to 4' },
  { value: '5_8', label: '5 to 8' },
  { value: '9_plus', label: '9 or more' },
];

export function WelcomeFlow() {
  const router = useRouter();
  const { chooseRole, chooseFluency, markTutorialGuest } = useOnboardingState();
  const [step, setStep] = useState<StepId>(1);
  const [role, setRole] = useState<OnboardingConfigRole | null>(null);
  const [fluency, setFluency] = useState<OnboardingFluency | null>(null);
  const [purpose, setPurpose] = useState<OnboardingPurpose | null>(null);
  const [groupSize, setGroupSize] = useState<OnboardingGroupSize | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new question on step change so keyboard and screen
  // reader users land on the content, not a stale control.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function fail(message: string) {
    setError(message);
  }

  function finishParticipant() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await saveOnboardingConfig({ role: 'participant', completed: true });
        if (!res.ok) return fail('Could not save your answer. Please try again.');
        chooseRole('guest');
        markTutorialGuest();
        router.replace('/app/my-designs');
      } catch {
        fail('Could not save your answer. Please try again.');
      }
    });
  }

  function finishExplorer() {
    startTransition(async () => {
      setError(null);
      try {
        const res = await saveOnboardingConfig({ role: 'explorer', completed: true });
        if (!res.ok) return fail('Could not save your answer. Please try again.');
        chooseRole('explorer');
        const id = await createDesignAction({ orgId: null, sessionId: null });
        router.push(`/app/designs/${id}`);
      } catch {
        fail('Could not set up your canvas. Please try again.');
      }
    });
  }

  function finishFacilitator(withInvites: boolean) {
    startTransition(async () => {
      setError(null);
      const pendingInvites = withInvites ? [...emails, ...splitEmailDraft(inputValue, emails)] : [];
      try {
        const res = await saveOnboardingConfig({
          role: 'facilitator',
          fluency,
          purpose,
          groupSize,
          pendingInvites,
          completed: true,
        });
        if (!res.ok) return fail('Could not save your answers. Please try again.');
        chooseRole('facilitator');
        if (fluency !== null) chooseFluency(fluency);
        router.replace('/app/my-designs');
      } catch {
        fail('Could not save your answers. Please try again.');
      }
    });
  }

  function continueFromStep() {
    setError(null);
    if (step === 1) {
      if (role === 'participant') return finishParticipant();
      if (role === 'explorer') return finishExplorer();
      setStep(2);
    } else if (step < TOTAL_STEPS) {
      setStep((step + 1) as StepId);
    } else {
      finishFacilitator(true);
    }
  }

  const continueDisabled =
    pending ||
    (step === 1 && role === null) ||
    (step === 2 && fluency === null) ||
    (step === 3 && purpose === null) ||
    (step === 4 && groupSize === null);

  return (
    <div
      data-testid="welcome-flow"
      className="relative grid min-h-[100dvh] md:grid-cols-[1fr_1.15fr]"
    >
      <aside
        aria-hidden="true"
        className="hidden items-center justify-center bg-gradient-to-br from-[#f8efe9] via-[#f3e2d7] to-[#ecd2c2] md:flex"
      >
        <WelcomeIllustration />
      </aside>

      {step > 1 ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setStep((step - 1) as StepId);
          }}
          aria-label="Back to the previous step"
          data-testid="welcome-back"
          className="absolute left-5 top-5 z-10 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-900/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8482a]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
        </button>
      ) : null}

      <section className="flex items-center justify-center px-5 py-16 sm:px-10">
        <div
          key={step}
          data-testid={`welcome-step-${step}`}
          className="animate-modal-in w-full max-w-xl"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Step {step} of {TOTAL_STEPS}
          </p>

          {step === 1 ? (
            <StepShell
              headingRef={headingRef}
              question="How will you use BrickThink?"
              hint="This decides what you see next. You can change it later from account settings."
            >
              <ChipGroup
                label="How will you use BrickThink?"
                options={ROLE_OPTIONS}
                value={role}
                onSelect={setRole}
                testidPrefix="welcome-option"
              />
            </StepShell>
          ) : null}

          {step === 2 ? (
            <StepShell
              headingRef={headingRef}
              question={<>How familiar are you with the LEGO&reg; SERIOUS PLAY&reg; method?</>}
              hint="Your answer sets how much guidance the tours give. Everything stays available either way."
            >
              <ChipGroup
                label="How familiar are you with the LEGO SERIOUS PLAY method?"
                options={FLUENCY_OPTIONS}
                value={fluency}
                onSelect={setFluency}
                testidPrefix="welcome-option"
              />
              <p className="mt-6 text-[11px] leading-relaxed text-zinc-500">
                LEGO&reg; SERIOUS PLAY&reg; is a trademark of the LEGO Group. The LEGO Group does
                not sponsor, authorize, or endorse this product.
              </p>
            </StepShell>
          ) : null}

          {step === 3 ? (
            <StepShell
              headingRef={headingRef}
              question="What do you want your first workshop to do?"
              hint="A matching exercise is placed on each stage of your first session. You can change any of them."
            >
              <ChipGroup
                label="What do you want your first workshop to do?"
                options={PURPOSE_OPTIONS}
                value={purpose}
                onSelect={setPurpose}
                testidPrefix="welcome-option"
              />
            </StepShell>
          ) : null}

          {step === 4 ? (
            <StepShell
              headingRef={headingRef}
              question="How many people will build with you?"
              hint="This suggests how many rooms the shared model stage starts with."
            >
              <ChipGroup
                label="How many people will build with you?"
                options={SIZE_OPTIONS}
                value={groupSize}
                onSelect={setGroupSize}
                testidPrefix="welcome-option"
              />
              {groupSize === '9_plus' ? (
                <p
                  data-testid="welcome-size-note"
                  className="mt-5 rounded-xl border border-zinc-900/10 bg-white px-4 py-3 text-[13px] leading-relaxed text-zinc-700"
                >
                  BrickThink currently recommends up to {RECOMMENDED_MAX_PARTICIPANTS} builders in
                  one session. Larger groups work best split across parallel rooms in the shared
                  model stage.
                </p>
              ) : null}
            </StepShell>
          ) : null}

          {step === 5 ? (
            <StepShell
              headingRef={headingRef}
              question="Who's joining your first workshop?"
              hint="Add email addresses now or skip this step."
            >
              <EmailChipInput
                emails={emails}
                onEmailsChange={setEmails}
                inputValue={inputValue}
                onInputValueChange={setInputValue}
                label="Email addresses to invite"
              />
              <p className="mt-3 text-[12px] leading-relaxed text-zinc-500">
                Invites are sent once your first workshop and its session exist, so everyone lands
                somewhere real.
              </p>
            </StepShell>
          ) : null}

          {error ? (
            <p data-testid="welcome-error" className="mt-4 text-[12px] text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-8">
            <button
              type="button"
              onClick={continueFromStep}
              disabled={continueDisabled}
              data-testid="welcome-continue"
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#cf6e47] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8482a] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
            >
              {pending ? 'Saving…' : step === TOTAL_STEPS ? 'Finish' : 'Continue'}
            </button>
            {step === TOTAL_STEPS ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => finishFacilitator(false)}
                  disabled={pending}
                  data-testid="welcome-do-later"
                  className="cursor-pointer text-[13px] font-medium text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline"
                >
                  Do this later
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function StepShell({
  headingRef,
  question,
  hint,
  children,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  question: React.ReactNode;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 font-display text-[32px] font-medium leading-[1.05] tracking-[-0.015em] text-zinc-950 outline-none sm:text-[38px]"
      >
        {question}
      </h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-zinc-600">{hint}</p>
      <div className="mt-8">{children}</div>
    </>
  );
}

/**
 * Pill-chip single-select with radio-group semantics: arrow keys move the
 * selection, Tab leaves the group, the selected (or first) chip carries the
 * roving tab stop.
 */
function ChipGroup<T extends string>({
  label,
  options,
  value,
  onSelect,
  testidPrefix,
}: {
  label: string;
  options: Option<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  testidPrefix: string;
}) {
  const refs = useRef<Map<T, HTMLButtonElement>>(new Map());

  function onKeyDown(e: React.KeyboardEvent) {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (delta === 0) return;
    e.preventDefault();
    const currentIndex = value === null ? 0 : options.findIndex((o) => o.value === value);
    const next = options[(currentIndex + delta + options.length) % options.length]!;
    onSelect(next.value);
    refs.current.get(next.value)?.focus();
  }

  const tabStop = value ?? options[0]!.value;

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-3">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              if (el) refs.current.set(option.value, el);
              else refs.current.delete(option.value);
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={option.value === tabStop ? 0 : -1}
            onClick={() => onSelect(option.value)}
            onKeyDown={onKeyDown}
            data-testid={`${testidPrefix}-${option.value}`}
            className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-5 py-2 text-[14px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8482a] ${
              selected
                ? 'border-transparent bg-[#a8482a] text-white'
                : 'border-zinc-900/15 bg-white text-zinc-800 hover:border-[#a8482a]/40'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Abstract brick-and-canvas illustration in the original asset style. */
function WelcomeIllustration() {
  return (
    <svg viewBox="0 0 360 300" className="h-auto w-[70%] max-w-[420px]" aria-hidden="true">
      {/* canvas frame */}
      <rect x="60" y="30" width="240" height="160" rx="14" fill="white" opacity="0.85" />
      <rect
        x="60"
        y="30"
        width="240"
        height="160"
        rx="14"
        fill="none"
        stroke="#a8482a"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      {/* bricks on the canvas */}
      <g>
        <rect x="92" y="120" width="70" height="26" rx="5" fill="#5f7d72" />
        <rect x="100" y="112" width="16" height="8" rx="3" fill="#5f7d72" />
        <rect x="126" y="112" width="16" height="8" rx="3" fill="#5f7d72" />
        <rect x="122" y="92" width="70" height="26" rx="5" fill="#a8482a" />
        <rect x="130" y="84" width="16" height="8" rx="3" fill="#a8482a" />
        <rect x="156" y="84" width="16" height="8" rx="3" fill="#a8482a" />
        <rect x="186" y="120" width="54" height="26" rx="5" fill="#cbb9ad" />
        <rect x="194" y="112" width="14" height="8" rx="3" fill="#cbb9ad" />
        <rect x="216" y="112" width="14" height="8" rx="3" fill="#cbb9ad" />
        <rect x="152" y="146" width="96" height="26" rx="5" fill="#d8d3cd" />
        <rect x="160" y="138" width="16" height="8" rx="3" fill="#d8d3cd" />
        <rect x="186" y="138" width="16" height="8" rx="3" fill="#d8d3cd" />
      </g>
      {/* floating brick being placed */}
      <g>
        <rect x="216" y="46" width="56" height="22" rx="5" fill="#a8482a" />
        <rect x="224" y="39" width="14" height="7" rx="3" fill="#a8482a" />
        <rect x="246" y="39" width="14" height="7" rx="3" fill="#a8482a" />
        <path
          d="M244 74v12"
          stroke="#9a4a2c"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="3 6"
        />
      </g>
      {/* loose bricks below the canvas */}
      <rect x="70" y="228" width="64" height="24" rx="5" fill="#5f7d72" />
      <rect x="78" y="220" width="15" height="8" rx="3" fill="#5f7d72" />
      <rect x="102" y="220" width="15" height="8" rx="3" fill="#5f7d72" />
      <rect x="160" y="244" width="80" height="24" rx="5" fill="#cbb9ad" />
      <rect x="168" y="236" width="15" height="8" rx="3" fill="#cbb9ad" />
      <rect x="192" y="236" width="15" height="8" rx="3" fill="#cbb9ad" />
      <rect x="250" y="222" width="52" height="24" rx="5" fill="#a8482a" />
      <rect x="258" y="214" width="14" height="8" rx="3" fill="#a8482a" />
      <rect x="280" y="214" width="14" height="8" rx="3" fill="#a8482a" />
    </svg>
  );
}
