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
    title: 'Method first. Features second.',
    body: 'A whiteboard with brick pictures on it is not LSP. The five stages, the story, and the rules are built right into the product. We say no to features that water them down.',
  },
  {
    n: '02',
    title: 'Open by default.',
    body: 'The code is open. The data model is plain. Run your own copy and you never have to talk to us. We earn the hosted version on ease, not lock-in.',
  },
  {
    n: '03',
    title: 'Accessibility ships with the feature.',
    body: 'Every person in the room uses the same canvas. Works with a keyboard. Works with a screen reader. Stops the motion if you ask. Colour-blind safe with patterns.',
  },
  {
    n: '04',
    title: 'Quiet product. Loud sessions.',
    body: 'The screen should fade away during a session. You look at your people and the shared model. Not at the toolbar.',
  },
];

const ORIGINS = [
  {
    label: 'The problem',
    body: 'LSP was made for a room. Most online tools either drop the method (a blank whiteboard) or drop the bricks (a fancy video call). We wanted both.',
  },
  {
    label: 'The bet',
    body: 'A timed five-stage flow plus a flat brick canvas keeps the method whole. No LEGO® bricks. No LEGO® name. Same outcomes.',
  },
  {
    label: 'Where we are',
    body: 'Still early. The five stages work. The canvas works. Live editing works. Exports, AI help, and voice notes are coming. Honest dates, not vapour.',
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
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#a8482a]" />
            About BrickThink
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[78px]">
            We build one tool.
            <br />
            We build it <span className="text-[#a8482a]">right</span>.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            BrickThink runs LSP workshops online. People said the method only works in a room. We
            disagreed. So we built this. With care, not with another whiteboard.
          </p>
        </div>
        <aside className="md:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            {[
              ['Building', 'Where we are'],
              ['Apache 2.0', 'Code licence'],
              ['CC BY-SA 3.0', 'Method licence'],
              ['EU', 'Where data sits'],
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
            LSP works online — <span className="text-[#d8a85d]">only if</span> the tool stops trying
            to be a whiteboard. The canvas, the story, the order, and the timer all have to be built
            in. What we leave out matters more than what we put in.
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
              Why we built this.
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
            Easy to write. Hard to live by. We check ourselves on every code change. Not on a
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
            Boring tech. On purpose.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
            Nothing clever below. Just the smallest pieces a small team needs to ship a real tool,
            with a real method, under a real licence.
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
              All stages. All features. No caps. We will never charge for this. The hosted site is
              here because it is easier than running your own.
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
