'use client';

import { useState } from 'react';

import { computeRemainingMs } from '@/lib/sessions/computeRemainingMs';
import { stageLabel } from '@/lib/sessions/stage-labels';
import type { StageType } from '@/lib/sessions/types';

import type { SessionRow, StageRow } from './useSessionStages';

export type StageActionsBundle = {
  start: (id: string) => Promise<{ ok: boolean; code?: string }>;
  pause: (id: string) => Promise<{ ok: boolean; code?: string }>;
  resume: (id: string) => Promise<{ ok: boolean; code?: string }>;
  extend: (id: string, seconds: number) => Promise<{ ok: boolean; code?: string }>;
  advance: (id: string) => Promise<{ ok: boolean; code?: string }>;
  rollback: (id: string) => Promise<{ ok: boolean; code?: string }>;
};

type Props = {
  stages: StageRow[];
  session: SessionRow | null;
  canManage: boolean;
  actions: StageActionsBundle;
};

export function StageController({ stages, session, canManage, actions }: Props) {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  const completed = sorted.filter((s) => s.status === 'completed');
  const lastCompletedId = completed.length > 0 ? (completed[completed.length - 1]?.id ?? null) : null;

  return (
    <ol className="flex flex-col gap-3">
      {sorted.map((stage, index) => (
        <StageRowCard
          key={stage.id}
          stage={stage}
          isLastCompleted={stage.id === lastCompletedId}
          isCurrent={session?.current_stage_id === stage.id}
          isLastStage={index === sorted.length - 1}
          canManage={canManage}
          actions={actions}
        />
      ))}
    </ol>
  );
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
    case 'not_facilitator':
      return 'Only the session facilitator can do that.';
    case 'stage_not_found':
      return 'Stage not found. Refresh the page.';
    default:
      return 'Something went wrong. Refresh to recover.';
  }
}

function StageRowCard({
  stage,
  isLastCompleted,
  isCurrent: _isCurrent,
  isLastStage,
  canManage,
  actions,
}: {
  stage: StageRow;
  isLastCompleted: boolean;
  isCurrent: boolean;
  isLastStage: boolean;
  canManage: boolean;
  actions: StageActionsBundle;
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
      console.error('stage controller action failed', err);
    } finally {
      setPending(false);
    }
  };

  const label = stage.title ?? stageLabel(stage.stage_type as StageType);
  const remaining = computeRemainingMs(stage, Date.now());

  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Stage {stage.position + 1} · {stage.status}
          </p>
          <h3 className="text-base font-medium">{label}</h3>
        </div>
        {remaining !== null ? (
          <span className="font-mono text-sm tabular-nums text-zinc-600">{formatRemaining(remaining)}</span>
        ) : null}
      </div>
      {canManage ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {stage.status === 'pending' && (
            <button type="button" onClick={wrap(() => actions.start(stage.id))} disabled={pending} className={btn('primary')}>
              Start
            </button>
          )}
          {stage.status === 'active' && (
            <>
              <button type="button" onClick={wrap(() => actions.pause(stage.id))} disabled={pending} className={btn('secondary')}>
                Pause
              </button>
              {stage.duration_seconds !== null && (
                <button type="button" onClick={wrap(() => actions.extend(stage.id, 300))} disabled={pending} className={btn('secondary')}>
                  Extend +5m
                </button>
              )}
              {!isLastStage && (
                <button type="button" onClick={wrap(() => actions.advance(stage.id))} disabled={pending} className={btn('primary')}>
                  Advance
                </button>
              )}
            </>
          )}
          {stage.status === 'paused' && (
            <>
              <button type="button" onClick={wrap(() => actions.resume(stage.id))} disabled={pending} className={btn('primary')}>
                Resume
              </button>
              {stage.duration_seconds !== null && (
                <button type="button" onClick={wrap(() => actions.extend(stage.id, 300))} disabled={pending} className={btn('secondary')}>
                  Extend +5m
                </button>
              )}
              {!isLastStage && (
                <button type="button" onClick={wrap(() => actions.advance(stage.id))} disabled={pending} className={btn('secondary')}>
                  Advance
                </button>
              )}
            </>
          )}
          {stage.status === 'completed' && isLastCompleted && (
            <button type="button" onClick={wrap(() => actions.rollback(stage.id))} disabled={pending} className={btn('secondary')}>
              Rollback to here
            </button>
          )}
        </div>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="mt-2 text-[12px] text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </li>
  );
}

function btn(variant: 'primary' | 'secondary'): string {
  const base = 'inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-50';
  return variant === 'primary'
    ? `${base} bg-zinc-900 text-white hover:bg-zinc-800`
    : `${base} border border-zinc-200 bg-white hover:bg-zinc-50`;
}

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
