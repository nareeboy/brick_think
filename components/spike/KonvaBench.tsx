'use client';

import Konva from 'konva';
import { useEffect, useRef, useState } from 'react';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import { BRICK_BASE_UNIT } from '@/lib/bricks/types';
import type { BenchResult } from '@/lib/canvas/benchHarness';
import { runBench } from '@/lib/canvas/benchHarness';
import { loadBrickImage } from '@/lib/canvas/brickImage';

const PARTICIPANTS = 25;
const BRICKS_PER_PARTICIPANT = 100;
const BRICK_COUNT = PARTICIPANTS * BRICKS_PER_PARTICIPANT;
const STAGE_WIDTH = 1200;
const STAGE_HEIGHT = 720;
const SCALE = 2;
const DURATION_MS = 5000;

interface BrickAgent {
  node: Konva.Image;
  vx: number;
  vy: number;
}

export function KonvaBench() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'running' | 'done' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BenchResult | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const setupStart = performance.now();
        const stage = new Konva.Stage({
          container: containerRef.current!,
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
        });
        const layer = new Konva.Layer({ listening: false });
        stage.add(layer);

        const codes = CANONICAL_BRICKS.slice(0, 16).map((b) => b.code);
        const images = await Promise.all(codes.map((code) => loadBrickImage(code)));
        const bricks: BrickAgent[] = [];
        for (let i = 0; i < BRICK_COUNT; i += 1) {
          const idx = i % codes.length;
          const def = CANONICAL_BRICKS[idx]!;
          const image = images[idx]!;
          const node = new Konva.Image({
            image,
            x: Math.random() * STAGE_WIDTH,
            y: Math.random() * STAGE_HEIGHT,
            width: def.studsX * BRICK_BASE_UNIT * SCALE,
            height: def.studsY * BRICK_BASE_UNIT * SCALE,
            rotation: Math.random() * 360,
            listening: false,
            perfectDrawEnabled: false,
            transformsEnabled: 'position',
          });
          layer.add(node);
          bricks.push({
            node,
            vx: (Math.random() - 0.5) * 1.6,
            vy: (Math.random() - 0.5) * 1.6,
          });
        }
        layer.batchDraw();
        const setupMs = performance.now() - setupStart;

        if (cancelled) {
          stage.destroy();
          return;
        }

        setStatus('running');

        const stop = runBench({
          library: 'konva',
          brickCount: BRICK_COUNT,
          durationMs: DURATION_MS,
          setupMs,
          step: () => {
            for (const agent of bricks) {
              const node = agent.node;
              let nx = node.x() + agent.vx;
              let ny = node.y() + agent.vy;
              if (nx < 0 || nx > STAGE_WIDTH) {
                agent.vx *= -1;
                nx = Math.max(0, Math.min(STAGE_WIDTH, nx));
              }
              if (ny < 0 || ny > STAGE_HEIGHT) {
                agent.vy *= -1;
                ny = Math.max(0, Math.min(STAGE_HEIGHT, ny));
              }
              node.position({ x: nx, y: ny });
            }
            layer.batchDraw();
          },
          onComplete: (final) => {
            setResult(final);
            setStatus('done');
          },
        });

        cleanup = () => {
          stop();
          stage.destroy();
        };
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <BenchStatus status={status} result={result} error={error} brickCount={BRICK_COUNT} />
      <div
        ref={containerRef}
        data-testid="konva-bench-stage"
        className="overflow-hidden rounded-lg border border-border bg-muted/40"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
      />
    </div>
  );
}

function BenchStatus({
  status,
  result,
  error,
  brickCount,
}: {
  status: 'loading' | 'running' | 'done' | 'error';
  result: BenchResult | null;
  error: string | null;
  brickCount: number;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="bench-status"
      data-status={status}
      className="rounded-lg border border-border bg-background px-4 py-3 text-sm"
    >
      <p>
        <strong>{brickCount}</strong> bricks (25 participants × 100). Status:{' '}
        <strong data-testid="bench-status-value">{status}</strong>.
      </p>
      {error ? <p className="mt-2 text-danger">Error: {error}</p> : null}
      {result ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
          <dt className="text-muted-foreground">FPS</dt>
          <dd data-testid="bench-fps">{result.fps.toFixed(1)}</dd>
          <dt className="text-muted-foreground">Frame p50 ms</dt>
          <dd data-testid="bench-p50">{result.frameP50ms.toFixed(2)}</dd>
          <dt className="text-muted-foreground">Frame p95 ms</dt>
          <dd data-testid="bench-p95">{result.frameP95ms.toFixed(2)}</dd>
          <dt className="text-muted-foreground">Setup ms</dt>
          <dd data-testid="bench-setup">{result.setupMs.toFixed(0)}</dd>
        </dl>
      ) : null}
    </div>
  );
}
