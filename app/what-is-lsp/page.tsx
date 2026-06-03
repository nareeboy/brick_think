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
      'Hands learn before heads. Build a tower. Build a duck. Build a thing that means hope. Get past feeling shy with the bricks.',
    detail: 'No deep meaning yet. Just get used to the bricks. Get used to thinking by building.',
  },
  {
    n: '02',
    name: 'Individual model',
    duration: '13 min',
    blurb: 'Each person builds their own answer to one clear question. Alone. With no one talking.',
    detail:
      'The model is the answer. Not a draft. Not a picture of an answer. Then each person tells the room what each brick means.',
  },
  {
    n: '03',
    name: 'Shared model',
    duration: '30 min',
    blurb:
      'Each person’s model joins into one shared model. Bricks shift around. The meaning shifts too.',
    detail:
      'Don’t aim for agreement. Aim for one thing the group made together. Something they can keep pointing at and arguing with later.',
  },
  {
    n: '04',
    name: 'System model',
    duration: '25 min',
    blurb:
      'Add the links. Add the outside players. Add the forces at play. It stops being a list. It starts being a shape.',
    detail:
      'Lines, arrows, friends, rivals. The model shows what feeds what. And what depends on what.',
  },
  {
    n: '05',
    name: 'Guiding principles',
    duration: '20 min',
    blurb:
      'Pull out clear rules. Each one points to bricks that back it up. Take the rules home. Leave the bricks behind.',
    detail: 'A rule that can’t point back to a brick does not make the final cut.',
  },
];

const TENETS = [
  {
    label: 'Hand-knowledge',
    title: 'The hands know things the mouth does not.',
    body: 'Rule of thumb: most of what people know about their team and their work, they cannot say out loud. Until they build it.',
  },
  {
    label: '100% participation',
    title: 'Everyone builds. Everyone shares.',
    body: 'No watchers. No leaning on the loudest voice. If someone will not build, they are in the wrong room. You can say that out loud.',
  },
  {
    label: 'The model owns the meaning',
    title: 'You point at bricks, not at people.',
    body: 'Arguments happen through the model. Move a brick. Cut a line. Stop a metaphor. No one argues with a colleague’s words.',
  },
  {
    label: 'Time-boxed by design',
    title: 'The clock is the point.',
    body: 'Each stage has a timer. The pressure stops people over-thinking. It forces them to pick an answer and live with it.',
  },
];

const WHEN_TO_USE = [
  'Strategy: turn a fuzzy goal into a system the team can defend.',
  'Team forming: get the real expectations on the table early.',
  'Retros: get past the safe answers and into what people really noticed.',
  'Working agreements: write down the unwritten rules. Then change them.',
  'Big change: after a merger. After a re-org. After a new boss.',
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
            What is LSP?
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[80px]">
            What is <span className="text-[#c0613d]">LEGO®</span>
            <br />
            SERIOUS PLAY®?
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            LSP is a workshop method. People build small models out of bricks. Then they tell the
            room what each model means. You hear what your team really thinks — not just the safe
            answer. Five stages. In order. With care.
          </p>
        </div>
        <aside className="md:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            {[
              ['1996', 'Method first dreamed up'],
              ['2010', 'Made free for all'],
              ['CC BY-SA 3.0', 'Licence in use today'],
              ['5 stages', 'In a strict order'],
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
            Most of what your team knows about its work, they{' '}
            <span className="text-[#d8a85d]">can’t put into words</span>. Normal meetings only catch
            what people are willing to say on the spot. That is the safe part. LSP gets the rest out
            — because people build first and talk second.
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
              The order is the method.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
              You can run one stage. You can run a few. But out of order, or with no story step, you
              are just running a workshop with bricks. That is not LSP.
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
              Four rules that keep it real.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            Drop one of these and it stops working.
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
            Use it when words stop working.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
            If the team agrees, skip this. If they keep having the same polite talk, you need it.
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
            The LSP method is open under{' '}
            <span className="font-mono text-[13px] text-[#c0613d]">CC BY-SA 3.0</span>. Anyone can
            teach it. Anyone can build on it. The names{' '}
            <em className="not-italic font-medium">LEGO®</em>,{' '}
            <em className="not-italic font-medium">SERIOUS PLAY®</em>,{' '}
            <em className="not-italic font-medium">IMAGINOPEDIA</em>, the Minifigure, and the Brick
            and Knob shapes belong to the LEGO Group.
          </p>
          <p>
            BrickThink uses the method under the open licence. We do not use the LEGO® names, brick
            designs, or figures. Our 52 tiles are our own — different names, different look.
          </p>
          <p>The LEGO Group does not sponsor, authorize, or endorse this product.</p>
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
              Run the five stages online.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
              BrickThink gives you the five stages, the story, the shared canvas, and the record.
              Made for teams in different cities.
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
