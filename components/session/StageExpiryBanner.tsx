'use client';

import { useState } from 'react';

type StageActionResult = { ok: boolean; code?: string };

export type StageExpiryBannerActions = {
  extend: (id: string, seconds: number) => Promise<StageActionResult>;
  advance: (id: string) => Promise<StageActionResult>;
};

type Props = {
  stageId: string;
  isLastStage: boolean;
  actions: StageExpiryBannerActions;
  /** Maps a stage-action `code` to a user-facing message. Owned by the page so
   *  every facilitator-facing surface emits the same copy. */
  messageForCode: (code: string) => string;
};

// Facilitator-only banner that promotes Extend / Advance when the active stage's
// timer has hit 0. Both actions are also reachable from the dashed Stage timer
// cluster, but at expiry we surface them prominently so a distracted facilitator
// doesn't leave the session sitting at 0:00. The parent decides when to mount
// the banner — see SessionStages.tsx for the visibility gate.
export function StageExpiryBanner({ stageId, isLastStage, actions, messageForCode }: Props) {
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wrap = (fn: () => Promise<StageActionResult>) => async () => {
    setPending(true);
    setErrorMessage(null);
    try {
      const result = await fn();
      if (!result.ok) {
        setErrorMessage(messageForCode(result.code ?? 'unknown'));
      }
    } catch (err) {
      setErrorMessage('Unexpected error. Refresh to recover.');
      console.error('stage expiry action failed', err);
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="stage-expiry-banner"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/70 px-3 py-2.5"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="inline-block size-2 rounded-full bg-red-500" />
        <p className="text-[13px] font-medium text-red-900">
          Time&apos;s up.{' '}
          {isLastStage ? 'End the session when you’re ready.' : 'Extend or move on.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={wrap(() => actions.extend(stageId, 300))}
          disabled={pending}
          data-testid="expiry-extend-button"
          className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-zinc-900/15 bg-white px-3 text-[13px] font-medium text-zinc-800 transition-colors transition-transform duration-150 ease-out hover:bg-zinc-900/5 active:scale-[0.98] disabled:cursor-default disabled:opacity-50"
        >
          Extend +5m
        </button>
        {!isLastStage ? (
          <button
            type="button"
            onClick={wrap(() => actions.advance(stageId))}
            disabled={pending}
            data-testid="advance-stage-button"
            className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-zinc-900 px-3 text-[13px] font-medium text-white transition-colors transition-transform duration-150 ease-out hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-default disabled:opacity-50"
          >
            Advance
          </button>
        ) : null}
      </div>
      {errorMessage ? (
        <p role="alert" className="basis-full text-[12px] text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
