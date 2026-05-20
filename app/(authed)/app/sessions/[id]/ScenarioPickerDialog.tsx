'use client';

import { useId, useState, useTransition } from 'react';

import { setStageScenarioAction } from '@/app/(authed)/app/sessions/scenario-actions';
import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import { STAGE_CHIP_LABEL, stageChipClasses } from '@/lib/scenarios/stageChip';
import type { Scenario } from '@/lib/scenarios/types';
import type { StageType } from '@/lib/sessions/types';

const NEUTRAL_CHIP =
  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] bg-zinc-900/5 text-zinc-600';

interface Props {
  stageId: string;
  stageType: StageType;
  scenarios: Scenario[];
  currentScenarioId: string | null;
  onClose: () => void;
}

export function ScenarioPickerDialog({
  stageId,
  stageType,
  scenarios,
  currentScenarioId,
  onClose,
}: Props) {
  const titleId = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(scenarioId: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await setStageScenarioAction(stageId, scenarioId);
      if (result.ok) {
        onClose();
      } else {
        setError(messageForCode(result.code));
      }
    });
  }

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId} panelClassName="w-full max-w-2xl">
      <div className="flex max-h-[80vh] flex-col rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-serif text-[22px] leading-tight text-zinc-900">
            Pick a scenario for {STAGE_CHIP_LABEL[stageType]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-900/5"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pr-1" data-scroll-target="">
          {scenarios.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-zinc-500">
              No scenarios available for this stage.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {scenarios.map((s) => (
                <li
                  key={s.id}
                  className={`rounded-2xl border p-4 ${
                    s.id === currentScenarioId
                      ? 'border-[#c0613d] bg-[#c0613d]/5'
                      : 'border-zinc-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif text-[18px] leading-tight text-zinc-900">
                        {s.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={stageChipClasses(s.stage_type)}>
                          {STAGE_CHIP_LABEL[s.stage_type]}
                        </span>
                        <span className={NEUTRAL_CHIP}>{s.duration_minutes} min</span>
                        {s.tags.slice(0, 3).map((t) => (
                          <span key={t} className={NEUTRAL_CHIP}>
                            {t}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">{s.body}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => pick(s.id)}
                      disabled={pending}
                      data-testid="scenario-picker-confirm"
                      className="inline-flex h-9 shrink-0 items-center rounded-xl bg-[#c0613d] px-3 text-[12px] font-medium text-white transition-colors hover:bg-[#a85432] disabled:opacity-50"
                    >
                      {s.id === currentScenarioId ? 'Selected' : 'Pick'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {currentScenarioId && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => pick(null)}
              disabled={pending}
              className="text-[12px] font-medium text-zinc-500 underline-offset-2 hover:underline disabled:opacity-50"
            >
              Clear pick
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-[12px] text-red-700">
            {error}
          </p>
        )}
      </div>
    </ModalBackdrop>
  );
}

function messageForCode(code: string): string {
  switch (code) {
    case 'not_facilitator':
      return 'Only the facilitator can pick a scenario.';
    case 'scenario_stage_mismatch':
      return 'That scenario is for a different stage type.';
    case 'scenario_not_found':
      return 'That scenario no longer exists. Refresh and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
