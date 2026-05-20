'use client';

import { useState } from 'react';

import type { Scenario } from '@/lib/scenarios/types';
import type { StageType } from '@/lib/sessions/types';

import { ScenarioPickerDialog } from './ScenarioPickerDialog';

const NEUTRAL_CHIP =
  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] bg-zinc-900/5 text-zinc-600';

interface Props {
  stageId: string;
  stageType: StageType;
  canManage: boolean;
  scenarios: Scenario[];
  pickedScenario: Scenario | null;
}

export function StageScenarioRow({
  stageId,
  stageType,
  canManage,
  scenarios,
  pickedScenario,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!canManage) {
    if (!pickedScenario) return null;
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-zinc-600">
        <span className="font-medium text-zinc-700">Scenario:</span>
        <span>{pickedScenario.title}</span>
        <span className={NEUTRAL_CHIP}>{pickedScenario.duration_minutes} min</span>
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]">
      <span className="font-medium text-zinc-700">Scenario:</span>
      {pickedScenario ? (
        <>
          <span className="text-zinc-900">{pickedScenario.title}</span>
          <span className={NEUTRAL_CHIP}>{pickedScenario.duration_minutes} min</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            data-testid={`scenario-change-${stageId}`}
            className="ml-1 text-zinc-500 underline-offset-2 hover:text-[#c0613d] hover:underline"
          >
            Change
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid={`scenario-pick-${stageId}`}
          className="inline-flex h-7 items-center rounded-md border border-dashed border-zinc-300 px-2 text-zinc-600 transition-colors hover:border-[#c0613d] hover:text-[#c0613d]"
        >
          Pick a scenario →
        </button>
      )}
      {open && (
        <ScenarioPickerDialog
          stageId={stageId}
          stageType={stageType}
          scenarios={scenarios}
          currentScenarioId={pickedScenario?.id ?? null}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
