'use client';

import { useRef, useState, useTransition } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';

import { deleteSession } from '../actions';

export function DeleteSessionButton({
  sessionId,
  sessionTitle,
}: {
  sessionId: string;
  sessionTitle: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeAndRestoreFocus() {
    setConfirming(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={pending}
        data-testid="delete-session-button"
        onClick={() => setConfirming(true)}
        aria-label="Delete session"
        title="Delete session"
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-red-200 text-red-700 transition-colors hover:bg-red-50 disabled:cursor-default disabled:opacity-60"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
      {confirming ? (
        <DeleteConfirmDialog
          title="Delete this session?"
          description={
            <>
              &ldquo;{sessionTitle}&rdquo; and all its stages and participant models will be
              hard-deleted. This cannot be undone.
            </>
          }
          confirmLabel="Delete session"
          pending={pending}
          onCancel={closeAndRestoreFocus}
          onConfirm={() =>
            startTransition(() => {
              void deleteSession(sessionId);
            })
          }
        />
      ) : null}
    </>
  );
}

function TrashIcon({ className = '' }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6 17.5 20a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7L5 6" />
    </svg>
  );
}
