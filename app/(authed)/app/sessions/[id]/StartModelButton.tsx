'use client';

import { useTransition } from 'react';

import { createModelInStage } from '../actions';

export function StartModelButton({
  sessionId,
  stageId,
  stageType,
  isTourTarget = false,
  canManage = false,
}: {
  sessionId: string;
  stageId: string;
  stageType: string;
  isTourTarget?: boolean;
  /**
   * Facilitator/admin view. Flips the label to "Create Example Model" — the
   * facilitator builds a demonstration canvas, participants "Start your model".
   */
  canManage?: boolean;
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
        data-testid={`start-model-${stageType}`}
        {...(isTourTarget ? { 'data-tour-id': 'start-model-button' } : {})}
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-[13px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5 disabled:cursor-default disabled:opacity-60"
      >
        {pending
          ? canManage
            ? 'Creating…'
            : 'Starting…'
          : canManage
            ? 'Create Example Model'
            : 'Start your model'}
      </button>
    </form>
  );
}
