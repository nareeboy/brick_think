'use client';

import { useState } from 'react';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import type { BrickCategory, BrickDefinition } from '@/lib/bricks/types';

import { useDragPiece } from './dragPiece';

const PIECE_CATEGORIES: { id: BrickCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'brick', label: 'Bricks' },
  { id: 'plate', label: 'Plates' },
  { id: 'slope', label: 'Slopes' },
  { id: 'window', label: 'Windows' },
  { id: 'decorative', label: 'Decor' },
  { id: 'figure', label: 'Figures' },
  { id: 'connector', label: 'Connect' },
];

export function PiecesDrawer() {
  const [open, setOpen] = useState(false);
  const pieces = CANONICAL_BRICKS;

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
          open ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[calc(100%+1rem)] opacity-0'
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

          <div className="space-y-3 px-5 pt-4">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
                <SearchIcon className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search pieces"
                className="w-full rounded-xl border border-zinc-900/10 bg-zinc-50 py-2 pl-8 pr-3 text-[12px] text-zinc-800 placeholder:text-zinc-500 outline-none focus:border-[#c0613d]/50"
              />
            </div>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {PIECE_CATEGORIES.map((cat, i) => (
                <button
                  type="button"
                  key={cat.id}
                  className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                    i === 0
                      ? 'border-transparent bg-zinc-900 text-white'
                      : 'border-zinc-900/10 bg-zinc-50 text-zinc-600 hover:border-zinc-900/20 hover:text-zinc-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3">
            <div className="grid grid-cols-3 gap-2">
              {pieces.map((p, i) => (
                <PieceTile key={p.code} brick={p} active={i === 3} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PieceTile({ brick, active }: { brick: BrickDefinition; active?: boolean }) {
  const { startDrag } = useDragPiece();
  return (
    <button
      type="button"
      title={brick.name}
      aria-label={`Drag ${brick.name} onto the canvas`}
      onPointerDown={(e) => startDrag(brick, e)}
      className={`group flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-colors touch-none cursor-grab active:cursor-grabbing ${
        active
          ? 'border-[#c0613d] bg-[#c0613d]/10'
          : 'border-zinc-900/10 bg-zinc-50 hover:border-zinc-900/25 hover:bg-white'
      }`}
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

function SearchIcon({ className = '' }: { className?: string }) {
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
