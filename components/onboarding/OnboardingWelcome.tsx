'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition, type ReactNode } from 'react';

import { createDesignAction } from '@/app/(authed)/app/my-designs/actions';
import { ModalBackdrop } from '@/components/app/ModalBackdrop';

import { useOnboardingState } from './useOnboardingState';

interface Props {
  /** The user's first workshop id so the session card can deep-link into it
   *  (and fire the create-session spotlight there); null when none exists. */
  firstOrgId: string | null;
}

/**
 * First-run welcome overlay: three clickable pathway cards (build on your own,
 * set up a workshop, run a session). Replaces the old WelcomeModal +
 * FacilitatorChecklist pair as THE first-run experience. Gated on
 * `bt_welcome_seen`, so the account-page "Replay walkthrough" (which clears
 * that flag) re-shows it unchanged.
 */
export function OnboardingWelcome({ firstOrgId }: Props) {
  const { role, welcomeSeen, hydrated, markWelcomeSeen } = useOnboardingState();
  const router = useRouter();
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!hydrated || role !== 'facilitator' || welcomeSeen) return null;

  const sessionHref = firstOrgId
    ? `/app/workshops/${firstOrgId}?onboarding=create-session`
    : '/app/workshops';

  function startBuilding() {
    setError(null);
    startTransition(async () => {
      try {
        const id = await createDesignAction({ orgId: null, sessionId: null });
        markWelcomeSeen();
        router.push(`/app/designs/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create your design');
      }
    });
  }

  return (
    <ModalBackdrop
      dataTestid="onboarding-welcome-modal"
      titleId={titleId}
      onClose={markWelcomeSeen}
      backdropCloses={false}
      panelClassName="w-full max-w-4xl"
    >
      <div className="animate-modal-in relative max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-zinc-200/70 bg-white p-7 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.32)] sm:p-9">
        <button
          type="button"
          onClick={markWelcomeSeen}
          aria-label="Close welcome"
          data-testid="onboarding-welcome-close"
          className="absolute right-4 top-4 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-700"
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

        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Welcome to BrickThink
        </p>
        <h2
          id={titleId}
          className="mt-2 font-display text-[30px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 sm:text-[34px]"
        >
          Choose your first move
        </h2>
        <p className="mt-3 max-w-md text-[13px] leading-relaxed text-zinc-600">
          Pick a path to get going — you can replay this walkthrough anytime from account settings.
        </p>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <PathwayCard
            as="button"
            onClick={startBuilding}
            pending={pending}
            testid="onboarding-welcome-card-build"
            title="Start building right away"
            body="Start a building session of your own and get to know the way the application works."
            art={<BuildArt />}
          />
          <PathwayCard
            as="link"
            href="/app/workshops"
            onClick={markWelcomeSeen}
            testid="onboarding-welcome-card-workshop"
            title="Start your first workshop"
            body="Get your workshop ready to facilitate for your remote team."
            art={<WorkshopArt />}
          />
          <PathwayCard
            as="link"
            href={sessionHref}
            onClick={markWelcomeSeen}
            testid="onboarding-welcome-card-session"
            title="Start a session"
            body="Understand how to start a group session and the features for breakout rooms."
            art={<SessionArt />}
          />
        </div>

        {error ? (
          <p data-testid="onboarding-welcome-error" className="mt-4 text-[12px] text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={markWelcomeSeen}
            data-testid="onboarding-welcome-skip"
            className="cursor-pointer rounded-md px-3 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-900/5"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

type CardProps = {
  testid: string;
  title: string;
  body: string;
  art: ReactNode;
  onClick: () => void;
} & (
  | { as: 'link'; href: string; pending?: never }
  | { as: 'button'; href?: never; pending: boolean }
);

function PathwayCard(props: CardProps) {
  const inner = (
    <>
      <div
        aria-hidden="true"
        className="flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-[#f8efe9] via-[#f3e2d7] to-[#ecd2c2]"
      >
        {props.art}
      </div>
      <div className="flex flex-1 flex-col p-5 text-left">
        <h3 className="text-[14px] font-semibold tracking-tight text-zinc-950">{props.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600">
          {props.as === 'button' && props.pending ? 'Setting up your canvas…' : props.body}
        </p>
        <span
          aria-hidden="true"
          className="mt-auto inline-flex items-center gap-1 pt-4 text-[12px] font-semibold text-[#a8482a] transition-transform duration-200 group-hover:translate-x-0.5"
        >
          Go <span>&rarr;</span>
        </span>
      </div>
    </>
  );

  const className =
    'group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-900/10 bg-white text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#a8482a]/40 hover:shadow-[0_16px_36px_-20px_rgba(150,70,40,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8482a]';

  if (props.as === 'link') {
    return (
      <Link
        href={props.href}
        onClick={props.onClick}
        data-testid={props.testid}
        className={className}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.pending}
      data-testid={props.testid}
      className={`${className} disabled:cursor-wait disabled:opacity-70`}
    >
      {inner}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Illustrations — bespoke flat SVGs in the brand palette (terracotta  */
/* #a8482a, sage #5f7d72, warm neutrals) so no raster assets needed.   */
/* ------------------------------------------------------------------ */

function Stud({ x, y, fill }: { x: number; y: number; fill: string }) {
  return <rect x={x} y={y} width="10" height="5" rx="2" fill={fill} />;
}

/** A brick being placed onto a small stack. */
function BuildArt() {
  return (
    <svg viewBox="0 0 120 84" className="h-24 w-auto" aria-hidden="true">
      {/* floating brick + motion hint */}
      <g>
        <rect x="44" y="8" width="44" height="16" rx="3" fill="#a8482a" />
        <Stud x={50} y={3} fill="#a8482a" />
        <Stud x={66} y={3} fill="#a8482a" />
        <path
          d="M66 30v8"
          stroke="#9a4a2c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 4"
        />
      </g>
      {/* stack */}
      <rect x="24" y="46" width="44" height="16" rx="3" fill="#5f7d72" />
      <Stud x={30} y={41} fill="#5f7d72" />
      <Stud x={46} y={41} fill="#5f7d72" />
      <rect x="52" y="62" width="44" height="16" rx="3" fill="#cbb9ad" />
      <Stud x={58} y={57} fill="#cbb9ad" />
      <Stud x={74} y={57} fill="#cbb9ad" />
      <rect x="14" y="62" width="34" height="16" rx="3" fill="#d8d3cd" />
      <Stud x={20} y={57} fill="#d8d3cd" />
    </svg>
  );
}

/** A workshop board with cards and the team around it. */
function WorkshopArt() {
  return (
    <svg viewBox="0 0 120 84" className="h-24 w-auto" aria-hidden="true">
      {/* board */}
      <rect x="22" y="10" width="76" height="48" rx="6" fill="white" opacity="0.85" />
      <rect
        x="22"
        y="10"
        width="76"
        height="48"
        rx="6"
        fill="none"
        stroke="#a8482a"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <rect x="30" y="18" width="18" height="12" rx="2" fill="#a8482a" />
      <rect x="30" y="34" width="18" height="12" rx="2" fill="#d8d3cd" />
      <rect x="52" y="18" width="18" height="12" rx="2" fill="#5f7d72" />
      <rect x="52" y="34" width="18" height="12" rx="2" fill="#cbb9ad" />
      <rect x="74" y="18" width="16" height="28" rx="2" fill="#ecd2c2" />
      {/* facilitator + team */}
      <circle cx="34" cy="70" r="7" fill="#a8482a" />
      <circle cx="56" cy="72" r="5" fill="#5f7d72" />
      <circle cx="74" cy="72" r="5" fill="#cbb9ad" />
      <circle cx="90" cy="70" r="5" fill="#d8d3cd" />
    </svg>
  );
}

/** A main session room branching into breakout rooms. */
function SessionArt() {
  return (
    <svg viewBox="0 0 120 84" className="h-24 w-auto" aria-hidden="true">
      {/* main room */}
      <rect x="40" y="8" width="40" height="26" rx="5" fill="#a8482a" />
      <circle cx="52" cy="21" r="4" fill="#f8efe9" />
      <circle cx="62" cy="21" r="4" fill="#ecd2c2" />
      <circle cx="72" cy="21" r="4" fill="#f8efe9" />
      {/* connectors */}
      <path
        d="M60 34v8M60 42H28v8M60 42h32v8M60 42v8"
        stroke="#9a4a2c"
        strokeOpacity="0.45"
        strokeWidth="1.6"
        fill="none"
      />
      {/* breakout rooms */}
      <rect x="12" y="52" width="32" height="22" rx="4" fill="white" opacity="0.9" />
      <rect
        x="12"
        y="52"
        width="32"
        height="22"
        rx="4"
        fill="none"
        stroke="#5f7d72"
        strokeWidth="1.5"
      />
      <circle cx="23" cy="63" r="3.5" fill="#5f7d72" />
      <circle cx="33" cy="63" r="3.5" fill="#cbb9ad" />
      <rect x="44" y="52" width="32" height="22" rx="4" fill="white" opacity="0.9" />
      <rect
        x="44"
        y="52"
        width="32"
        height="22"
        rx="4"
        fill="none"
        stroke="#a8482a"
        strokeOpacity="0.6"
        strokeWidth="1.5"
      />
      <circle cx="55" cy="63" r="3.5" fill="#a8482a" />
      <circle cx="65" cy="63" r="3.5" fill="#d8d3cd" />
      <rect x="76" y="52" width="32" height="22" rx="4" fill="white" opacity="0.9" />
      <rect
        x="76"
        y="52"
        width="32"
        height="22"
        rx="4"
        fill="none"
        stroke="#cbb9ad"
        strokeWidth="1.5"
      />
      <circle cx="87" cy="63" r="3.5" fill="#cbb9ad" />
      <circle cx="97" cy="63" r="3.5" fill="#5f7d72" />
    </svg>
  );
}
