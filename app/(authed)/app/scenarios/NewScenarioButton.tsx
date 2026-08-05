'use client';

import { useState } from 'react';

import { ScenarioEditorDialog, type OrgOption } from './ScenarioEditorDialog';

interface Props {
  orgs: OrgOption[];
}

export function NewScenarioButton({ orgs }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="new-scenario-button"
        className="inline-flex h-9 items-center rounded-xl bg-[#a8482a] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#a85432]"
      >
        New scenario
      </button>

      {open && <ScenarioEditorDialog mode="create" orgs={orgs} onClose={() => setOpen(false)} />}
    </>
  );
}
