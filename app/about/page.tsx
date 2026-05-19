import type { Metadata } from 'next';
import Link from 'next/link';

import {
  ArrowRight,
  CtaBricks,
  GITHUB_URL,
  GitHubGlyph,
  MarketingShell,
} from '@/components/marketing/MarketingChrome';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why BrickThink exists, what we stand for, and how the product is built — under Apache 2.0, in the open.',
};

const PRINCIPLES = [
  {
    n: '01',
    title: 'Methodology fidelity over feature surface.',
    body: 'A whiteboard with bricks pasted on it is not Serious Play. We model the five stages, the narration, and the etiquette directly in the product — and we say no to features that water them down.',
  },
  {
    n: '02',
    title: 'Open by default.',
    body: 'The code is Apache 2.0. The data model is documented. You can self-host the entire stack and never sign a contract with us. We earn the hosted version on convenience, not lock-in.',
  },
  {
    n: '03',
    title: 'Accessibility is the bar to ship, not a Phase 2.',
    body: 'WCAG 2.2 AA from day one. Keyboard, screen reader, reduced-motion and colour-blind-safe palette work on the same canvas every other participant sees.',
  },
  {
    n: '04',
    title: 'Quiet product. Loud sessions.',
    body: 'The interface should disappear during a session. Facilitators look at participants and a single shared model — not at the toolbar.',
  },
];

const ORIGINS = [
  {
    label: 'The problem',
    body: 'Serious Play was designed for a physical room. Most remote adaptations either lose the methodology (a generic whiteboard) or lose the medium (a fancy video call). We wanted neither.',
  },
  {
    label: 'The wager',
    body: 'A canonical, time-boxed five-stage flow plus narrated 2D brick canvases is enough to keep the methodology intact remotely — without violating any LEGO Group trademarks.',
  },
  {
    label: 'The reality',
    body: 'BrickThink is Phase 0. The five stages exist, the canvas works, Yjs keeps shared models smooth. Exports, AI assist, voice narration are on the roadmap and the dates are honest.',
  },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <Hero />
      <ThesisBand />
      <OriginSection />
      <PrinciplesSection />
      <StackSection />
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
            About BrickThink
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[78px]">
            A studio building one
            <br />
            <span className="text-[#c0613d]">opinionated</span> tool, well.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            BrickThink is a remote-native adaptation of the Serious Play methodology. It exists
            because we were unwilling to keep telling facilitators that the methodology cannot
            survive online. It can — but only with discipline, not with another whiteboard.
          </p>
        </div>
        <aside className="md:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            {[
              ['Phase 0', 'In active build'],
              ['Apache 2.0', 'Source licence'],
              ['CC BY-SA 3.0', 'Methodology licence'],
              ['EU', 'Data residency'],
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

function ThesisBand() {
  return (
    <section className="border-b border-zinc-900/5 bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-24">
        <div className="md:col-span-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            Our thesis
          </p>
        </div>
        <div className="md:col-span-8">
          <p className="font-display text-[24px] font-normal leading-[1.25] tracking-[-0.01em] md:text-[34px]">
            The five-stage Serious Play methodology survives the move online —{' '}
            <span className="text-[#d8a85d]">if and only if</span> the product refuses to be a
            generic whiteboard. Canvas, narration, sequence, and timer have to be first-class. Most
            of what we say no to is more important than what we ship.
          </p>
        </div>
      </div>
    </section>
  );
}

function OriginSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              How we got here
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              The problem, the wager, the current state.
            </h2>
          </div>
          <ol className="md:col-span-7">
            {ORIGINS.map((o, i) => (
              <li
                key={o.label}
                className={`grid grid-cols-12 gap-6 border-t py-8 ${
                  i === ORIGINS.length - 1 ? 'border-b' : ''
                } border-zinc-900/10`}
              >
                <span className="col-span-12 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 md:col-span-3">
                  {o.label}
                </span>
                <p className="col-span-12 max-w-[58ch] text-[16px] leading-relaxed text-zinc-800 md:col-span-9">
                  {o.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function PrinciplesSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Principles
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              What we hold ourselves to.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            Easier to write down. Harder to keep. We keep them as commit-time checks, not as a
            poster.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
          {PRINCIPLES.map((p, i) => (
            <li
              key={p.n}
              className={`relative flex flex-col rounded-[28px] border border-zinc-900/10 bg-white p-7 ${
                i % 3 === 0 ? 'md:col-span-7' : 'md:col-span-5'
              } ${i % 3 === 2 ? 'md:col-span-12' : ''}`}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Principle {p.n}
              </span>
              <h3 className="mt-3 max-w-[32ch] font-display text-[24px] font-medium leading-tight tracking-tight text-zinc-950">
                {p.title}
              </h3>
              <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-zinc-700">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StackSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-28">
        <div className="md:col-span-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            How it is built
          </p>
          <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
            Boring stack. Quiet infrastructure.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
            None of the choices below are clever. They are the smallest set of pieces that let one
            small team ship a real product with a real methodology under a real licence.
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex cursor-pointer items-center gap-2 self-start rounded-full border border-zinc-900/15 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            <GitHubGlyph className="h-4 w-4" />
            Read the source
          </a>
        </div>
        <ul className="md:col-span-7">
          {[
            ['App', 'Next.js 15 · React 19 · TypeScript'],
            ['Canvas', 'Konva · custom 52-tile asset set'],
            ['Collaboration', 'Yjs CRDT · WebSocket worker'],
            ['Data', 'Supabase Postgres · Storage · RLS'],
            ['Auth', 'Supabase Auth · PKCE'],
            ['Deploy', 'Railway · two services, web + worker'],
            ['AI', 'Claude — facilitator-side only'],
            ['Licence', 'Apache 2.0'],
          ].map(([label, body], i, arr) => (
            <li
              key={label}
              className={`grid grid-cols-12 items-baseline gap-6 border-t py-5 ${
                i === arr.length - 1 ? 'border-b' : ''
              } border-zinc-900/10`}
            >
              <span className="col-span-4 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500 md:col-span-3">
                {label}
              </span>
              <p className="col-span-8 text-[15px] text-zinc-800 md:col-span-9">{body}</p>
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
              Open source · always free
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[48px]">
              Use it. Break it. Tell us.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
              Every stage, every feature, no caps. BrickThink is Apache 2.0 — we run the hosted
              version because it is convenient, not because we plan to charge for it.
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
                href="/contact"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-900/15 bg-white px-5 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
