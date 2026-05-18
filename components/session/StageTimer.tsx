'use client';

import { useEffect, useState } from 'react';

import { computeRemainingMs } from '@/lib/sessions/computeRemainingMs';

import type { StageRow } from './useSessionStages';

type Props = {
  stage: StageRow | null;
};

export function StageTimer({ stage }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!stage || stage.status !== 'active') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [stage]);

  if (!stage) return null;

  const remaining = computeRemainingMs(stage, now);
  const showDigits = remaining !== null;
  const urgent = remaining !== null && remaining < 30_000;
  const status = stage.status;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs ${
        urgent ? 'border-red-500 bg-red-50 text-red-900' : 'border-zinc-200 bg-white text-zinc-700'
      }`}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">
        {status === 'paused' ? '⏸' : status === 'active' ? '⏱' : '●'}
      </span>
      {showDigits ? <span className="tabular-nums">{formatRemaining(remaining)}</span> : null}
      <span className="text-[10px] uppercase tracking-[0.12em]">
        {status === 'active' ? 'live' : status}
      </span>
    </div>
  );
}

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
