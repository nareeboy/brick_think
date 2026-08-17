'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useOnboardingState } from './useOnboardingState';

interface Props {
  /** Server-resolved tutorial guest — the question is moot, bounce home. */
  guest?: boolean;
}

/**
 * The two-card role question hosted by /app/choose-role. Answering stores
 * `bt_role_choice` and routes to My Designs, where the tutorial modal takes
 * over for facilitators. Guests also get the sticky guest flag. Users who
 * have already answered (or are guests by evidence) are bounced straight to
 * My Designs — the page never re-asks. "Replay walkthrough" clears the
 * answer, so account settings can route back here.
 */
export function RoleChooserCards({ guest = false }: Props) {
  const {
    role,
    hydrated,
    welcomeSeen,
    roleChoice,
    chooseRole,
    tutorialGuestSticky,
    markTutorialGuest,
  } = useOnboardingState();
  const router = useRouter();

  const alreadyAnswered =
    hydrated &&
    (guest || tutorialGuestSticky || roleChoice !== null || role === 'participant' || welcomeSeen);

  useEffect(() => {
    if (alreadyAnswered) router.replace('/app/my-designs');
  }, [alreadyAnswered, router]);

  if (!hydrated || alreadyAnswered) return null;

  function pick(choice: 'facilitator' | 'guest') {
    chooseRole(choice);
    if (choice === 'guest') markTutorialGuest();
    router.replace('/app/my-designs');
  }

  return (
    <div data-testid="role-chooser" className="mx-auto w-full max-w-2xl px-5 py-14">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Welcome to BrickThink
      </p>
      <h1 className="mt-2 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 sm:text-[40px]">
        How will you use BrickThink?
      </h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-zinc-600">
        This decides which guides you&rsquo;ll see. You can change it later from account settings
        via Replay walkthrough.
      </p>

      <div className="mt-9 grid gap-5 sm:grid-cols-2">
        <ChoiceCard
          testid="role-chooser-facilitator"
          title="Facilitator"
          body="I run workshops and sessions with my team."
          art={<FacilitatorArt />}
          onClick={() => pick('facilitator')}
        />
        <ChoiceCard
          testid="role-chooser-guest"
          title="Guest for a workshop"
          body="I'm joining someone else's workshop to build and share models."
          art={<GuestArt />}
          onClick={() => pick('guest')}
        />
      </div>
    </div>
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
        className="flex h-32 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#f8efe9] via-[#f3e2d7] to-[#ecd2c2]"
      >
        {art}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-[15px] font-semibold tracking-tight text-zinc-950">{title}</h2>
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
    <svg viewBox="0 0 120 84" className="h-24 w-auto" aria-hidden="true">
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
    <svg viewBox="0 0 120 84" className="h-24 w-auto" aria-hidden="true">
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
