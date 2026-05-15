'use client';

import { useState } from 'react';

import type { OrgSummary } from '@/lib/orgs/types';

import { NewDesignDialog } from './NewDesignDialog';

interface Props {
  orgs: OrgSummary[];
}

export function NewDesignDialogButton({ orgs }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-testid="new-design-button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[14px] font-semibold text-white shadow-[0_12px_24px_-12px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47]"
      >
        New design
      </button>
      {open ? <NewDesignDialog orgs={orgs} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
