'use client';

import { useTransition } from 'react';

import { createModelInStage } from '../actions';

export function StartModelButton({
  sessionId,
  stageId,
}: {
  sessionId: string;
  stageId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(fd: FormData) => {
        startTransition(() => {
          void createModelInStage(fd);
        });
      }}
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="stageId" value={stageId} />
      <button
        type="submit"
        disabled={pending}
        data-testid="start-model-button"
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5 disabled:cursor-default disabled:opacity-60"
      >
        {pending ? 'Starting…' : 'Start your model'}
      </button>
    </form>
  );
}
