import type { Metadata } from 'next';
import Link from 'next/link';

import { ArrowRight, CtaBricks, MarketingShell } from '@/components/marketing/MarketingChrome';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Remote LEGO® SERIOUS PLAY® for Facilitators',
  absoluteTitle: true,
  description:
    'Deliver LEGO® SERIOUS PLAY® to distributed teams with no compromise. Facilitator stage controls, breakout rooms, live brick canvas. Pairs with your call.',
  path: '/facilitators',
});

const CONTROLS = [
  {
    n: '01',
    name: 'Stage controls',
    blurb:
      'Advance, pause, or extend each stage. The session moves when you say it moves — the five-stage order is enforced, not suggested.',
  },
  {
    n: '02',
    name: 'Breakout rooms',
    blurb:
      'Split a large group into rooms for a stage, then bring the builds back together. No juggling links or duplicate boards.',
  },
  {
    n: '03',
    name: 'Spotlight a build',
    blurb:
      'Put one model in front of everyone while its builder tells the story. The room looks at the bricks, not at the person.',
  },
  {
    n: '04',
    name: 'Timers that hold the line',
    blurb:
      'Every stage runs on a visible clock. Strict, standard, or no-pressure — the timebox does the pushing so you don’t have to.',
  },
  {
    n: '05',
    name: 'Private notes',
    blurb:
      'Keep your observations next to the session while it runs. Yours alone — never shown to the room.',
  },
];

const FLOW = [
  {
    label: 'Before',
    title: 'Set up in five minutes.',
    body: 'Create a session, pick your stages and timings, and invite the group with a join link. Everything the room needs lives behind that one link.',
  },
  {
    label: 'During',
    title: 'You run the room. The platform runs the method.',
    body: 'Everyone builds on the same live canvas. You advance the stages, spotlight builds, and keep the timebox honest — over whichever video call you already use.',
  },
  {
    label: 'After',
    title: 'Walk away with a record.',
    body: 'Narrations are captured and transcribed. Export the session as a PDF report, save each stage as an image, or take the raw data with you.',
  },
];

export default function FacilitatorsPage() {
  return (
    <MarketingShell>
      <Hero />
      <PairsSection />
      <ControlsSection />
      <FlowSection />
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
            For facilitators
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[74px]">
            Deliver <span className="text-[#a8482a]">LEGO® SERIOUS PLAY®</span> to distributed
            teams.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            No compromise on the method. The five stages, in order, with the controls you rely on in
            the room — stage advancement, timeboxes, spotlighting, breakout rooms — on one live
            brick canvas your whole group shares.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-in"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition-colors hover:bg-zinc-800 active:translate-y-[1px]"
            >
              Create a facilitator account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/what-is-lsp"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-900/15 bg-white px-5 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
            >
              New to the method?
            </Link>
          </div>
        </div>
        <aside className="md:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            {[
              ['5 stages', 'Enforced, in order'],
              ['Your call tool', 'Zoom, Teams, Meet…'],
              ['Live canvas', 'Everyone builds at once'],
              ['Full record', 'Transcribed narrations'],
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

function PairsSection() {
  return (
    <section className="border-b border-zinc-900/5 bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-24">
        <div className="md:col-span-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            Pairs with your call
          </p>
        </div>
        <div className="md:col-span-8">
          <p className="font-display text-[24px] font-normal leading-[1.25] tracking-[-0.01em] md:text-[34px]">
            Keep the video tool your client already uses. BrickThink handles the{' '}
            <span className="text-[#d8a85d]">bricks, the stages, and the record</span> — not the
            call. Nothing new for IT to approve on the participant side.
          </p>
        </div>
      </div>
    </section>
  );
}

function ControlsSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Facilitator controls
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              The room answers to you.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
              A whiteboard makes you improvise the method. Here the method is built in, and the
              controls sit with the facilitator — where they belong.
            </p>
          </div>
          <ol className="md:col-span-8">
            {CONTROLS.map((c, i) => (
              <li
                key={c.n}
                className={`grid grid-cols-12 items-baseline gap-6 border-t py-7 transition-colors hover:bg-white/50 ${
                  i === CONTROLS.length - 1 ? 'border-b' : ''
                } border-zinc-900/10`}
              >
                <span className="col-span-2 font-mono text-[12px] tabular-nums tracking-tight text-zinc-500 md:col-span-1">
                  {c.n}
                </span>
                <div className="col-span-10 md:col-span-11">
                  <p className="font-display text-[22px] font-medium tracking-tight text-zinc-950">
                    {c.name}
                  </p>
                  <p className="mt-2 max-w-[58ch] text-[14px] leading-relaxed text-zinc-700">
                    {c.blurb}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function FlowSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              A session, end to end
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              Less admin. More facilitation.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            The setup, the run, and the deliverable — one place, one link.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {FLOW.map((f) => (
            <article
              key={f.label}
              className="relative flex flex-col rounded-[28px] border border-zinc-900/10 bg-white p-7 transition-shadow duration-300 hover:shadow-[0_30px_60px_-30px_rgba(60,30,15,0.25)]"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {f.label}
              </p>
              <h3 className="mt-3 max-w-[28ch] font-display text-[24px] font-medium leading-tight tracking-tight text-zinc-950">
                {f.title}
              </h3>
              <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-zinc-700">
                {f.body}
              </p>
            </article>
          ))}
        </div>
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
              Open source
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[48px]">
              Run your next workshop remotely.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
              The platform is open source and free to facilitate on. Set up a session, invite your
              group, and keep the method intact.
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
                href="/help"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-900/15 bg-white px-5 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                Read the FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
