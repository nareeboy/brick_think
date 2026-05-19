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
  const urgent =
    stage.status === 'active' && remaining !== null && remaining > 0 && remaining < 30_000;
  const variant: Variant = urgent
    ? 'critical'
    : stage.status === 'active'
      ? 'active'
      : stage.status === 'paused'
        ? 'paused'
        : stage.status === 'completed'
          ? 'completed'
          : 'pending';

  const labelText = stage.status === 'active' ? 'live' : stage.status;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col gap-1 rounded-xl border bg-white px-3 py-2 ${WRAPPER_RING[variant]}`}
    >
      <span
        className={`inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ring-1 ${PILL_CLASSES[variant]}`}
      >
        <span
          aria-hidden="true"
          className={`inline-block size-1.5 rounded-full ${DOT_COLOURS[variant]}`}
        />
        {labelText}
      </span>
      {showDigits ? (
        <span className={`font-mono tabular-nums text-2xl leading-none ${TIMER_CLASSES[variant]}`}>
          {formatRemaining(remaining)}
        </span>
      ) : null}
    </div>
  );
}

type Variant = 'pending' | 'active' | 'paused' | 'completed' | 'critical';

const WRAPPER_RING: Record<Variant, string> = {
  pending: 'border-zinc-900/10',
  active: 'border-emerald-300/70 ring-1 ring-emerald-200/60',
  paused: 'border-amber-300/70',
  completed: 'border-zinc-900/10',
  critical: 'border-red-300 ring-1 ring-red-200',
};

const PILL_CLASSES: Record<Variant, string> = {
  pending: 'bg-yellow-50 text-yellow-700 ring-yellow-200/70',
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  paused: 'bg-amber-100 text-amber-900 ring-amber-300',
  completed: 'bg-sky-50 text-sky-800 ring-sky-200',
  critical: 'bg-red-50 text-red-800 ring-red-200',
};

const DOT_COLOURS: Record<Variant, string> = {
  pending: 'bg-yellow-500',
  active: 'bg-emerald-500',
  paused: 'bg-amber-600',
  completed: 'bg-sky-600',
  critical: 'bg-red-500',
};

const TIMER_CLASSES: Record<Variant, string> = {
  pending: 'text-zinc-500',
  active: 'text-zinc-900',
  paused: 'text-amber-700',
  completed: 'text-zinc-500',
  critical: 'text-red-700',
};

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
