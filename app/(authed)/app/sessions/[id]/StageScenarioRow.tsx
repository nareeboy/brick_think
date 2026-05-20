'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { updateStageScenarioBodyAction } from '@/app/(authed)/app/sessions/scenario-actions';
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
  /** Per-session override of pickedScenario.body. Null = use canonical body. */
  bodyOverride: string | null;
}

export function StageScenarioRow({
  stageId,
  stageType,
  canManage,
  pickedScenario,
  bodyOverride,
}: Props) {
  // Nothing picked → render nothing. The pick affordance now lives in the
  // pre-session checklist row above (PreSessionChecklist.tsx).
  if (!pickedScenario) return null;

  const isOverridden = bodyOverride !== null && bodyOverride.trim().length > 0;
  const displayedBody = isOverridden ? (bodyOverride as string) : pickedScenario.body;

  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={stageChipClasses(stageType)}>{STAGE_CHIP_LABEL[stageType]}</span>
        <span className={NEUTRAL_CHIP}>{pickedScenario.duration_minutes} min</span>
        <span className="font-serif text-[15px] leading-tight text-zinc-900">
          {pickedScenario.title}
        </span>
        {isOverridden && <span className={NEUTRAL_CHIP}>customised</span>}
      </div>

      {canManage ? (
        <ScenarioBodyEditor
          stageId={stageId}
          canonicalBody={pickedScenario.body}
          initialOverride={bodyOverride}
          displayedBody={displayedBody}
        />
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
          {displayedBody}
        </p>
      )}
    </div>
  );
}

interface EditorProps {
  stageId: string;
  canonicalBody: string;
  initialOverride: string | null;
  displayedBody: string;
}

function ScenarioBodyEditor({
  stageId,
  canonicalBody,
  initialOverride,
  displayedBody,
}: EditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayedBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Re-sync draft when the displayed body changes from above (e.g. the
    // scenario was swapped via the picker while the editor was collapsed).
    setDraft(displayedBody);
  }, [displayedBody]);

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }
  }, [editing]);

  function save() {
    setError(null);
    const trimmed = draft.trim();
    // If the draft equals the canonical text, clear the override server-
    // side so the row falls back to the seed and the "customised" chip
    // goes away.
    const next = trimmed === canonicalBody.trim() ? null : trimmed === '' ? null : trimmed;
    startTransition(async () => {
      const result = await updateStageScenarioBodyAction(stageId, next);
      if (!result.ok) {
        setError(
          result.code === 'body_too_long'
            ? 'Body is too long (4000 character max).'
            : 'Could not save changes.',
        );
        return;
      }
      setEditing(false);
    });
  }

  function cancel() {
    setDraft(displayedBody);
    setError(null);
    setEditing(false);
  }

  function resetToCanonical() {
    setDraft(canonicalBody);
    textareaRef.current?.focus();
  }

  if (!editing) {
    return (
      <div className="mt-2">
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">
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
          {initialOverride !== null && (
            <span className="text-[11px] text-zinc-500">Edited from the canonical prompt.</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={Math.min(12, Math.max(5, draft.split('\n').length + 1))}
        maxLength={4000}
        className="block w-full rounded-xl border border-zinc-200 bg-white p-3 text-[13px] leading-relaxed text-zinc-900 placeholder:text-zinc-500"
        placeholder="Tailor the prompt for this session, or add facilitator notes…"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-zinc-500">
          {draft.trim().length} / 4000 characters
          {draft.trim() !== canonicalBody.trim() && draft.trim() !== '' && (
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
