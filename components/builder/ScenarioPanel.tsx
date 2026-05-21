'use client';

import { useEffect, useRef, useState } from 'react';

import { STAGE_CHIP_LABEL, stageChipClasses } from '@/lib/scenarios/stageChip';
import type { StageType } from '@/lib/sessions/types';

export interface BuilderScenario {
  stageType: StageType;
  title: string;
  body: string;
}

interface Props {
  scenario: BuilderScenario;
}

export function ScenarioPanel({ scenario }: Props) {
  const [open, setOpen] = useState(true);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const infoButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    } else {
      infoButtonRef.current?.focus();
    }
    // We only want to move focus on a deliberate open/close toggle, not on
    // every render — the dependency array is intentionally just `open`.
  }, [open]);

  if (!open) {
    return (
      <button
        ref={infoButtonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show scenario brief"
        aria-expanded={false}
        title="Show scenario brief"
        data-testid="scenario-panel-info"
        className="absolute left-5 top-5 z-30 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-zinc-900/10 bg-white/85 text-zinc-700 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur transition-colors hover:bg-white hover:text-zinc-900"
      >
        <InfoIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Scenario brief"
      data-testid="scenario-panel"
      className="absolute left-5 top-5 z-30 flex w-[min(360px,calc(100%-2.5rem))] flex-col rounded-2xl border border-zinc-900/10 bg-white/95 p-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.35)] backdrop-blur"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={stageChipClasses(scenario.stageType)}>
          {STAGE_CHIP_LABEL[scenario.stageType]}
        </span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide scenario brief"
          aria-expanded={true}
          title="Hide scenario brief"
          data-testid="scenario-panel-close"
          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <h2 className="mt-2 font-serif text-[15px] leading-tight text-zinc-900">
        {scenario.title}
      </h2>
      <p className="mt-2 max-h-[40vh] overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
        {scenario.body}
      </p>
    </aside>
  );
}

function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}
