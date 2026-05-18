'use client';

import { useMemo, useState } from 'react';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import type { BrickCategory, BrickDefinition } from '@/lib/bricks/types';

import { useDragPiece } from './dragPiece';

const CATEGORY_LABELS: Record<BrickCategory, string> = {
  brick: 'Bricks',
  plate: 'Plates',
  slope: 'Slopes',
  round: 'Round',
  window: 'Windows',
  door: 'Doors',
  decorative: 'Decor',
  figure: 'Figures',
  connector: 'Connect',
  specialty: 'Specialty',
};

const CATEGORY_ORDER: BrickCategory[] = [
  'brick',
  'plate',
  'slope',
  'round',
  'window',
  'door',
  'decorative',
  'figure',
  'connector',
  'specialty',
];

type FilterId = 'all' | BrickCategory;

export function PiecesDrawer() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterId>('all');

  const categories = useMemo<{ id: FilterId; label: string }[]>(() => {
    const present = new Set(CANONICAL_BRICKS.map((b) => b.category));
    return [
      { id: 'all' as const, label: 'All' },
      ...CATEGORY_ORDER.filter((c) => present.has(c)).map((c) => ({
        id: c,
        label: CATEGORY_LABELS[c],
      })),
    ];
  }, []);

  const pieces = useMemo(
    () =>
      filter === 'all' ? CANONICAL_BRICKS : CANONICAL_BRICKS.filter((b) => b.category === filter),
    [filter],
  );

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close pieces' : 'Open pieces'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`absolute right-5 top-5 z-30 inline-flex h-11 w-11 !cursor-pointer items-center justify-center rounded-2xl border transition-colors ${
          open
            ? 'border-transparent bg-zinc-900 text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.35)]'
            : 'border-zinc-900/10 bg-white/85 text-zinc-700 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur hover:bg-white hover:text-zinc-900'
        }`}
      >
        <LegoIcon className="h-5 w-5" />
      </button>

      <div
        aria-hidden={!open}
        className={`pointer-events-none absolute inset-y-3 right-3 z-20 w-[min(360px,calc(100%-1.5rem))] transition-[transform,opacity] duration-300 ease-out ${
          open
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none translate-x-[calc(100%+1rem)] opacity-0'
        }`}
      >
        <div
          className={`flex h-full flex-col rounded-2xl border border-zinc-900/10 bg-white shadow-[0_24px_50px_-20px_rgba(0,0,0,0.35)] ${
            open ? 'pointer-events-auto' : ''
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-900/10 px-5 py-4">
            <div>
              <p className="text-[14px] font-semibold text-zinc-900">Pieces</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                {CANONICAL_BRICKS.length} parts
              </p>
            </div>
            <button
              type="button"
              aria-label="Close pieces"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 pt-4">
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {categories.map((cat) => {
                const active = cat.id === filter;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setFilter(cat.id)}
                    aria-pressed={active}
                    className={`shrink-0 cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                      active
                        ? 'border-transparent bg-zinc-900 text-white'
                        : 'border-zinc-900/10 bg-zinc-50 text-zinc-600 hover:border-zinc-900/20 hover:text-zinc-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">
            {pieces.length === 0 ? (
              <p className="px-1 py-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                No pieces in this category
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {pieces.map((p) => (
                  <PieceTile key={p.code} brick={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function PieceTile({ brick }: { brick: BrickDefinition }) {
  const { startDrag } = useDragPiece();
  return (
    <button
      type="button"
      data-testid="piece-card"
      title={brick.name}
      aria-label={`Add ${brick.name} — click to place, or drag onto the canvas`}
      onPointerDown={(e) => startDrag(brick, e)}
      className="group flex flex-col items-center gap-1.5 rounded-xl border border-zinc-900/10 bg-zinc-50 p-2 transition-colors touch-none cursor-pointer active:cursor-grabbing hover:border-zinc-900/25 hover:bg-white"
    >
      <span
        className="relative flex aspect-square w-full items-center justify-center rounded-lg bg-white"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(60,30,15,0.06)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brick.image}
          alt=""
          loading="lazy"
          draggable={false}
          className="max-h-[70%] max-w-[70%] pointer-events-none select-none"
        />
      </span>
      <span className="w-full truncate text-center font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600 pointer-events-none">
        {brick.code.replace(/^.+?-/, '')}
      </span>
    </button>
  );
}

function LegoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <rect x="5.25" y="5" width="3.5" height="4" rx="1.25" />
      <rect x="10.25" y="5" width="3.5" height="4" rx="1.25" />
      <rect x="15.25" y="5" width="3.5" height="4" rx="1.25" />
    </svg>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}
