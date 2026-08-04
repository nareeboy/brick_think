'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import {
  SCENARIO_BODY_MAX,
  SCENARIO_DURATION_MAX,
  SCENARIO_DURATION_MIN,
  SCENARIO_TITLE_MAX,
} from '@/lib/scenarios/authoring';
import { STAGE_CHIP_LABEL } from '@/lib/scenarios/stageChip';
import type { Scenario } from '@/lib/scenarios/types';
import { CANONICAL_STAGE_TYPES, type StageType } from '@/lib/sessions/types';

import { createScenarioAction, updateScenarioAction } from './actions';

export interface OrgOption {
  id: string;
  name: string;
}

type Props =
  | { mode: 'create'; orgs: OrgOption[]; onClose: () => void }
  | { mode: 'edit'; scenario: Scenario; orgs: OrgOption[]; onClose: () => void };

const FIELD_CLASSES =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-500 focus:outline focus:outline-2 focus:outline-[#a8482a]/40';

const LABEL_CLASSES = 'mb-1 block text-[12px] font-medium text-zinc-700';

function messageForCode(code: string): string {
  switch (code) {
    case 'invalid_input':
      return 'Check the fields — title, body, and duration all have limits.';
    case 'not_org_member':
      return 'You are not a member of that workshop.';
    case 'not_found_or_not_creator':
      return 'Only the creator can edit this scenario.';
    case 'unauthenticated':
      return 'Your session expired. Refresh and sign in again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function ScenarioEditorDialog(props: Props) {
  const { orgs, onClose } = props;
  const editing = props.mode === 'edit' ? props.scenario : null;
  const titleId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [stageType, setStageType] = useState<StageType>(editing?.stage_type ?? 'skill_building');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [body, setBody] = useState(editing?.body ?? '');
  const [duration, setDuration] = useState(String(editing?.duration_minutes ?? 15));
  const [tags, setTags] = useState(editing?.tags.join(', ') ?? '');
  // '' encodes "Personal" in the select; mapped to null on submit.
  const [orgId, setOrgId] = useState(editing?.org_id ?? '');

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function submit() {
    setError(null);
    const input = {
      stageType,
      title,
      body,
      durationMinutes: Number(duration),
      tags,
      orgId: orgId === '' ? null : orgId,
    };
    startTransition(async () => {
      const result = editing
        ? await updateScenarioAction(editing.id, input)
        : await createScenarioAction(input);
      if (result.ok) {
        onClose();
      } else {
        setError(messageForCode(result.code));
      }
    });
  }

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId} panelClassName="w-full max-w-xl">
      <form
        className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 id={titleId} className="font-serif text-[22px] leading-tight text-zinc-900">
          {editing ? 'Edit scenario' : 'New scenario'}
        </h2>

        <div>
          <label className={LABEL_CLASSES} htmlFor={`${titleId}-stage`}>
            Stage
          </label>
          <select
            id={`${titleId}-stage`}
            value={stageType}
            onChange={(e) => setStageType(e.target.value as StageType)}
            className={FIELD_CLASSES}
          >
            {CANONICAL_STAGE_TYPES.map((st) => (
              <option key={st} value={st}>
                {STAGE_CHIP_LABEL[st]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLASSES} htmlFor={`${titleId}-title`}>
            Title
          </label>
          <input
            id={`${titleId}-title`}
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={SCENARIO_TITLE_MAX}
            required
            placeholder="e.g. Model our quarterly ritual"
            className={FIELD_CLASSES}
          />
        </div>

        <div>
          <label className={LABEL_CLASSES} htmlFor={`${titleId}-body`}>
            Prompt
          </label>
          <textarea
            id={`${titleId}-body`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={SCENARIO_BODY_MAX}
            required
            rows={6}
            placeholder="What should participants build, and what question should the model answer?"
            className={FIELD_CLASSES}
          />
        </div>

        <div className="flex gap-4">
          <div className="w-40">
            <label className={LABEL_CLASSES} htmlFor={`${titleId}-duration`}>
              Duration (min)
            </label>
            <input
              id={`${titleId}-duration`}
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min={SCENARIO_DURATION_MIN}
              max={SCENARIO_DURATION_MAX}
              required
              className={FIELD_CLASSES}
            />
          </div>
          <div className="flex-1">
            <label className={LABEL_CLASSES} htmlFor={`${titleId}-tags`}>
              Tags
            </label>
            <input
              id={`${titleId}-tags`}
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma, separated, tags"
              className={FIELD_CLASSES}
            />
          </div>
        </div>

        {orgs.length > 0 && (
          <div>
            <label className={LABEL_CLASSES} htmlFor={`${titleId}-org`}>
              Save to
            </label>
            <select
              id={`${titleId}-org`}
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className={FIELD_CLASSES}
            >
              <option value="">Personal (only you)</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p role="alert" className="text-[12px] text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-xl border border-zinc-200 px-4 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            data-testid="scenario-editor-save"
            className="inline-flex h-10 items-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#a85432] disabled:opacity-50"
          >
            {pending ? 'Saving…' : editing ? 'Save changes' : 'Create scenario'}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  );
}
