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
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-3 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-800 disabled:cursor-default disabled:opacity-60"
      >
        {pending ? 'Deleting…' : 'Delete session'}
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
