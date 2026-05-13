'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';

import { ShareCanvas, SHARE_ZOOM_LIMITS } from './ShareCanvas';
import type { CanvasState } from '@/lib/models/types';

export interface ShareViewProps {
  title: string;
  canvasState: CanvasState;
}

export function ShareView({ title, canvasState }: ShareViewProps) {
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const zoomBy = useCallback(
    (factor: number, anchor: { x: number; y: number }) => {
      setZoom((prev) => {
        const { MIN_ZOOM, MAX_ZOOM } = SHARE_ZOOM_LIMITS;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * factor));
        if (next === prev) return prev;
        const applied = next / prev;
        setPan((p) => ({
          x: anchor.x - (anchor.x - p.x) * applied,
          y: anchor.y - (anchor.y - p.y) * applied,
        }));
        return next;
      });
    },
    [],
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#FAF7F1] text-zinc-900">
      <header className="border-b border-zinc-900/10 bg-white px-5 py-4">
        <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
      </header>
      <main className="relative flex-1 overflow-hidden">
        <ShareCanvas
          groups={canvasState.groups}
          bricks={canvasState.bricks}
          pan={pan}
          zoom={zoom}
          onZoomBy={zoomBy}
        />
        <div className="pointer-events-none absolute bottom-3 left-5 z-40">
          <Link
            href="/"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center gap-1 rounded-md bg-white/85 px-2 py-1 text-[11px] font-medium text-zinc-600 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.2)] backdrop-blur hover:text-zinc-900"
          >
            Made with BrickThink →
          </Link>
        </div>
      </main>
    </div>
  );
}
