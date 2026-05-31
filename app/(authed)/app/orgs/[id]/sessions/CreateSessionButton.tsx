'use client';

import { useState } from 'react';

import { NewSessionDialog } from './NewSessionDialog';

export function CreateSessionButton({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="open-new-session-dialog"
        data-tour-id="create-session-button"
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#c0613d] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47]"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Create session
      </button>
      {open ? <NewSessionDialog orgId={orgId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
