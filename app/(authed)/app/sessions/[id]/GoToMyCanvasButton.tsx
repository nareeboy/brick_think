'use client';

import { useTransition } from 'react';

import { createModelInStage } from '../actions';

interface Props {
  sessionId: string;
  currentStageId: string | null;
}

export function GoToMyCanvasButton({ sessionId, currentStageId }: Props) {
  const [pending, startTransition] = useTransition();

  if (!currentStageId) {
    return null; // No active stage yet
  }

  const handleSubmit = (fd: FormData) => {
    startTransition(() => {
      void createModelInStage(fd);
    });
  };

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="stageId" value={currentStageId} />
      <button
        type="submit"
        disabled={pending}
        data-testid="go-to-canvas-button"
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5 disabled:cursor-default disabled:opacity-60"
      >
        {pending ? 'Opening…' : 'Go to my canvas'}
      </button>
    </form>
  );
}
