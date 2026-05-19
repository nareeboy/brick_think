import type { StageStatus } from './stage-state-machine';

export type StageRuntime = {
  status: StageStatus;
  duration_seconds: number | null;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  total_paused_ms: number;
  extended_seconds: number;
};

export function computeRemainingMs(stage: StageRuntime, nowMs: number): number | null {
  if (stage.duration_seconds === null) return null;
  const totalMs = (stage.duration_seconds + stage.extended_seconds) * 1000;
  if (stage.started_at === null) return totalMs;
  const startedAtMs = Date.parse(stage.started_at);

  // Reference time: whatever moment we should compute "elapsed since started_at"
  // against. For paused stages the clock freezes at paused_at; for completed
  // stages it freezes at ended_at (which is set by advance / rollback / endSession).
  // For active stages we use the live wall-clock so the countdown ticks.
  let referenceMs: number;
  if (stage.status === 'paused' && stage.paused_at !== null) {
    referenceMs = Date.parse(stage.paused_at);
  } else if (stage.status === 'completed' && stage.ended_at !== null) {
    referenceMs = Date.parse(stage.ended_at);
  } else {
    referenceMs = nowMs;
  }

  const elapsedMs = referenceMs - startedAtMs - stage.total_paused_ms;
  return Math.max(0, Math.min(totalMs, totalMs - elapsedMs));
}
