'use client';

import { useState } from 'react';

import { FacilitatorNotesDrawer } from '@/components/session/FacilitatorNotesDrawer';

interface Props {
  sessionId: string;
  initialValue: string | null;
}

// Canvas-header trigger for the right-edge facilitator notes drawer. Rendered
// only when the caller is the facilitator of the design's parent session
// (gated server-side in the design page).
export function FacilitatorNotesButton({ sessionId, initialValue }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Open private notes"
        data-testid="facilitator-notes-button"
        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-zinc-900/10 bg-white/85 px-3.5 text-[13px] font-semibold text-zinc-700 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur transition-colors hover:bg-white hover:text-zinc-900"
      >
        <NoteIcon className="h-4 w-4" />
        Private Notes
      </button>
      <FacilitatorNotesDrawer
        sessionId={sessionId}
        initialValue={initialValue}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function NoteIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M16 4v4h3" />
      <path d="M8 12h8" />
      <path d="M8 16h6" />
    </svg>
  );
}
