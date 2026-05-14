'use client';

import { useRef, useState, useTransition } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';

import { deleteSessionModel } from '../actions';

export function DeleteSessionModelButton({
  modelId,
  modelTitle,
}: {
  modelId: string;
  modelTitle: string;
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
        data-testid="delete-session-model-button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-3 text-[12px] font-medium text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-800 disabled:cursor-default disabled:opacity-60"
      >
        {pending ? 'Deleting…' : 'Delete'}
      </button>
      {confirming ? (
        <DeleteConfirmDialog
          title="Delete this model?"
          description={
            <>
              &ldquo;{modelTitle}&rdquo; is hard-deleted. Session-scoped models are not
              recoverable from Trash.
            </>
          }
          pending={pending}
          onCancel={closeAndRestoreFocus}
          onConfirm={() =>
            startTransition(() => {
              void deleteSessionModel(modelId);
            })
          }
        />
      ) : null}
    </>
  );
}
