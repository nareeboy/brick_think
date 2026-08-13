'use client';

import { useState } from 'react';

import { AddMemberDialog } from './AddMemberDialog';
import { PlusIcon } from '@/components/icons';

interface Props {
  orgId: string;
}

export function AddMemberForm({ orgId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="open-add-member-dialog"
        className="inline-flex h-9 w-fit cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#a8482a] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47]"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Add member
      </button>
      {open ? <AddMemberDialog orgId={orgId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
