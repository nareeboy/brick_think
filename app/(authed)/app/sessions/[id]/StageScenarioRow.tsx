'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { updateStageScenarioOverridesAction } from '@/app/(authed)/app/sessions/scenario-actions';
import { STAGE_CHIP_LABEL, stageChipClasses } from '@/lib/scenarios/stageChip';
import type { Scenario } from '@/lib/scenarios/types';
import type { StageType } from '@/lib/sessions/types';

const NEUTRAL_CHIP =
  'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] bg-zinc-900/5 text-zinc-600';

interface Props {
  stageId: string;
  stageType: StageType;
  canManage: boolean;
  pickedScenario: Scenario | null;
  /** Per-session override of pickedScenario.title. Null = use canonical title. */
  titleOverride: string | null;
  /** Per-session override of pickedScenario.body. Null = use canonical body. */
  bodyOverride: string | null;
}

export function StageScenarioRow({
  stageId,
  stageType,
  canManage,
  pickedScenario,
  titleOverride,
  bodyOverride,
}: Props) {
  // Nothing picked → render nothing. The pick affordance lives in the
  // pre-session checklist row above (PreSessionChecklist.tsx).
  if (!pickedScenario) return null;

  const titleIsOverridden = titleOverride !== null && titleOverride.trim().length > 0;
  const bodyIsOverridden = bodyOverride !== null && bodyOverride.trim().length > 0;
  const isCustomised = titleIsOverridden || bodyIsOverridden;

  const displayedTitle = titleIsOverridden ? (titleOverride as string) : pickedScenario.title;
  const displayedBody = bodyIsOverridden ? (bodyOverride as string) : pickedScenario.body;

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={stageChipClasses(stageType)}>{STAGE_CHIP_LABEL[stageType]}</span>
        <span className={NEUTRAL_CHIP}>{pickedScenario.duration_minutes} min</span>
        {isCustomised && <span className={NEUTRAL_CHIP}>customised</span>}
      </div>

      {canManage ? (
        <ScenarioEditor
          stageId={stageId}
          canonicalTitle={pickedScenario.title}
          canonicalBody={pickedScenario.body}
          titleOverride={titleOverride}
          bodyOverride={bodyOverride}
          displayedTitle={displayedTitle}
          displayedBody={displayedBody}
        />
      ) : (
        <>
          <h3 className="mt-2 font-serif text-[15px] leading-tight text-zinc-900">
            {displayedTitle}
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
            {displayedBody}
          </p>
        </>
      )}
    </div>
  );
}

interface EditorProps {
  stageId: string;
  canonicalTitle: string;
  canonicalBody: string;
  titleOverride: string | null;
  bodyOverride: string | null;
  displayedTitle: string;
  displayedBody: string;
}

function ScenarioEditor({
  stageId,
  canonicalTitle,
  canonicalBody,
  titleOverride,
  bodyOverride,
  displayedTitle,
  displayedBody,
}: EditorProps) {
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(displayedTitle);
  const [bodyDraft, setBodyDraft] = useState(displayedBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Re-sync drafts when the displayed values change above (e.g. a
    // different scenario was picked while the editor was collapsed).
    setTitleDraft(displayedTitle);
    setBodyDraft(displayedBody);
  }, [displayedTitle, displayedBody]);

  useEffect(() => {
    if (editing) titleRef.current?.focus();
  }, [editing]);

  const isOverridden = titleOverride !== null || bodyOverride !== null;

  function save() {
    setError(null);
    const trimmedTitle = titleDraft.trim();
    const trimmedBody = bodyDraft.trim();
    // Drafts that equal the canonical → clear that override server-side so
    // the row falls back to the seed and the "customised" chip disappears
    // once both fields match canonical.
    const nextTitle =
      trimmedTitle === '' || trimmedTitle === canonicalTitle.trim() ? null : trimmedTitle;
    const nextBody =
      trimmedBody === '' || trimmedBody === canonicalBody.trim() ? null : trimmedBody;
    startTransition(async () => {
      const result = await updateStageScenarioOverridesAction(stageId, {
        title: nextTitle,
        body: nextBody,
      });
      if (!result.ok) {
        setError(messageForCode(result.code));
        return;
      }
      setEditing(false);
    });
  }

  function cancel() {
    setTitleDraft(displayedTitle);
    setBodyDraft(displayedBody);
    setError(null);
    setEditing(false);
  }

  function resetToCanonical() {
    setTitleDraft(canonicalTitle);
    setBodyDraft(canonicalBody);
  }

  if (!editing) {
    return (
      <div className="mt-2">
        <h3 className="font-serif text-[15px] leading-tight text-zinc-900">{displayedTitle}</h3>
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
          {displayedBody}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            data-testid={`scenario-body-edit-${stageId}`}
            className="inline-flex h-8 items-center rounded-lg px-2 text-[12px] font-medium text-zinc-600 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
          >
            Edit
          </button>
          {isOverridden && (
            <span className="text-[11px] text-zinc-500">Edited from the canonical prompt.</span>
          )}
        </div>
      </div>
    );
  }

  const titleDiffers = titleDraft.trim() !== canonicalTitle.trim();
  const bodyDiffers = bodyDraft.trim() !== canonicalBody.trim();
  const anyDifference =
    (titleDraft.trim() !== '' && titleDiffers) || (bodyDraft.trim() !== '' && bodyDiffers);

  return (
    <div className="mt-2">
      <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
        Title
        <input
          ref={titleRef}
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          maxLength={120}
          className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[15px] font-serif text-zinc-900 placeholder:text-zinc-500"
          placeholder={canonicalTitle}
        />
      </label>
      <p className="mt-1 text-[11px] text-zinc-500">{titleDraft.trim().length} / 120 characters</p>

      <label className="mt-3 block text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
        Body
        <textarea
          value={bodyDraft}
          onChange={(e) => setBodyDraft(e.target.value)}
          rows={Math.min(12, Math.max(5, bodyDraft.split('\n').length + 1))}
          maxLength={4000}
          className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white p-3 text-[13px] leading-relaxed text-zinc-900 placeholder:text-zinc-500"
          placeholder={canonicalBody}
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-zinc-500">
          {bodyDraft.trim().length} / 4000 characters
          {anyDifference && (
            <>
              {' · '}
              <button
                type="button"
                onClick={resetToCanonical}
                className="underline-offset-2 hover:underline"
              >
                Reset to canonical
              </button>
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-lg px-3 text-[12px] font-medium text-zinc-600 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-900/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            data-testid={`scenario-body-save-${stageId}`}
            className="inline-flex h-8 items-center rounded-lg bg-[#c0613d] px-3 text-[12px] font-medium text-white transition-colors hover:bg-[#a85432] disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function messageForCode(code: string): string {
  switch (code) {
    case 'title_too_long':
      return 'Title is too long (120 character max).';
    case 'body_too_long':
      return 'Body is too long (4000 character max).';
    case 'not_facilitator':
      return 'Only the facilitator can edit a scenario.';
    default:
      return 'Could not save changes.';
  }
}
