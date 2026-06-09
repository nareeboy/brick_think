'use client';

import { useEffect, useState } from 'react';

import { EndSessionButton } from '@/app/(authed)/app/sessions/[id]/SessionStages';
import {
  useSessionStages,
  type SessionRow,
  type StageRow,
} from '@/components/session/useSessionStages';
import { computeRemainingMs } from '@/lib/sessions/computeRemainingMs';
import { stageLabel } from '@/lib/sessions/stage-labels';
import type { StageType } from '@/lib/sessions/types';

interface Props {
  sessionId: string;
  sessionTitle: string;
  initialStages: StageRow[];
  initialSession: SessionRow;
  canManageSession: boolean;
}

// 1Hz wall-clock tick — mirrors the helper in SessionStages so the countdown
// ticks without waiting on a Realtime payload (which only lands on facilitator
// action). Kept local so the bar is self-contained.
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

// The live "now playing" stage bar that sits at the top of the facilitator's
// sticky sidebar, above Private notes. Carries its own Realtime subscription on
// a distinct channel key (the stage list owns the default `session:${id}`
// topic) so it stays live without colliding on the Phoenix socket.
export function ActiveStageBar({
  sessionId,
  sessionTitle,
  initialStages,
  initialSession,
  canManageSession,
}: Props) {
  const {
    stages: liveStages,
    session: liveSession,
    ready,
  } = useSessionStages(sessionId, 'active-bar');
  const stages = ready ? liveStages : initialStages;
  const session = ready && liveSession ? liveSession : initialSession;
  const nowMs = useNowMs();

  const activeStage = stages.find((s) => s.status === 'active') ?? null;
  const activeRemaining = activeStage ? computeRemainingMs(activeStage, nowMs) : null;
  const activeLabel = activeStage
    ? (activeStage.title ?? stageLabel(activeStage.stage_type as StageType))
    : null;

  return (
    <div className="shrink-0 rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        {activeStage ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="truncate text-[13px] text-zinc-700">
              Now · Stage {activeStage.position + 1} · {activeLabel}
            </span>
          </div>
        ) : session.status === 'completed' ? (
          <p className="text-[13px] text-zinc-500">Session complete</p>
        ) : (
          <p className="text-[13px] text-zinc-500">Awaiting start</p>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {activeRemaining !== null ? (
            <span
              suppressHydrationWarning
              className="font-mono text-[14px] font-medium tabular-nums text-zinc-900"
            >
              {formatRemaining(activeRemaining)}
            </span>
          ) : null}
          {canManageSession && session.status !== 'completed' ? (
            <EndSessionButton
              sessionId={sessionId}
              sessionTitle={sessionTitle}
              stageName={activeLabel}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
