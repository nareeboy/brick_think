'use client';

import { Application, Sprite, Texture } from 'pixi.js';
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

interface SpriteAgent {
  sprite: Sprite;
  vx: number;
  vy: number;
}

export function PixiBench() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'running' | 'done' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BenchResult | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const setupStart = performance.now();
        const app = new Application();
        await app.init({
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          backgroundAlpha: 0,
          antialias: false,
          autoStart: false,
        });
        if (cancelled) {
          app.destroy(true, { children: true, texture: true });
          return;
        }
        container.appendChild(app.canvas);

        const codes = CANONICAL_BRICKS.slice(0, 16).map((b) => b.code);
        const images = await Promise.all(codes.map((code) => loadBrickImage(code)));
        const textures = images.map((img) => Texture.from(img));

        const agents: SpriteAgent[] = [];
        for (let i = 0; i < BRICK_COUNT; i += 1) {
          const idx = i % codes.length;
          const def = CANONICAL_BRICKS[idx]!;
          const sprite = new Sprite(textures[idx]!);
          sprite.anchor.set(0.5);
          sprite.width = def.studsX * BRICK_BASE_UNIT * SCALE;
          sprite.height = def.studsY * BRICK_BASE_UNIT * SCALE;
          sprite.x = Math.random() * STAGE_WIDTH;
          sprite.y = Math.random() * STAGE_HEIGHT;
          sprite.rotation = Math.random() * Math.PI * 2;
          sprite.eventMode = 'none';
          app.stage.addChild(sprite);
          agents.push({
            sprite,
            vx: (Math.random() - 0.5) * 1.6,
            vy: (Math.random() - 0.5) * 1.6,
          });
        }
        app.render();
        const setupMs = performance.now() - setupStart;

        if (cancelled) {
          app.destroy(true, { children: true, texture: true });
          return;
        }

        setStatus('running');

        const stop = runBench({
          library: 'pixi',
          brickCount: BRICK_COUNT,
          durationMs: DURATION_MS,
          setupMs,
          step: () => {
            for (const agent of agents) {
              const sprite = agent.sprite;
              let nx = sprite.x + agent.vx;
              let ny = sprite.y + agent.vy;
              if (nx < 0 || nx > STAGE_WIDTH) {
                agent.vx *= -1;
                nx = Math.max(0, Math.min(STAGE_WIDTH, nx));
              }
              if (ny < 0 || ny > STAGE_HEIGHT) {
                agent.vy *= -1;
                ny = Math.max(0, Math.min(STAGE_HEIGHT, ny));
              }
              sprite.x = nx;
              sprite.y = ny;
            }
            app.render();
          },
          onComplete: (final) => {
            setResult(final);
            setStatus('done');
          },
        });

        cleanup = () => {
          stop();
          app.destroy(true, { children: true, texture: false });
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
        data-testid="pixi-bench-stage"
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
