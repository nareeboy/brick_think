'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { computeRemainingMs } from '@/lib/sessions/computeRemainingMs';
import { stageLabel } from '@/lib/sessions/stage-labels';
import type { StageType } from '@/lib/sessions/types';
import { StageExpiryBanner } from '@/components/session/StageExpiryBanner';
import {
  useSessionStages,
  type SessionRow,
  type StageRow as LiveStageRow,
} from '@/components/session/useSessionStages';
import { useSessionModelsRealtime } from '@/components/session/useSessionModelsRealtime';

import {
  advanceStageAction,
  endSessionAction,
  extendStageAction,
  pauseStageAction,
  resetStageAction,
  resumeStageAction,
  rollbackStageAction,
  startStageAction,
  updateStageDurationAction,
} from '../stage-controller-actions';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';

import { DeleteSessionModelButton } from './DeleteSessionModelButton';
import { StageMetaEditor } from './StageMetaEditor';
import { StartModelButton } from './StartModelButton';

export interface ParticipantModel {
  id: string;
  title: string;
  ownerLabel: string;
}

interface OwnedModelRow {
  id: string;
  title: string;
  updated_at: string;
  stage_id: string;
}

interface SessionStagesProps {
  sessionId: string;
  sessionTitle: string;
  initialStages: LiveStageRow[];
  initialSession: SessionRow;
  ownedModels: OwnedModelRow[];
  participantsByStage: Record<string, ParticipantModel[]>;
  canManageSession: boolean;
}

const STAGE_ACTIONS = {
  start: startStageAction,
  pause: pauseStageAction,
  resume: resumeStageAction,
  extend: extendStageAction,
  advance: advanceStageAction,
  rollback: rollbackStageAction,
  reset: resetStageAction,
  updateDuration: updateStageDurationAction,
  endSession: endSessionAction,
} as const;

// 1Hz wall-clock tick. Live stages mutate their `computeRemainingMs` reading
// once per second so the active timer counts down without waiting on a
// Realtime payload (which only arrives on facilitator action).
function useNowMs(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function messageForCode(code: string): string {
  switch (code) {
    case 'invalid_transition':
      return 'Stage state changed. Refresh to see the latest.';
    case 'no_next_stage':
      return 'No next stage to advance to.';
    case 'no_previous_completed_stage':
      return 'No prior stage to roll back to.';
    case 'invalid_extend_amount':
      return 'Cannot extend this stage.';
    case 'invalid_duration_amount':
      return 'Duration must be between 1 and 120 minutes.';
    case 'not_facilitator':
      return 'Only the session facilitator can do that.';
    case 'stage_not_found':
      return 'Stage not found. Refresh the page.';
    case 'session_not_found':
      return 'Session not found. Refresh the page.';
    default:
      return 'Something went wrong. Refresh to recover.';
  }
}

export function SessionStages({
  sessionId,
  sessionTitle,
  initialStages,
  initialSession,
  ownedModels,
  participantsByStage,
  canManageSession,
}: SessionStagesProps) {
  const { stages: liveStages, session: liveSession, ready } = useSessionStages(sessionId);
  const stages = ready ? liveStages : initialStages;
  const session = ready && liveSession ? liveSession : initialSession;
  const nowMs = useNowMs();
  const { lastUpdatedAt } = useSessionModelsRealtime(sessionId);

  const sorted = [...stages].sort((a, b) => a.position - b.position);
  const completed = sorted.filter((s) => s.status === 'completed');
  const modelByStageId = new Map(ownedModels.map((m) => [m.stage_id, m]));

  const activeStage = sorted.find((s) => s.status === 'active') ?? null;
  const activeRemaining = activeStage ? computeRemainingMs(activeStage, nowMs) : null;
  const activeLabel = activeStage
    ? (activeStage.title ?? stageLabel(activeStage.stage_type as StageType))
    : null;

  return (
    <div className="flex flex-col gap-4" data-testid="session-stage-list">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-1">
        <div className="flex items-baseline gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Workshop flow
          </p>
          <p className="text-[12px] text-zinc-600">
            {sorted.length} stages · {completed.length} done
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeStage ? (
            <div className="flex items-center gap-2">
              <StatusDot status="active" />
              <span className="text-[12px] text-zinc-700">
                Now · Stage {activeStage.position + 1} · {activeLabel}
              </span>
              {activeRemaining !== null ? (
                <span className="font-mono tabular-nums text-[12px] font-medium text-zinc-900">
                  {formatRemaining(activeRemaining)}
                </span>
              ) : null}
            </div>
          ) : session.status === 'completed' ? (
            <p className="text-[12px] text-zinc-500">Session complete</p>
          ) : (
            <p className="text-[12px] text-zinc-500">Awaiting start</p>
          )}
          {canManageSession && session.status !== 'completed' ? (
            <EndSessionButton sessionId={sessionId} sessionTitle={sessionTitle} />
          ) : null}
        </div>
      </header>

      <ol className="flex flex-col gap-4">
        {sorted.map((stage, index) => (
          <StageRow
            key={stage.id}
            stage={stage}
            isFirst={index === 0}
            isLastStage={index === sorted.length - 1}
            nowMs={nowMs}
            ownedModel={modelByStageId.get(stage.id) ?? null}
            participants={participantsByStage[stage.id] ?? []}
            canManageSession={canManageSession}
            sessionId={sessionId}
            sessionTitle={sessionTitle}
            sessionStatus={session.status}
            lastUpdatedAt={lastUpdatedAt}
          />
        ))}
      </ol>
    </div>
  );
}

function StageRow({
  stage,
  isFirst,
  isLastStage,
  nowMs,
  ownedModel,
  participants,
  canManageSession,
  sessionId,
  sessionTitle,
  sessionStatus,
  lastUpdatedAt,
}: {
  stage: LiveStageRow;
  isFirst: boolean;
  isLastStage: boolean;
  nowMs: number;
  ownedModel: OwnedModelRow | null;
  participants: ParticipantModel[];
  canManageSession: boolean;
  sessionId: string;
  sessionTitle: string;
  sessionStatus: string;
  lastUpdatedAt: Map<string, number>;
}) {
  const stageType = stage.stage_type as StageType;
  const remaining = computeRemainingMs(stage, nowMs);
  const status = stage.status;
  const isCritical =
    status === 'active' && remaining !== null && remaining > 0 && remaining < 30_000;
  const timerVariant: TimerVariant = isCritical
    ? 'critical'
    : status === 'active'
      ? 'active'
      : status === 'paused'
        ? 'paused'
        : 'idle';

  return (
    <li
      data-testid={`stage-card-${stageType}`}
      data-scroll-target=""
      className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 ${
        status === 'active'
          ? 'border-emerald-300/70 ring-1 ring-emerald-200/60'
          : 'border-zinc-900/10'
      }`}
      {...(isFirst ? { 'data-tour-id': 'first-stage-card' } : {})}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Stage {stage.position + 1}
            </span>
            <StatusPill status={status} />
          </div>
          <div className="mt-1.5">
            <StageMetaEditor
              stageId={stage.id}
              stageType={stageType}
              title={stage.title}
              description={stage.description}
              canEdit={canManageSession}
              isTourTarget={isFirst}
            />
          </div>
          {ownedModel ? (
            <p className="mt-2 truncate text-[12px] text-zinc-600">
              <span className="font-mono uppercase tracking-[0.18em] text-[9px] text-zinc-500">
                Your model ·{' '}
              </span>
              {ownedModel.title}
            </p>
          ) : (
            <p className="mt-2 text-[12px] text-zinc-500">No model yet</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          {status === 'pending' && canManageSession ? (
            <StageDurationEditor stage={stage} />
          ) : remaining !== null ? (
            <Timer remainingMs={remaining} variant={timerVariant} />
          ) : null}
          <ModelAction
            ownedModel={ownedModel}
            sessionId={sessionId}
            stageId={stage.id}
            stageType={stageType}
          />
        </div>
      </div>

      {canManageSession && status === 'active' && remaining !== null && remaining <= 0 ? (
        <StageExpiryBanner
          stageId={stage.id}
          isLastStage={isLastStage}
          actions={STAGE_ACTIONS}
          messageForCode={messageForCode}
        />
      ) : null}

      {canManageSession ? (
        <StageTimerControls
          stage={stage}
          isLastStage={isLastStage}
          remainingMs={remaining}
          sessionId={sessionId}
          sessionTitle={sessionTitle}
          sessionStatus={sessionStatus}
        />
      ) : null}

      {canManageSession ? (
        <ParticipantsPanel
          stageType={stageType}
          participants={participants}
          lastUpdatedAt={lastUpdatedAt}
          nowMs={nowMs}
        />
      ) : null}
    </li>
  );
}

function ParticipantsPanel({
  stageType,
  participants,
  lastUpdatedAt,
  nowMs,
}: {
  stageType: StageType;
  participants: ParticipantModel[];
  lastUpdatedAt: Map<string, number>;
  nowMs: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div
      className="border-t border-zinc-900/5 pt-3"
      data-testid={`stage-participants-${stageType}`}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Participants ({participants.length})
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={pending}
          aria-label="Refresh participants"
          title="Refresh to see your participants"
          data-testid={`refresh-participants-${stageType}`}
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshIcon className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {participants.length === 0 ? (
        <p className="text-[12px] text-zinc-500">No participants yet</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {participants.map((p) => {
            const t = lastUpdatedAt.get(p.id);
            const isLive = t != null && nowMs - t < 10_000;
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3"
                data-testid={`participant-row-${p.id}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    role="img"
                    aria-label={isLive ? 'Live' : 'Idle'}
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      isLive ? 'bg-emerald-500' : 'bg-zinc-300'
                    }`}
                    data-testid={isLive ? `participant-live-${p.id}` : undefined}
                  />
                  <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">
                    {p.ownerLabel}
                  </p>
                </div>
                <Link
                  href={`/app/designs/${p.id}`}
                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5"
                >
                  Open
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RefreshIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15.5-6.36L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.36L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function ModelAction({
  ownedModel,
  sessionId,
  stageId,
  stageType,
}: {
  ownedModel: OwnedModelRow | null;
  sessionId: string;
  stageId: string;
  stageType: StageType;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {ownedModel ? (
        <>
          <DeleteSessionModelButton modelId={ownedModel.id} modelTitle={ownedModel.title} />
          <Link
            href={`/app/designs/${ownedModel.id}`}
            data-testid={`open-model-${stageType}`}
            className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[13px] font-semibold text-white transition-colors transition-transform duration-150 ease-out hover:bg-[#cf6e47] active:scale-[0.98]"
          >
            Open model
          </Link>
        </>
      ) : (
        <StartModelButton sessionId={sessionId} stageId={stageId} stageType={stageType} />
      )}
    </div>
  );
}

function StageTimerControls({
  stage,
  isLastStage,
  remainingMs,
  sessionId,
  sessionTitle,
  sessionStatus,
}: {
  stage: LiveStageRow;
  isLastStage: boolean;
  /** Live remaining ms for this stage, or `null` if no duration. Used to
   *  suppress the cluster's Advance button when the expiry banner is showing
   *  the same action more prominently. */
  remainingMs: number | null;
  sessionId: string;
  sessionTitle: string;
  sessionStatus: string;
}) {
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wrap = (fn: () => Promise<{ ok: boolean; code?: string }>) => async () => {
    setPending(true);
    setErrorMessage(null);
    try {
      const result = await fn();
      if (!result.ok) {
        const code = (result as { code?: string }).code ?? 'unknown';
        setErrorMessage(messageForCode(code));
      }
    } catch (err) {
      setErrorMessage('Unexpected error. Refresh to recover.');
      console.error('stage controls action failed', err);
    } finally {
      setPending(false);
    }
  };

  const status = stage.status;
  // Stopped session: keep the cluster on completed stages so Start can revive
  // the workshop. Naturally-completed stages during a live session stay clean
  // (rollback owns that path when its UI returns).
  const showRevive = status === 'completed' && sessionStatus === 'completed';
  const hasActions =
    status === 'pending' || status === 'active' || status === 'paused' || showRevive;
  if (!hasActions) return null;

  return (
    <div className="rounded-xl border border-dashed border-zinc-900/15 bg-zinc-50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Stage timer
        </p>
        {(status === 'pending' || showRevive) && (
          <button
            type="button"
            onClick={wrap(() => STAGE_ACTIONS.start(stage.id))}
            disabled={pending}
            className={btn('primary')}
          >
            Start
          </button>
        )}
        {(status === 'active' || status === 'paused') && (
          <>
            {status === 'active' ? (
              <button
                type="button"
                onClick={wrap(() => STAGE_ACTIONS.pause(stage.id))}
                disabled={pending}
                className={btn('secondary')}
              >
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={wrap(() => STAGE_ACTIONS.resume(stage.id))}
                disabled={pending}
                className={btn('primary')}
              >
                Resume
              </button>
            )}
            {stage.duration_seconds !== null && (
              <button
                type="button"
                onClick={wrap(() => STAGE_ACTIONS.extend(stage.id, 300))}
                disabled={pending}
                className={btn('secondary')}
              >
                Extend +5m
              </button>
            )}
            <button
              type="button"
              onClick={wrap(() => STAGE_ACTIONS.reset(stage.id))}
              disabled={pending}
              className={btn('warning')}
              title="Restart this stage's timer with a fresh clock. Clears extend and pause history."
            >
              Reset
            </button>
            {/* Advance is the natural end-of-stage action. Live in the cluster so a
             *  facilitator can cut a stage short. Hidden when the expiry banner
             *  above is already promoting the same action, and on the last stage
             *  (no next stage to advance into). */}
            {!isLastStage &&
            !(status === 'active' && remainingMs !== null && remainingMs <= 0) ? (
              <button
                type="button"
                onClick={wrap(() => STAGE_ACTIONS.advance(stage.id))}
                disabled={pending}
                data-testid="advance-stage-button"
                className={btn('secondary')}
                title="End this stage and move the session to the next stage."
              >
                Advance
              </button>
            ) : null}
            {sessionStatus !== 'completed' ? (
              <EndSessionButton sessionId={sessionId} sessionTitle={sessionTitle} variant="text" />
            ) : null}
          </>
        )}
      </div>
      {errorMessage ? (
        <p role="alert" className="mt-2 text-[12px] text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function StageDurationEditor({ stage }: { stage: LiveStageRow }) {
  const initialMinutes =
    stage.duration_seconds !== null ? Math.round(stage.duration_seconds / 60) : 15;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(initialMinutes));
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // If a Realtime payload brings in a different duration while we're not
  // editing, mirror it. While editing, keep the user's draft alone.
  useEffect(() => {
    if (!editing) setDraft(String(initialMinutes));
  }, [initialMinutes, editing]);

  function cancel() {
    setDraft(String(initialMinutes));
    setErrorMessage(null);
    setEditing(false);
  }

  async function commit() {
    const minutes = Number.parseInt(draft, 10);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 120) {
      setErrorMessage('1 to 120 minutes.');
      return;
    }
    const seconds = minutes * 60;
    if (seconds === stage.duration_seconds) {
      setEditing(false);
      setErrorMessage(null);
      return;
    }
    setPending(true);
    setErrorMessage(null);
    try {
      const result = await STAGE_ACTIONS.updateDuration(stage.id, seconds);
      if (!result.ok) {
        setErrorMessage(messageForCode((result as { code?: string }).code ?? 'unknown'));
        return;
      }
      setEditing(false);
    } catch (err) {
      setErrorMessage('Unexpected error. Refresh to recover.');
      console.error('update duration failed', err);
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }

  if (!editing) {
    const label = stage.duration_seconds !== null ? `${initialMinutes} min` : 'Set duration';
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        data-testid="stage-duration-edit"
        className="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-transparent px-1.5 py-0.5 font-mono text-2xl leading-none tabular-nums text-zinc-900 transition-colors hover:border-zinc-900/15 hover:bg-zinc-900/5"
        title="Edit stage duration"
      >
        <span>{label}</span>
        <PencilIcon className="size-3.5 text-zinc-400 transition-colors group-hover:text-zinc-700" />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-900/15 bg-white px-2 py-1.5">
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={pending}
          data-testid="stage-duration-input"
          className="w-14 bg-transparent text-right font-mono text-base tabular-nums text-zinc-900 outline-none disabled:opacity-50"
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">min</span>
        <button
          type="button"
          onClick={() => void commit()}
          disabled={pending}
          aria-label="Save duration"
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-default disabled:opacity-50"
        >
          <CheckIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          aria-label="Cancel"
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-900/5 disabled:cursor-default disabled:opacity-50"
        >
          <XIcon className="size-4" />
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-[11px] text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M11.5 2.5l2 2L5 13l-3 1 1-3 8.5-8.5z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3.5 8.5l3 3 6-6.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <rect x="4" y="4" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function EndSessionButton({
  sessionId,
  sessionTitle,
  variant = 'icon',
}: {
  sessionId: string;
  sessionTitle: string;
  /** `icon` is the small square button for the page header. `text` is a labeled
   *  destructive button that sits inline next to other timer controls. */
  variant?: 'icon' | 'text';
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onConfirm() {
    setPending(true);
    setErrorMessage(null);
    try {
      const result = await STAGE_ACTIONS.endSession(sessionId);
      if (!result.ok) {
        setErrorMessage(messageForCode((result as { code?: string }).code ?? 'unknown'));
        return;
      }
      setConfirming(false);
    } catch (err) {
      setErrorMessage('Unexpected error. Refresh to recover.');
      console.error('endSession failed', err);
    } finally {
      setPending(false);
    }
  }

  const onTriggerClick = () => {
    setErrorMessage(null);
    setConfirming(true);
  };

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={onTriggerClick}
          disabled={pending}
          aria-label="End session"
          title="End session"
          data-testid="end-session-button"
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-red-200 text-red-700 transition-colors transition-transform duration-150 ease-out hover:bg-red-50 active:scale-[0.96] disabled:cursor-default disabled:opacity-50"
        >
          <StopIcon className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onTriggerClick}
          disabled={pending}
          data-testid="end-session-inline-button"
          title="End the entire session — same as the Stop button in the page header."
          className={btn('destructive')}
        >
          <StopIcon className="mr-1.5 h-3 w-3" />
          Stop session
        </button>
      )}
      {confirming ? (
        <DeleteConfirmDialog
          title={`End "${sessionTitle}"?`}
          description={
            <div className="flex flex-col gap-2">
              <p>
                The current stage timer stops immediately and the session moves to{' '}
                <span className="font-mono text-[12px] uppercase tracking-[0.12em]">completed</span>
                . Participants keep access to their models in read-only mode.
              </p>
              <p className="text-zinc-500">
                The stage history (events, durations, narrations) stays intact for the post-session
                report. You can&apos;t un-end a session from the UI yet.
              </p>
              {errorMessage ? (
                <p role="alert" className="text-[12px] text-red-700">
                  {errorMessage}
                </p>
              ) : null}
            </div>
          }
          confirmLabel="End session"
          confirmPendingLabel="Ending…"
          pending={pending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void onConfirm()}
        />
      ) : null}
    </>
  );
}

type TimerVariant = 'critical' | 'active' | 'paused' | 'idle';

function Timer({ remainingMs, variant }: { remainingMs: number; variant: TimerVariant }) {
  const cls = {
    critical: 'text-red-700',
    active: 'text-zinc-900',
    paused: 'text-amber-700',
    idle: 'text-zinc-500',
  }[variant];
  return (
    <span
      aria-live={variant === 'active' ? 'polite' : 'off'}
      className={`font-mono tabular-nums text-2xl leading-none ${cls}`}
    >
      {formatRemaining(remainingMs)}
    </span>
  );
}

const STATUS_PILL_CLASSES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 ring-yellow-200/70',
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  paused: 'bg-amber-100 text-amber-900 ring-amber-300',
  completed: 'bg-sky-50 text-sky-800 ring-sky-200',
};

function StatusPill({ status }: { status: string }) {
  const cls = STATUS_PILL_CLASSES[status] ?? STATUS_PILL_CLASSES.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ring-1 ${cls}`}
    >
      <StatusDot status={status} />
      {status}
    </span>
  );
}

const STATUS_DOT_COLOURS: Record<string, string> = {
  pending: 'bg-yellow-500',
  active: 'bg-emerald-500',
  paused: 'bg-amber-600',
  completed: 'bg-sky-600',
};

function StatusDot({ status }: { status: string }) {
  const colour = STATUS_DOT_COLOURS[status] ?? STATUS_DOT_COLOURS.pending;
  return <span aria-hidden="true" className={`inline-block size-1.5 rounded-full ${colour}`} />;
}

function btn(variant: 'primary' | 'secondary' | 'warning' | 'destructive'): string {
  const base =
    'inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-[13px] font-medium transition-colors transition-transform duration-150 ease-out active:scale-[0.98] disabled:cursor-default disabled:opacity-50';
  if (variant === 'primary') return `${base} bg-zinc-900 text-white hover:bg-zinc-800`;
  if (variant === 'warning')
    return `${base} border border-amber-300 bg-amber-50/50 text-amber-900 hover:bg-amber-50`;
  if (variant === 'destructive')
    return `${base} border border-red-200 bg-white text-red-700 hover:bg-red-50`;
  return `${base} border border-zinc-900/15 bg-white text-zinc-800 hover:bg-zinc-900/5`;
}
