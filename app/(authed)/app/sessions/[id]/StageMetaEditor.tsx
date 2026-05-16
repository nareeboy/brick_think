'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { stageDescription, stageLabel } from '@/lib/sessions/stage-labels';
import type { StageType } from '@/lib/sessions/types';

import { updateStageMeta } from '../actions';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 500;

interface Props {
  stageId: string;
  stageType: StageType;
  // Persisted overrides; null means "fall back to the canonical default".
  title: string | null;
  description: string | null;
  canEdit: boolean;
  isTourTarget?: boolean;
}

// Per-session overrides for a stage's title + description. Both fields are
// edited together in a single inline panel so the facilitator can rename and
// re-describe in one keystroke without two separate affordances cluttering
// the card. Clearing a field to empty resets it to the canonical default
// (null in the DB, fallback rendered from STAGE_LABELS / STAGE_DESCRIPTIONS).
export function StageMetaEditor({
  stageId,
  stageType,
  title,
  description,
  canEdit,
  isTourTarget = false,
}: Props) {
  const defaultTitle = stageLabel(stageType);
  const defaultDescription = stageDescription(stageType);

  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [titleOverride, setTitleOverride] = useState(title);
  const [descriptionOverride, setDescriptionOverride] = useState(description);
  const [draftTitle, setDraftTitle] = useState(title ?? '');
  const [draftDescription, setDraftDescription] = useState(description ?? '');

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) titleRef.current?.focus();
  }, [editing]);

  function startEditing() {
    if (!canEdit) return;
    setDraftTitle(titleOverride ?? '');
    setDraftDescription(descriptionOverride ?? '');
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraftTitle(titleOverride ?? '');
    setDraftDescription(descriptionOverride ?? '');
    setError(null);
    setEditing(false);
  }

  function commit() {
    const nextTitle = draftTitle.trim().slice(0, TITLE_MAX) || null;
    const nextDescription =
      draftDescription.trim().slice(0, DESCRIPTION_MAX) || null;

    if (
      nextTitle === (titleOverride ?? null) &&
      nextDescription === (descriptionOverride ?? null)
    ) {
      setEditing(false);
      return;
    }

    setError(null);
    setTitleOverride(nextTitle);
    setDescriptionOverride(nextDescription);
    setEditing(false);
    startTransition(() => {
      void updateStageMeta({
        stageId,
        title: nextTitle,
        description: nextDescription,
      }).catch((err: unknown) => {
        setTitleOverride(title);
        setDescriptionOverride(description);
        setError(err instanceof Error ? err.message : 'Failed to save');
      });
    });
  }

  const visibleTitle = titleOverride ?? defaultTitle;
  const visibleDescription = descriptionOverride ?? defaultDescription;

  if (!canEdit) {
    return (
      <>
        <h2 className="text-[16px] font-semibold tracking-tight text-zinc-950">
          {visibleTitle}
        </h2>
        <p className="text-[12px] leading-snug text-zinc-500">
          {visibleDescription}
        </p>
      </>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <input
          ref={titleRef}
          value={draftTitle}
          maxLength={TITLE_MAX}
          placeholder={defaultTitle}
          aria-label="Stage title"
          data-testid={`stage-title-input-${stageId}`}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          className="-mx-1.5 rounded-md border border-[#c0613d]/40 bg-[#c0613d]/5 px-1.5 py-0.5 text-[16px] font-semibold tracking-tight text-zinc-950 outline-none focus:border-[#c0613d]"
        />
        <textarea
          value={draftDescription}
          maxLength={DESCRIPTION_MAX}
          placeholder={defaultDescription}
          aria-label="Stage description"
          data-testid={`stage-description-input-${stageId}`}
          onChange={(e) => setDraftDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          rows={2}
          className="-mx-1.5 resize-none rounded-md border border-[#c0613d]/40 bg-[#c0613d]/5 px-1.5 py-0.5 text-[12px] leading-snug text-zinc-700 outline-none focus:border-[#c0613d]"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={commit}
            disabled={pending}
            className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md bg-[#c0613d] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 bg-white px-3 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
          >
            Cancel
          </button>
          <span className="text-[11px] text-zinc-500">
            Leave blank to use the default.
          </span>
        </div>
        {error ? (
          <p className="text-[12px] text-[#c0613d]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      disabled={pending}
      title="Edit stage title and description"
      aria-label={`Edit ${visibleTitle}`}
      data-testid={`stage-meta-${stageId}`}
      {...(isTourTarget ? { 'data-tour-id': 'stage-meta-pencil' } : {})}
      className="group -mx-1.5 flex flex-col items-start gap-1 rounded-md px-1.5 py-0.5 text-left hover:bg-zinc-900/5 disabled:cursor-default disabled:opacity-70"
    >
      <span className="flex items-center gap-1.5">
        <span className="text-[16px] font-semibold tracking-tight text-zinc-950">
          {visibleTitle}
        </span>
        <PencilIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-600" />
      </span>
      <span className="text-[12px] leading-snug text-zinc-500">
        {visibleDescription}
      </span>
    </button>
  );
}

function PencilIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
