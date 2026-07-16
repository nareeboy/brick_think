import Link from 'next/link';
import type { ReactNode } from 'react';

// Shared chrome for the error surfaces (404 / error boundary / global-error).
// Deliberately light — no async data, no images — so it renders even when the
// page it replaces is the thing that failed.

export const PRIMARY_ACTION_CLASS =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-800';

export const SECONDARY_ACTION_CLASS =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-zinc-900/15 bg-white/70 px-6 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-900/25 hover:bg-white';

export function ErrorPageShell({
  kicker,
  title,
  description,
  scene,
  children,
  footnote,
}: {
  kicker: string;
  title: string;
  description: string;
  scene: ReactNode;
  children: ReactNode;
  footnote?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#FAF7F1] text-zinc-900">
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 rounded-md text-zinc-900">
          <BrickMark />
          <span className="text-[15px] font-semibold tracking-tight">BrickThink</span>
        </Link>
      </header>
      <main
        id="main"
        className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-10 text-center"
      >
        {scene}
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.18em] text-[#a8482a]">
          {kicker}
        </p>
        <h1 className="mt-4 font-display text-[40px] font-medium leading-[1.02] tracking-[-0.02em] text-zinc-950 sm:text-[52px]">
          {title}
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">{description}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">{children}</div>
        {footnote ? (
          <p className="mt-8 font-mono text-[11px] tracking-wide text-zinc-400">{footnote}</p>
        ) : null}
      </main>
    </div>
  );
}

// Larger sibling of the nav BrickGlyph in MarketingChrome — same construction,
// reproduced here so the shell stays import-free.
function BrickMark() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#a8482a] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),0_2px_0_rgba(255,255,255,0.4)_inset]">
      <span className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-black/20" />
      <span className="absolute right-1/4 top-1.5 h-1.5 w-1.5 translate-x-1/2 rounded-full bg-black/20" />
    </span>
  );
}

function Brick({
  color,
  studs,
  className = '',
}: {
  color: string;
  studs: number;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex h-10 shrink-0 rounded-[7px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),inset_0_2px_0_rgba(255,255,255,0.35)] ${className}`}
      style={{ backgroundColor: color, width: `${studs * 1.75}rem` }}
    >
      <span className="absolute inset-x-0 top-2 flex justify-evenly">
        {Array.from({ length: studs }).map((_, i) => (
          <span key={i} className="h-2 w-2 rounded-full bg-black/20" />
        ))}
      </span>
    </span>
  );
}

function BrickSlot({ studs }: { studs: number }) {
  return (
    <span
      className="inline-flex h-10 shrink-0 rounded-[7px] border-2 border-dashed border-[#a8482a]/45"
      style={{ width: `${studs * 1.75}rem` }}
    />
  );
}

// 404 — a wall with one brick missing.
export function MissingBrickScene() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col items-center gap-0.5 drop-shadow-[0_8px_14px_rgba(60,30,15,0.14)]"
    >
      <div className="flex gap-0.5">
        <Brick color="#d9a441" studs={2} />
        <Brick color="#a8482a" studs={3} />
      </div>
      <div className="flex gap-0.5">
        <Brick color="#44546e" studs={3} />
        <BrickSlot studs={2} />
        <Brick color="#6a9455" studs={2} />
      </div>
    </div>
  );
}

// 500 — a stack that has come apart: the top brick slipped off.
export function TumbledBrickScene() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col items-center drop-shadow-[0_8px_14px_rgba(60,30,15,0.14)]"
    >
      <Brick color="#a8482a" studs={3} className="translate-x-12 -rotate-12" />
      <div className="mt-3 flex gap-0.5">
        <Brick color="#d9a441" studs={2} />
        <Brick color="#44546e" studs={3} />
      </div>
    </div>
  );
}
