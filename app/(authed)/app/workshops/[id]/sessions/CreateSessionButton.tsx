'use client';

import { useState, type ReactNode } from 'react';

import { NewSessionDialog } from './NewSessionDialog';
import { PlusIcon } from '@/components/icons';

export function CreateSessionButton({
  orgId,
  assistantEntry,
}: {
  orgId: string;
  assistantEntry?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="open-new-session-dialog"
        data-tour-id="create-session-button"
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#a8482a] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47]"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Create session
      </button>
      {open ? (
        <NewSessionDialog
          orgId={orgId}
          onClose={() => setOpen(false)}
          assistantEntry={assistantEntry}
        />
      ) : null}
    </>
  );
}
