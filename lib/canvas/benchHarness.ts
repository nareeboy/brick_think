export interface BenchResult {
  library: string;
  brickCount: number;
  durationMs: number;
  frames: number;
  fps: number;
  frameP50ms: number;
  frameP95ms: number;
  frameMaxMs: number;
  setupMs: number;
}

declare global {
  interface Window {
    __benchResult?: BenchResult;
  }
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sortedAsc[lo] ?? 0;
  const w = rank - lo;
  return (sortedAsc[lo] ?? 0) * (1 - w) + (sortedAsc[hi] ?? 0) * w;
}

export function runBench(options: {
  library: string;
  brickCount: number;
  durationMs: number;
  setupMs: number;
  step: () => void;
  onComplete: (result: BenchResult) => void;
}): () => void {
  const { library, brickCount, durationMs, setupMs, step, onComplete } = options;
  const frameTimes: number[] = [];
  let cancelled = false;
  let lastTs: number | null = null;
  const startTs = performance.now();

  function tick(now: number): void {
    if (cancelled) return;
    if (lastTs !== null) {
      frameTimes.push(now - lastTs);
    }
    lastTs = now;
    step();
    if (now - startTs >= durationMs) {
      const sorted = [...frameTimes].sort((a, b) => a - b);
      const total = frameTimes.reduce((sum, dt) => sum + dt, 0);
      const fps = total > 0 ? (frameTimes.length * 1000) / total : 0;
      const result: BenchResult = {
        library,
        brickCount,
        durationMs: total,
        frames: frameTimes.length,
        fps,
        frameP50ms: percentile(sorted, 50),
        frameP95ms: percentile(sorted, 95),
        frameMaxMs: sorted.at(-1) ?? 0,
        setupMs,
      };
      window.__benchResult = result;
      onComplete(result);
      return;
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  return () => {
    cancelled = true;
  };
}
