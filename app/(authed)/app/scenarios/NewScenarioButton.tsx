'use client';

import Link from 'next/link';
import { useId, useState } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';

import { ScenarioEditorDialog, type OrgOption } from './ScenarioEditorDialog';

interface Props {
  orgs: OrgOption[];
}

export function NewScenarioButton({ orgs }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

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

      {open &&
        (orgs.length === 0 ? (
          <ModalBackdrop onClose={() => setOpen(false)} titleId={titleId}>
            <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
              <h2 id={titleId} className="font-serif text-[22px] leading-tight text-zinc-900">
                You need a workshop first
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-zinc-600">
                Custom scenarios live inside a workshop so your whole team can use them in sessions.
                Create or join a workshop, then come back here.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 items-center rounded-xl border border-zinc-200 px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
                >
                  Close
                </button>
                <Link
                  href="/app/workshops"
                  className="inline-flex h-10 items-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#a85432]"
                >
                  Go to workshops
                </Link>
              </div>
            </div>
          </ModalBackdrop>
        ) : (
          <ScenarioEditorDialog mode="create" orgs={orgs} onClose={() => setOpen(false)} />
        ))}
    </>
  );
}
