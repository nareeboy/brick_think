'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Layer, Stage } from 'react-konva';

import { BrickImage } from '@/components/canvas/BrickImage';
import type { BrickInstance, LayerGroup } from '@/components/builder/builderState';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;

export interface ShareCanvasProps {
  groups: LayerGroup[];
  bricks: BrickInstance[];
  pan: { x: number; y: number };
  zoom: number;
  onZoomBy: (factor: number, anchor: { x: number; y: number }) => void;
  onPanBy: (dx: number, dy: number) => void;
}

export function ShareCanvas({ groups, bricks, pan, zoom, onZoomBy, onPanBy }: ShareCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    lastPointRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const last = lastPointRef.current;
      if (!last) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      if (dx === 0 && dy === 0) return;
      lastPointRef.current = { x: e.clientX, y: e.clientY };
      onPanBy(dx, dy);
    },
    [onPanBy],
  );

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!lastPointRef.current) return;
    lastPointRef.current = null;
    setIsDragging(false);
    if (
      typeof e.currentTarget.hasPointerCapture === 'function' &&
      e.currentTarget.hasPointerCapture(e.pointerId)
    ) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const visibleBricks = useMemo(() => {
    const groupVisible = new Map<string, boolean>();
    for (const g of groups) groupVisible.set(g.id, g.visible);
    return bricks
      .filter((b) => b.visible && groupVisible.get(b.groupId) !== false)
      .slice()
      .reverse();
  }, [bricks, groups]);

  return (
    <div
      ref={containerRef}
      data-testid="share-canvas-surface"
      className={`absolute inset-0 touch-none select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <ul aria-hidden="true" className="sr-only" data-testid="placed-brick-list">
        {visibleBricks.map((b) => (
          <li key={b.id} data-testid="placed-brick" data-brick-id={b.id} />
        ))}
      </ul>
      {size.width > 0 && size.height > 0 ? (
        <>
          <Stage width={size.width} height={size.height} x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom}>
            <Layer>
              {visibleBricks.map((b) => (
                <BrickImage key={b.id} brick={b} />
              ))}
            </Layer>
          </Stage>
          <div className="pointer-events-none absolute inset-0 z-30">
            <div
              className="pointer-events-auto absolute bottom-5 right-5 inline-flex cursor-default items-center gap-1 rounded-2xl border border-zinc-900/10 bg-white/85 p-1.5 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Zoom out"
                disabled={zoom <= MIN_ZOOM + 1e-6}
                onClick={() => onZoomBy(1 / ZOOM_STEP, { x: size.width / 2, y: size.height / 2 })}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                −
              </button>
              <span className="min-w-[3ch] select-none px-1 text-center text-[11px] font-medium tabular-nums text-zinc-600">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={zoom >= MAX_ZOOM - 1e-6}
                onClick={() => onZoomBy(ZOOM_STEP, { x: size.width / 2, y: size.height / 2 })}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export const SHARE_ZOOM_LIMITS = { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP };
