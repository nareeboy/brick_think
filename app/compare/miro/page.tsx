import type { Metadata } from 'next';
import Link from 'next/link';

import { ArrowRight, CtaBricks, MarketingShell } from '@/components/marketing/MarketingChrome';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'BrickThink vs Miro for LEGO® SERIOUS PLAY®',
  absoluteTitle: true,
  description:
    'Whiteboards give you a canvas, not the method. BrickThink encodes the five-stage LSP sequence, stage state machine, and auto-composed shared models.',
  path: '/compare/miro',
});

// Honest, feature-level comparison. "Miro" here stands in for any general
// whiteboard (Miro, Mural, FigJam) pressed into LSP duty with a brick template.
const ROWS: { dimension: string; brickthink: string; whiteboard: string }[] = [
  {
    dimension: 'The five-stage sequence',
    brickthink: 'Encoded. Stages run in order with facilitator-controlled advancement.',
    whiteboard: 'A frame layout you rebuild and police by hand, every session.',
  },
  {
    dimension: 'Timeboxing',
    brickthink: 'Per-stage timers with pause and extend, visible to the whole room.',
    whiteboard: 'A separate timer widget you start, stop, and narrate yourself.',
  },
  {
    dimension: 'Individual → shared model',
    brickthink: 'Builds carry over and compose into one shared model on the canvas.',
    whiteboard: 'Copy-paste clusters of stickers and hope the grouping survives.',
  },
  {
    dimension: 'The bricks',
    brickthink: 'Purpose-built brick tiles you drag, turn, and recolour — made for metaphor.',
    whiteboard: 'Clipart or image stamps with no build semantics.',
  },
  {
    dimension: 'Sharing the story',
    brickthink: 'Spotlight a build; narrations are captured and transcribed per person and stage.',
    whiteboard: 'Whoever talks, talks. The story lives in the recording, if anyone rewatches it.',
  },
  {
    dimension: 'The record',
    brickthink: 'Stage images, transcripts, and session exports — a deliverable, not a screenshot.',
    whiteboard: 'A board URL that decays as people move things after the session.',
  },
  {
    dimension: 'Openness',
    brickthink: 'Open source under Apache 2.0. Free to self-host.',
    whiteboard: 'Proprietary, per-seat licensing.',
  },
];

const KEEP_MIRO = [
  'General-purpose workshops: flowcharts, journey maps, retro grids, planning walls.',
  'Teams already deep in a whiteboard ecosystem for everyday collaboration.',
  'Sessions where the method is loose and improvised structure is the point.',
];

export default function VsMiroPage() {
  return (
    <MarketingShell>
      <Hero />
      <ThesisSection />
      <ComparisonSection />
      <FairnessSection />
      <CtaBand />
    </MarketingShell>
  );
}

function Hero() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-16 pt-20 md:grid-cols-12 md:items-end md:gap-12 md:pb-24 md:pt-28">
        <div className="md:col-span-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700 backdrop-blur">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#a8482a]" />
            BrickThink vs Miro
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[74px]">
            A whiteboard gives you a canvas.
            <br />
            <span className="text-[#a8482a]">Not the method.</span>
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            You can run LEGO® SERIOUS PLAY® on Miro with a brick template and a lot of discipline.
            BrickThink encodes the discipline instead: the five-stage sequence, the timeboxes, the
            hand-over from individual builds to one shared model.
          </p>
        </div>
        <aside className="md:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            {[
              ['Built in', 'Five-stage sequence'],
              ['One canvas', 'Shared model composes'],
              ['Transcribed', 'Every narration'],
              ['Apache 2.0', 'Open source'],
            ].map(([val, label]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {label}
                </dt>
                <dd className="mt-1 font-display text-[20px] font-medium tracking-tight text-zinc-950">
                  {val}
                </dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}

function ThesisSection() {
  return (
    <section className="border-b border-zinc-900/5 bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-24">
        <div className="md:col-span-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            The difference
          </p>
        </div>
        <div className="md:col-span-8">
          <p className="font-display text-[24px] font-normal leading-[1.25] tracking-[-0.01em] md:text-[34px]">
            On a whiteboard, the facilitator carries the method in their head and enforces it by
            talking. In BrickThink the method is{' '}
            <span className="text-[#d8a85d]">the software&rsquo;s job</span> — which frees you to
            listen to the room.
          </p>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Side by side
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              What a dedicated LSP tool changes.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            &ldquo;Miro&rdquo; below stands for any general whiteboard pressed into LSP duty with a
            template.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-900/15">
                <th scope="col" className="w-[24%] py-4 pr-6 align-bottom">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Dimension
                  </span>
                </th>
                <th scope="col" className="w-[38%] py-4 pr-6 align-bottom">
                  <span className="font-display text-[18px] font-medium tracking-tight text-zinc-950">
                    BrickThink
                  </span>
                </th>
                <th scope="col" className="w-[38%] py-4 align-bottom">
                  <span className="font-display text-[18px] font-medium tracking-tight text-zinc-600">
                    Whiteboard + template
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.dimension} className="border-b border-zinc-900/10 align-top">
                  <th
                    scope="row"
                    className="py-5 pr-6 text-[13px] font-medium leading-snug text-zinc-950"
                  >
                    {row.dimension}
                  </th>
                  <td className="py-5 pr-6 text-[14px] leading-relaxed text-zinc-800">
                    {row.brickthink}
                  </td>
                  <td className="py-5 text-[14px] leading-relaxed text-zinc-500">
                    {row.whiteboard}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FairnessSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-28">
        <div className="md:col-span-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            To be fair
          </p>
          <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
            Keep Miro for what Miro is good at.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
            Miro is an excellent general whiteboard. This is not a takedown — it is a scope
            statement. BrickThink does one method, properly.
          </p>
        </div>
        <ul className="md:col-span-7">
          {KEEP_MIRO.map((line, i) => (
            <li
              key={line}
              className={`grid grid-cols-12 items-baseline gap-6 border-t py-6 ${
                i === KEEP_MIRO.length - 1 ? 'border-b' : ''
              } border-zinc-900/10`}
            >
              <span className="col-span-2 font-mono text-[11px] tabular-nums tracking-tight text-zinc-500 md:col-span-1">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="col-span-10 max-w-[58ch] text-[15px] leading-relaxed text-zinc-800 md:col-span-11">
                {line}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="bg-[#FAF7F1]">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
        <div className="relative overflow-hidden rounded-[32px] border border-zinc-900/10 bg-gradient-to-br from-[#FBF7F1] to-[#F2E8D8] p-10 md:p-14">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
            <CtaBricks />
          </div>
          <div className="relative max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Try the method-first tool
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[48px]">
              Run one session. Compare for yourself.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
              BrickThink is open source and free to facilitate on. If your next LSP session works
              better here than on your whiteboard, keep going.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-in"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition-colors hover:bg-zinc-800 active:translate-y-[1px]"
              >
                Create a facilitator account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/facilitators"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-900/15 bg-white px-5 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                See the facilitator tools
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
