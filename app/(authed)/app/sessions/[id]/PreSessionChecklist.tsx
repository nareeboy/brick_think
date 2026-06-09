'use client';

import Link from 'next/link';
import { useState, useTransition, type ReactNode } from 'react';

import {
  updatePreSessionCheckAction,
  updateSessionBriefAction,
} from '@/app/(authed)/app/sessions/scenario-actions';
import type { Scenario } from '@/lib/scenarios/types';
import type { SessionStatus, StageType } from '@/lib/sessions/types';

import { ScenarioPickerDialog } from './ScenarioPickerDialog';

const BRIEF_THRESHOLD = 40;

interface StageSummary {
  id: string;
  stage_type: StageType;
  scenarioId: string | null;
  title: string | null;
}

interface Props {
  sessionId: string;
  sessionStatus: SessionStatus;
  briefText: string;
  preSessionCheck: Record<string, unknown>;
  stages: StageSummary[];
  canManage: boolean;
  /** All caller-visible scenarios grouped by stage_type. Powers the picker. */
  scenariosByStageType: Partial<Record<StageType, Scenario[]>>;
}

type ItemStatus = 'done' | 'open' | 'disabled';

export function PreSessionChecklist({
  sessionId,
  sessionStatus,
  briefText,
  preSessionCheck,
  stages,
  canManage,
  scenariosByStageType,
}: Props) {
  const [draftBrief, setDraftBrief] = useState(briefText);
  const [colourblindOn, setColourblindOn] = useState<boolean>(
    preSessionCheck.colourblind_mode === true,
  );
  const [recordingConsent, setRecordingConsent] = useState<boolean>(
    preSessionCheck.recording_consent === true,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>('brief');
  const [pickerStageId, setPickerStageId] = useState<string | null>(null);

  // Hidden once the session is past the pre-start phase. The stage list +
  // controller below becomes the primary surface from there.
  const preSession = sessionStatus === 'draft' || sessionStatus === 'scheduled';
  if (!preSession) return null;
  if (!canManage) return null;

  const briefTrimmed = draftBrief.trim();
  const briefDone: ItemStatus = briefTrimmed.length >= BRIEF_THRESHOLD ? 'done' : 'open';
  const allPicked = stages.length > 0 && stages.every((s) => s.scenarioId !== null);
  const scenariosDone: ItemStatus = allPicked ? 'done' : 'open';
  // Accessibility overlays are an optional aid — the row carries a status dot so
  // an "on" session reads at a glance, but it deliberately does NOT gate
  // "Ready to start" (not every workshop needs pattern overlays).
  const colourblindDone: ItemStatus = colourblindOn ? 'done' : 'open';
  const recordingDone: ItemStatus = recordingConsent ? 'done' : 'open';

  const tickedCount = [briefDone, scenariosDone].filter((s) => s === 'done').length;
  const readyToStart = tickedCount === 2;

  function saveBrief() {
    setError(null);
    startTransition(async () => {
      const result = await updateSessionBriefAction(sessionId, draftBrief);
      if (!result.ok) setError('Could not save the brief.');
    });
  }

  function toggleColourblind(next: boolean) {
    setColourblindOn(next);
    setError(null);
    startTransition(async () => {
      const result = await updatePreSessionCheckAction(sessionId, 'colourblind_mode', next);
      if (!result.ok) {
        setColourblindOn(!next);
        setError('Could not save the accessibility setting.');
      }
    });
  }

  function toggleRecording(next: boolean) {
    setRecordingConsent(next);
    setError(null);
    startTransition(async () => {
      const result = await updatePreSessionCheckAction(sessionId, 'recording_consent', next);
      if (!result.ok) {
        setRecordingConsent(!next);
        setError('Could not save the recording-consent check.');
      }
    });
  }

  const pickerStage = pickerStageId ? (stages.find((s) => s.id === pickerStageId) ?? null) : null;

  return (
    <section
      data-testid="presession-fullbody"
      className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-[20px] leading-tight text-zinc-900">Before you start</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Quick prep before you run the session with your group.
          </p>
        </div>
        {readyToStart && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-800 ring-1 ring-emerald-200">
            Ready to start
          </span>
        )}
      </header>

      <ul className="mt-4 flex flex-col divide-y divide-zinc-100">
        <ChecklistRow
          testid="checklist-item-brief"
          title="Write a brief"
          status={briefDone}
          expanded={expanded === 'brief'}
          onToggle={() => setExpanded(expanded === 'brief' ? null : 'brief')}
        >
          <label className="block text-[12px] text-zinc-600">
            Set the scene for participants. Markdown allowed; rendered as plain text in Phase 1.
            <textarea
              value={draftBrief}
              onChange={(e) => setDraftBrief(e.target.value)}
              onBlur={saveBrief}
              rows={5}
              maxLength={4000}
              placeholder="What this workshop is about, what success looks like, anything to read in advance…"
              className="mt-2 block w-full rounded-xl border border-zinc-200 bg-white p-3 text-[13px] text-zinc-900 placeholder:text-zinc-500"
            />
          </label>
          <p className="mt-1 text-[11px] text-zinc-500">
            {briefTrimmed.length} / 4000 characters · ticks at {BRIEF_THRESHOLD}+.
          </p>
        </ChecklistRow>

        <ChecklistRow
          testid="checklist-item-scenarios"
          title="Pick a scenario for each stage"
          status={scenariosDone}
          expanded={expanded === 'scenarios'}
          onToggle={() => setExpanded(expanded === 'scenarios' ? null : 'scenarios')}
        >
          <ul className="flex flex-col divide-y divide-zinc-100 text-[13px]">
            {stages.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-zinc-700">{s.title ?? labelFor(s.stage_type)}</span>
                <button
                  type="button"
                  onClick={() => setPickerStageId(s.id)}
                  data-testid={`scenario-pick-${s.id}`}
                  className={`inline-flex h-8 items-center rounded-lg px-3 text-[12px] font-medium transition-colors ${
                    s.scenarioId
                      ? 'text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-900/5'
                      : 'bg-[#a8482a] text-white hover:bg-[#a85432]'
                  }`}
                >
                  {s.scenarioId ? 'Change' : 'Pick a scenario'}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-zinc-500">Ticks once every stage has a scenario.</p>
        </ChecklistRow>

        <ChecklistRow
          testid="checklist-item-recording"
          title="Confirm recording consent"
          status={recordingDone}
          expanded={expanded === 'recording'}
          onToggle={() => setExpanded(expanded === 'recording' ? null : 'recording')}
          control={
            <label className="ml-3 inline-flex cursor-pointer items-center gap-2 text-[12px] text-zinc-700">
              <input
                type="checkbox"
                checked={recordingConsent}
                onChange={(e) => toggleRecording(e.target.checked)}
                disabled={pending}
                aria-label="Confirm recording consent"
                className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-[#a8482a] focus:ring-[#a8482a]"
              />
              Consent confirmed
            </label>
          }
        >
          <p className="text-[12px] leading-relaxed text-zinc-600">
            Participants can record the spoken story of their model. Their browser&rsquo;s speech
            engine converts voice to text — BrickThink never stores or receives the audio, only the
            transcript. Confirm everyone in the room consents before they record.
          </p>
        </ChecklistRow>

        <ChecklistRow
          testid="checklist-item-a11y"
          title="Accessibility for the pieces"
          status={colourblindDone}
          expanded={expanded === 'a11y'}
          onToggle={() => setExpanded(expanded === 'a11y' ? null : 'a11y')}
          control={
            <div className="ml-3 inline-flex items-center gap-2">
              <span className="text-[12px] text-zinc-600">{colourblindOn ? 'On' : 'Off'}</span>
              <button
                type="button"
                role="switch"
                aria-checked={colourblindOn}
                aria-label="Accessibility for the pieces"
                disabled={pending}
                onClick={() => toggleColourblind(!colourblindOn)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  colourblindOn ? 'bg-[#a8482a]' : 'bg-zinc-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    colourblindOn ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          }
        >
          <p className="text-[12px] leading-relaxed text-zinc-600">
            Turn this on to show distinct patterns on top of each brick (diagonal stripes, dots,
            cross-hatch, and so on), so pieces are distinguishable by pattern as well as colour for{' '}
            <strong className="font-medium text-zinc-700">everyone in this session</strong>.
            Participants can still switch the overlays off on their own canvas, and anyone can set a
            personal default in their{' '}
            <Link
              href="/app/account#a11y"
              className="text-[#a8482a] underline-offset-2 hover:underline"
            >
              accessibility preferences
            </Link>
            .
          </p>
        </ChecklistRow>
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-[12px] text-red-700">
          {error}
        </p>
      )}

      {pickerStage && (
        <ScenarioPickerDialog
          stageId={pickerStage.id}
          stageType={pickerStage.stage_type}
          scenarios={scenariosByStageType[pickerStage.stage_type] ?? []}
          currentScenarioId={pickerStage.scenarioId}
          onClose={() => setPickerStageId(null)}
        />
      )}
    </section>
  );
}

interface RowProps {
  testid: string;
  title: string;
  status: ItemStatus;
  expanded: boolean;
  onToggle: () => void;
  control?: ReactNode;
  disabledHint?: string;
  children?: ReactNode;
}

function ChecklistRow({
  testid,
  title,
  status,
  expanded,
  onToggle,
  control,
  disabledHint,
  children,
}: RowProps) {
  return (
    <li data-testid={testid} data-status={status} className="py-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`text-[14px] ${
            status === 'done'
              ? 'text-emerald-600'
              : status === 'disabled'
                ? 'text-zinc-300'
                : 'text-zinc-400'
          }`}
        >
          {status === 'done' ? '●' : '○'}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center justify-between gap-3 text-left text-[14px] font-medium text-zinc-900 disabled:text-zinc-400"
          disabled={status === 'disabled'}
          aria-expanded={expanded}
        >
          <span>{title}</span>
          {status === 'disabled' && disabledHint && (
            <span className="text-[11px] font-normal text-zinc-500">{disabledHint}</span>
          )}
        </button>
        {control}
      </div>
      {expanded && children && <div className="mt-3 pl-7">{children}</div>}
    </li>
  );
}

function labelFor(stageType: StageType): string {
  switch (stageType) {
    case 'skill_building':
      return 'Skill-building';
    case 'individual_model':
      return 'Individual model';
    case 'shared_model':
      return 'Shared model';
    case 'system_model':
      return 'System model';
    case 'guiding_principles':
      return 'Guiding principles';
  }
}
