'use client';

import { useTransition } from 'react';

import { deleteSessionModel } from '../actions';

export function DeleteSessionModelButton({ modelId }: { modelId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      data-testid="delete-session-model-button"
      onClick={() => {
        if (
          !window.confirm(
            'Delete this model? This cannot be undone — session-scoped models are hard-deleted.',
          )
        ) {
          return;
        }
        startTransition(() => {
          void deleteSessionModel(modelId);
        });
      }}
      className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl px-3 text-[12px] font-medium text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-800 disabled:cursor-default disabled:opacity-60"
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
