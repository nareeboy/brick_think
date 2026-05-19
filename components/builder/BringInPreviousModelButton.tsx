'use client';

import { useState, useTransition } from 'react';

import { bringInPreviousModel } from '@/app/(authed)/app/sessions/stage-import-actions';

import { useBuilderState } from './builderState';

interface Props {
  /** null when the button must never mount (non-session, non-whitelisted, read-only, etc.). */
  sourceStageLabel: string | null;
  /** True if a model_imports row exists for this (target, caller). Server-rendered at page load. */
  alreadyImported: boolean;
}

const FAILURE_COPY: Record<string, string> = {
  model_not_found: 'This model is no longer available.',
  source_not_found_template: "You don't have a {sourceStageLabel} to bring in.",
  destination_not_empty: 'Cancel out your current canvas first.',
  already_imported: "You've already brought in your previous model.",
  unsupported_target_stage: 'This stage cannot import from a previous one.',
  invalid_uuid: 'Something went wrong. Reload and try again.',
  unauthenticated: 'Please sign in again.',
};

export function BringInPreviousModelButton({ sourceStageLabel, alreadyImported }: Props) {
  const { modelId, readOnly, bricks, liveMode, appendImportedBricks } = useBuilderState();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!modelId || readOnly || sourceStageLabel === null) return null;
  if (alreadyImported || (!liveMode && bricks.length > 0)) return null;

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const res = await bringInPreviousModel(modelId);
      if (!res.ok) {
        const templateKey =
          res.code === 'source_not_found' ? 'source_not_found_template' : res.code;
        const message = (FAILURE_COPY[templateKey] ?? FAILURE_COPY.invalid_uuid!).replace(
          '{sourceStageLabel}',
          sourceStageLabel,
        );
        setError(message);
        return;
      }
      if (res.mode === 'server_copied') {
        // BuilderProvider state initialises once via useState(()⇒…); a full
        // reload remounts the builder with the new initial canvas.
        window.location.reload();
        return;
      }
      // client_append (shared_model)
      appendImportedBricks(res.source);
    });
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      <div className="pointer-events-auto rounded-2xl border border-zinc-900/10 bg-white/95 px-6 py-5 text-center shadow-[0_20px_40px_-20px_rgba(0,0,0,0.25)] backdrop-blur">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Continue your work
        </p>
        <h2 className="mt-2 text-[18px] font-semibold text-zinc-900">Bring in my previous model</h2>
        <p className="mt-1.5 max-w-[260px] text-[12px] text-zinc-600">
          Copies bricks from your {sourceStageLabel}. One-shot.
        </p>
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          data-testid="bring-in-previous-model"
          className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Bringing in…' : 'Bring in my previous model'}
        </button>
        {error ? (
          <p role="alert" className="mt-3 text-[12px] text-[#c0613d]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
