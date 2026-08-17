'use client';

import { useSearchParams } from 'next/navigation';
import { useId, type ReactNode } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';

import { useOnboardingState } from './useOnboardingState';

interface Props {
  /** Server-resolved tutorial guest (already participating in someone's
   *  session) — self-evidently a guest, so the question is never asked. */
  guest?: boolean;
}

/**
 * First-run role question: one full-screen choice between Facilitator and
 * Guest, asked once per browser (`bt_role_choice`) before any tutorial UI.
 * Facilitator → the tutorial modal takes over from here. Guest → the sticky
 * guest flag is set; they get only the in-context tours (session page +
 * canvas). Join-link arrivals and server-detected guests never see it, and
 * "Replay walkthrough" clears the choice so account settings can re-ask.
 * Deliberately not skippable — Esc and the backdrop do nothing.
 */
export function RoleChooser({ guest = false }: Props) {
  const {
    role,
    hydrated,
    welcomeSeen,
    roleChoice,
    chooseRole,
    tutorialGuestSticky,
    markTutorialGuest,
  } = useOnboardingState();
  const searchParams = useSearchParams();
  const titleId = useId();

  const tourInFlight = searchParams.get('onboarding') !== null;

  if (
    !hydrated ||
    guest ||
    tutorialGuestSticky ||
    roleChoice !== null ||
    // Legacy participant branch and users who already dismissed the tutorial
    // have both answered the question in spirit — don't re-ask.
    role === 'participant' ||
    welcomeSeen ||
    tourInFlight
  ) {
    return null;
  }

  return (
    <ModalBackdrop
      dataTestid="role-chooser"
      titleId={titleId}
      onClose={() => undefined}
      backdropCloses={false}
      panelClassName="w-full max-w-2xl"
    >
      <div className="animate-modal-in rounded-2xl border border-zinc-200/70 bg-white p-7 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.32)] sm:p-9">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Welcome to BrickThink
        </p>
        <h2
          id={titleId}
          className="mt-2 font-display text-[30px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 sm:text-[34px]"
        >
          How will you use BrickThink?
        </h2>
        <p className="mt-3 max-w-md text-[13px] leading-relaxed text-zinc-600">
          This decides which guides you&rsquo;ll see. You can change it later from account settings
          via Replay walkthrough.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <ChoiceCard
            testid="role-chooser-facilitator"
            title="Facilitator"
            body="I run workshops and sessions with my team."
            art={<FacilitatorArt />}
            onClick={() => chooseRole('facilitator')}
          />
          <ChoiceCard
            testid="role-chooser-guest"
            title="Guest for a workshop"
            body="I'm joining someone else's workshop to build and share models."
            art={<GuestArt />}
            onClick={() => {
              chooseRole('guest');
              markTutorialGuest();
            }}
          />
        </div>
      </div>
    </ModalBackdrop>
  );
}

function ChoiceCard({
  testid,
  title,
  body,
  art,
  onClick,
}: {
  testid: string;
  title: string;
  body: string;
  art: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-900/10 bg-white text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#a8482a]/40 hover:shadow-[0_16px_36px_-20px_rgba(150,70,40,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8482a]"
    >
      <div
        aria-hidden="true"
        className="flex h-28 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#f8efe9] via-[#f3e2d7] to-[#ecd2c2]"
      >
        {art}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[14px] font-semibold tracking-tight text-zinc-950">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600">{body}</p>
        <span
          aria-hidden="true"
          className="mt-auto inline-flex items-center gap-1 pt-4 text-[12px] font-semibold text-[#a8482a] transition-transform duration-200 group-hover:translate-x-0.5"
        >
          Continue <span>&rarr;</span>
        </span>
      </div>
    </button>
  );
}

/** Facilitator at a board, leading a group. */
function FacilitatorArt() {
  return (
    <svg viewBox="0 0 120 84" className="h-20 w-auto" aria-hidden="true">
      <rect x="30" y="10" width="60" height="36" rx="5" fill="white" opacity="0.9" />
      <rect
        x="30"
        y="10"
        width="60"
        height="36"
        rx="5"
        fill="none"
        stroke="#a8482a"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <rect x="37" y="17" width="16" height="10" rx="2" fill="#a8482a" />
      <rect x="57" y="17" width="16" height="10" rx="2" fill="#5f7d72" />
      <rect x="37" y="31" width="36" height="8" rx="2" fill="#d8d3cd" />
      <circle cx="60" cy="60" r="8" fill="#a8482a" />
      <circle cx="38" cy="66" r="5" fill="#5f7d72" />
      <circle cx="82" cy="66" r="5" fill="#cbb9ad" />
    </svg>
  );
}

/** Guest joining a group's table. */
function GuestArt() {
  return (
    <svg viewBox="0 0 120 84" className="h-20 w-auto" aria-hidden="true">
      <rect x="26" y="34" width="68" height="14" rx="4" fill="white" opacity="0.9" />
      <rect
        x="26"
        y="34"
        width="68"
        height="14"
        rx="4"
        fill="none"
        stroke="#5f7d72"
        strokeWidth="1.5"
      />
      <circle cx="42" cy="24" r="6" fill="#cbb9ad" />
      <circle cx="60" cy="22" r="6" fill="#5f7d72" />
      <circle cx="78" cy="24" r="6" fill="#d8d3cd" />
      <circle cx="60" cy="66" r="7" fill="#a8482a" />
      <path
        d="M60 56v-6"
        stroke="#9a4a2c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 4"
      />
    </svg>
  );
}
