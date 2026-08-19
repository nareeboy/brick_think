'use client';

import { useRef, useState, useTransition } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';
import { TrashIcon } from '@/components/icons';

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
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-red-700 text-red-700 transition-colors hover:bg-red-50 disabled:cursor-default disabled:opacity-60"
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
