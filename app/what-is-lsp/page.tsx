import type { Metadata } from 'next';
import Link from 'next/link';

import { ArrowRight, CtaBricks, MarketingShell } from '@/components/marketing/MarketingChrome';

export const metadata: Metadata = {
  title: 'What is LEGO® SERIOUS PLAY®',
  description:
    'An explainer of the LEGO® SERIOUS PLAY® methodology — five stages, hand-knowledge, narrated models, and the principles practitioners live by.',
};

const STAGES = [
  {
    n: '01',
    name: 'Skill-building',
    duration: '15 min',
    blurb:
      'Hands learn before minds do. The room builds together — towers, ducks, a thing that means hope — until the technique stops being a barrier.',
    detail:
      'No metaphor yet. Just confidence with the bricks and the etiquette of building-as-thinking.',
  },
  {
    n: '02',
    name: 'Individual model',
    duration: '13 min',
    blurb:
      'Each person builds their own answer to one carefully framed question. Privately. Without commentary.',
    detail:
      'The model is the answer. It is not a draft of an answer or an illustration of an answer. Then it is narrated, brick by brick, in the participant’s own words.',
  },
  {
    n: '03',
    name: 'Shared model',
    duration: '30 min',
    blurb:
      'Individual models negotiate themselves into one shared model. Bricks move. Meaning moves with them.',
    detail:
      'The point is not consensus. The point is a shared object the group built together that everyone can point at and continue to argue with afterwards.',
  },
  {
    n: '04',
    name: 'System model',
    duration: '25 min',
    blurb:
      'Connections, forces, and outside agents go on the canvas. The system stops being a list and starts being a structure.',
    detail:
      'String, arrows, antagonists, allies. The model now shows what reinforces what and what is downstream of what.',
  },
  {
    n: '05',
    name: 'Guiding principles',
    duration: '20 min',
    blurb:
      'Extract written principles, each one anchored to the bricks that justify it. Take the principles. Leave the bricks behind.',
    detail:
      'A principle that cannot be traced back to a brick in the system model does not survive this stage.',
  },
];

const TENETS = [
  {
    label: 'Hand-knowledge',
    title: 'The hands know things the mouth does not.',
    body: 'A 70/30 rule of thumb in the practitioner community: most of what people know about how their organisation actually works is non-verbal until they build it.',
  },
  {
    label: '100% participation',
    title: 'Everyone builds. Everyone narrates.',
    body: 'No silent observers. No one defers to the loudest person. Anyone unwilling to build is in the wrong room — and that is allowed to be said out loud.',
  },
  {
    label: 'The model owns the meaning',
    title: 'You point at bricks, not at people.',
    body: 'Disagreement happens through the model. You move a brick, you change a connection, you stop a metaphor — instead of arguing with a colleague’s words.',
  },
  {
    label: 'Time-boxed by design',
    title: 'Constraint is the whole point.',
    body: 'Each stage has a duration. The pressure of the timer is what stops people optimising their answer and forces them to commit one.',
  },
];

const WHEN_TO_USE = [
  'Strategy: turning a fuzzy ambition into a system everyone can defend.',
  'Team formation: surfacing real expectations of each other in a new team.',
  'Retrospectives: getting past the safe answers and into what people actually noticed.',
  'Working agreements: making the unwritten rules of a team explicit and editable.',
  'Cultural integration: post-merger, post-restructure, post-leadership-change.',
];

export default function WhatIsLspPage() {
  return (
    <MarketingShell>
      <Hero />
      <ThesisSection />
      <StagesSection />
      <TenetsSection />
      <WhenSection />
      <TrademarkSection />
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
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
            Methodology primer
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[80px]">
            What is <span className="text-[#c0613d]">LEGO®</span>
            <br />
            SERIOUS PLAY®?
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            A facilitated methodology that uses physical models — and metaphor — to surface what a
            team actually thinks, instead of what it is willing to say out loud. Five stages, in
            sequence, with discipline. The methodology is released under CC BY-SA 3.0; the
            trademarks of the LEGO Group are not used here.
          </p>
        </div>
        <aside className="md:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            {[
              ['1996', 'Methodology conceived'],
              ['2010', 'Released open-source'],
              ['CC BY-SA 3.0', 'Licence in use today'],
              ['5 stages', 'Canonical sequence'],
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
            The thesis
          </p>
        </div>
        <div className="md:col-span-8">
          <p className="font-display text-[24px] font-normal leading-[1.25] tracking-[-0.01em] md:text-[34px]">
            Most of what your team understands about its own work is{' '}
            <span className="text-[#d8a85d]">non-verbal</span>. Conventional meetings only capture
            the part people are willing to articulate on the spot — which is usually the safest
            part. LSP forces the rest onto the table by making everyone build it first and explain
            it second.
          </p>
        </div>
      </div>
    </section>
  );
}

function StagesSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              The five stages
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              The sequence is the methodology.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
              You can run a single stage as a focused exercise. You can run a subset. But running
              them out of order, or skipping the narration steps, is no longer LSP — it is a
              workshop with bricks in it.
            </p>
          </div>
          <ol className="md:col-span-8">
            {STAGES.map((s, i) => (
              <li
                key={s.n}
                className={`grid grid-cols-12 items-baseline gap-6 border-t py-7 transition-colors hover:bg-white/50 ${
                  i === STAGES.length - 1 ? 'border-b' : ''
                } border-zinc-900/10`}
              >
                <span className="col-span-2 font-mono text-[12px] tabular-nums tracking-tight text-zinc-500 md:col-span-1">
                  {s.n}
                </span>
                <div className="col-span-10 md:col-span-8">
                  <p className="font-display text-[22px] font-medium tracking-tight text-zinc-950">
                    {s.name}
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-zinc-700">{s.blurb}</p>
                  <p className="mt-2 max-w-[58ch] text-[13px] leading-relaxed text-zinc-500">
                    {s.detail}
                  </p>
                </div>
                <span className="col-span-12 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500 md:col-span-3 md:text-right">
                  default · {s.duration}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function TenetsSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Tenets
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              Four non-negotiables that make a session LSP and not theatre.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            Drop any one of these and the method stops doing the thing it was designed to do.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
          {TENETS.map((t, i) => (
            <article
              key={t.label}
              className={`relative flex flex-col rounded-[28px] border border-zinc-900/10 bg-white p-7 transition-shadow duration-300 hover:shadow-[0_30px_60px_-30px_rgba(60,30,15,0.25)] ${
                i === 0
                  ? 'md:col-span-7'
                  : i === 1
                    ? 'md:col-span-5'
                    : i === 2
                      ? 'md:col-span-5'
                      : 'md:col-span-7'
              }`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                {t.label}
              </p>
              <h3 className="mt-3 max-w-[28ch] font-display text-[24px] font-medium leading-tight tracking-tight text-zinc-950">
                {t.title}
              </h3>
              <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-zinc-700">
                {t.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhenSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-28">
        <div className="md:col-span-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            When to reach for it
          </p>
          <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
            Use it when the words are not getting you there.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
            If the team already agrees on everything, you do not need this. If they are stuck in
            polite versions of the same conversation, you do.
          </p>
        </div>
        <ul className="md:col-span-7">
          {WHEN_TO_USE.map((line, i) => (
            <li
              key={line}
              className={`grid grid-cols-12 items-baseline gap-6 border-t py-6 ${
                i === WHEN_TO_USE.length - 1 ? 'border-b' : ''
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

function TrademarkSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            On the trademark
          </p>
        </div>
        <div className="md:col-span-8 space-y-5 text-[15px] leading-relaxed text-zinc-700">
          <p>
            The methodology is published under{' '}
            <span className="font-mono text-[13px] text-[#c0613d]">CC BY-SA 3.0</span> and can be
            referenced, taught, and built upon. The names <em className="not-italic font-medium">LEGO</em>,{' '}
            <em className="not-italic font-medium">SERIOUS PLAY</em>,{' '}
            <em className="not-italic font-medium">IMAGINOPEDIA</em>, the Minifigure, and the Brick
            and Knob configurations are trademarks of the LEGO Group.
          </p>
          <p>
            BrickThink references the methodology under the open licence. We do not use the
            trademarks, the brick designs, or the figurines. Our 52-tile asset set is original,
            named differently, and visually distinct.
          </p>
          <p>
            The LEGO Group does not sponsor, authorize, or endorse this product.
          </p>
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
              Run it remotely
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[48px]">
              Bring the five stages online, without the compromises.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
              BrickThink is the canonical sequence, the narration, the shared canvas, and the
              record — built for distributed teams.
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
