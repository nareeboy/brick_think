'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { CANONICAL_BRICKS } from '@/lib/bricks/canonical';
import type { BrickCategory, BrickDefinition } from '@/lib/bricks/types';

import { useDragPiece } from './dragPiece';
import { CloseIcon } from '@/components/icons';

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
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Light dismiss: a pointerdown anywhere outside the panel (i.e. on the
  // canvas or its chrome) closes the drawer without swallowing the event.
  // The toggle is excluded — its own click handler closes the drawer, and
  // dismissing on its pointerdown first would make the click reopen it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

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
        ref={toggleRef}
        aria-label={open ? 'Close pieces' : 'Open pieces'}
        aria-expanded={open}
        data-tour-id="pieces-drawer-toggle"
        onClick={() => setOpen((v) => !v)}
        className={`absolute right-5 top-5 z-30 inline-flex h-11 w-11 !cursor-pointer items-center justify-center rounded-2xl border transition-colors ${
          open
            ? 'border-transparent bg-zinc-900 text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.35)]'
            : 'border-zinc-900/10 bg-white/85 text-zinc-700 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur hover:bg-white hover:text-zinc-900'
        }`}
      >
        <LegoIcon className="h-5 w-5" />
      </button>

      {/* z-40: above the canvas chrome (Share/Export/Notes sit at z-30),
          below modals (z-50). */}
      <div
        ref={panelRef}
        data-testid="pieces-drawer-panel"
        aria-hidden={!open}
        // inert makes the closed drawer's piece buttons untabbable (aria-hidden
        // alone leaves them keyboard-reachable — an axe aria-hidden-focus
        // violation that every scan missed while the cookie-consent banner's
        // role="dialog" made axe-core treat a modal as open and skip the rule).
        inert={!open}
        className={`pointer-events-none absolute inset-y-3 right-3 z-40 w-[min(360px,calc(100%-1.5rem))] transition-[transform,opacity] duration-300 ease-out ${
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
            <div
              role="radiogroup"
              aria-label="Piece category"
              className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
            >
              {categories.map((cat) => {
                const active = cat.id === filter;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    role="radio"
                    onClick={() => setFilter(cat.id)}
                    aria-checked={active}
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
  const { startDrag, addAtCenter } = useDragPiece();
  return (
    <button
      type="button"
      data-testid="piece-card"
      title={brick.name}
      aria-label={`Add ${brick.name} — Enter or Space to place at canvas centre, or drag onto the canvas`}
      onPointerDown={(e) => startDrag(brick, e)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          addAtCenter(brick);
        }
      }}
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
