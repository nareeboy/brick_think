import Link from 'next/link';
import type { ReactNode } from 'react';

import { ExampleWorkshopButton } from './ExampleWorkshopButton';

// Shown when someone has no workshops at all — the first screen most new
// users see. It offers two ways forward rather than one: create the real
// thing, or open a finished example and look around first. The example is the
// lower-commitment path, so it sits second but is given equal weight in the
// copy.
export function WorkshopsEmptyState({
  newWorkshopHref,
  hasExample,
  assistantEntry,
}: {
  newWorkshopHref: string;
  hasExample: boolean;
  assistantEntry?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-900/15 bg-white/60 px-6 py-10 text-center sm:px-10">
      <BrickPiecesArt />
      <h2 className="mt-5 text-[17px] font-semibold text-zinc-900">Start your first workshop</h2>
      <p className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-relaxed text-zinc-600">
        A workshop is where your team builds models together and talks through what they mean. Set
        one up, or open an example to see how a finished one looks first.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-start">
        <Link
          href={newWorkshopHref}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#a8482a] px-4 text-[13px] font-semibold text-white shadow-[0_20px_30px_-15px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47] focus-visible:ring-2 focus-visible:ring-[#a8482a] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none"
        >
          New workshop
        </Link>
        <ExampleWorkshopButton hasExample={hasExample} />
      </div>
      {/* Premium entry point (AssistantEntrySlot, resolved by the page). The
          slot renders nothing in open core / when not entitled — `empty:hidden`
          collapses this wrapper so the layout stays identical either way. */}
      <div data-testid="assistant-entry-slot" className="mt-5 flex justify-center empty:hidden">
        {assistantEntry}
      </div>
      <p className="mx-auto mt-6 max-w-[52ch] text-[12px] leading-relaxed text-zinc-500">
        The example is a complete workshop — five stages of models, the rooms the group worked in,
        and what each participant said about what they built. Nothing in it is shared with anyone
        else, and you can delete it whenever you like.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Illustration — same flat brick grammar as the tutorial modal's      */
/* pathway cards (components/onboarding/OnboardingWelcome.tsx): body   */
/* rects with stud caps, brand palette, no raster assets.              */
/* ------------------------------------------------------------------ */

function Stud({ x, y, fill }: { x: number; y: number; fill: string }) {
  return <rect x={x} y={y} width="10" height="5" rx="2" fill={fill} />;
}

/** A 40-wide brick with its two studs, drawn from the body's top-left. */
function Brick({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <>
      <Stud x={x + 6} y={y - 5} fill={fill} />
      <Stud x={x + 24} y={y - 5} fill={fill} />
      <rect x={x} y={y} width="40" height="16" rx="3" fill={fill} />
    </>
  );
}

/** Loose pieces coming together: a laid base, a second course, and the
 *  terracotta brick still on its way down — the workshop about to be built. */
function BrickPiecesArt() {
  return (
    <svg viewBox="0 0 140 92" className="mx-auto h-24 w-auto" aria-hidden="true">
      {/* the brick being placed, with its drop hint */}
      <Brick x={50} y={12} fill="#a8482a" />
      <path
        d="M70 34v8"
        stroke="#9a4a2c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 4"
      />
      {/* second course */}
      <Brick x={28} y={49} fill="#5f7d72" />
      <Brick x={72} y={49} fill="#cbb9ad" />
      {/* base course */}
      <Brick x={6} y={70} fill="#d8d3cd" />
      <Brick x={50} y={70} fill="#cbb9ad" />
      <Brick x={94} y={70} fill="#d8d3cd" />
      {/* soft ground shadow */}
      <ellipse cx="70" cy="89" rx="54" ry="3" fill="#a8482a" opacity="0.08" />
    </svg>
  );
}
