import type { StageStatus } from './stage-state-machine';

export type StageRuntime = {
  status: StageStatus;
  duration_seconds: number | null;
  started_at: string | null;
  paused_at: string | null;
  total_paused_ms: number;
  extended_seconds: number;
};

export function computeRemainingMs(stage: StageRuntime, nowMs: number): number | null {
  if (stage.duration_seconds === null) return null;
  const totalMs = (stage.duration_seconds + stage.extended_seconds) * 1000;
  if (stage.started_at === null) return totalMs;
  const startedAtMs = Date.parse(stage.started_at);
  const referenceMs =
    stage.status === 'paused' && stage.paused_at !== null
      ? Date.parse(stage.paused_at)
      : nowMs;
  const elapsedMs = referenceMs - startedAtMs - stage.total_paused_ms;
  return Math.max(0, totalMs - elapsedMs);
}
