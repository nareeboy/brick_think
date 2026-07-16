import type { Metadata } from 'next';
import Link from 'next/link';

import {
  CtaBricks,
  GITHUB_URL,
  GitHubGlyph,
  MarketingShell,
} from '@/components/marketing/MarketingChrome';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Self-Host BrickThink | Open-Source LSP Platform',
  absoluteTitle: true,
  description:
    'Run your own BrickThink instance from source under Apache 2.0. Full five-stage LEGO® SERIOUS PLAY® platform. EU-ready, GDPR-aligned, WCAG 2.2 AA.',
  path: '/self-host',
});

const INCLUDED = [
  {
    n: '01',
    name: 'The full five-stage method',
    blurb:
      'Skill-building through guiding principles, in order, with stage controls and timers. Nothing is held back from the open-source build.',
  },
  {
    n: '02',
    name: 'The real-time brick canvas',
    blurb:
      'The shared canvas, all 52 brick tiles, live cursors, and breakout rooms — the same collaborative core that runs on brickthink.io.',
  },
  {
    n: '03',
    name: 'Story capture and exports',
    blurb:
      'Narration capture on the canvas, stage images, and session data exports. Your sessions, your records, on your disks.',
  },
  {
    n: '04',
    name: 'Accessibility built in',
    blurb:
      'WCAG 2.2 AA: keyboard-driven building, screen-reader-named bricks, colour-blind-safe palette with pattern backup, reduced-motion support.',
  },
];

const STACK = [
  ['Next.js', 'Web app — plain Node deploy, no proprietary runtime'],
  ['Supabase', 'Postgres, auth, and storage — hosted or self-managed'],
  ['Yjs', 'Real-time collaboration worker for the shared canvas'],
  ['Apache 2.0', 'Permissive licence — use it, change it, ship it'],
];

export default function SelfHostPage() {
  return (
    <MarketingShell>
      <Hero />
      <IncludedSection />
      <StackSection />
      <HostedSection />
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
            Self-host
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[74px]">
            Your servers. <span className="text-[#a8482a]">Your data.</span>
            <br />
            The whole platform.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            BrickThink is open source under Apache 2.0. Clone the repository, bring a Postgres
            database, and run the full five-stage LEGO® SERIOUS PLAY® platform on infrastructure you
            control. Self-hosting costs nothing and cuts no corners.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition-colors hover:bg-zinc-800 active:translate-y-[1px]"
            >
              <GitHubGlyph className="h-4 w-4" />
              View on GitHub
            </a>
            <Link
              href="/help"
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-900/15 bg-white px-5 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
            >
              Read the FAQ
            </Link>
          </div>
        </div>
        <aside className="md:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            {[
              ['Apache 2.0', 'Licence'],
              ['GDPR-aligned', 'Privacy posture'],
              ['WCAG 2.2 AA', 'Accessibility'],
              ['EU-ready', 'Data residency'],
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

function IncludedSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              What you get
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              Not a community edition. The edition.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
              The open-source repository is the same code that runs brickthink.io. No feature flags
              to unlock, no seat limits to buy off.
            </p>
          </div>
          <ol className="md:col-span-8">
            {INCLUDED.map((item, i) => (
              <li
                key={item.n}
                className={`grid grid-cols-12 items-baseline gap-6 border-t py-7 transition-colors hover:bg-white/50 ${
                  i === INCLUDED.length - 1 ? 'border-b' : ''
                } border-zinc-900/10`}
              >
                <span className="col-span-2 font-mono text-[12px] tabular-nums tracking-tight text-zinc-500 md:col-span-1">
                  {item.n}
                </span>
                <div className="col-span-10 md:col-span-11">
                  <p className="font-display text-[22px] font-medium tracking-tight text-zinc-950">
                    {item.name}
                  </p>
                  <p className="mt-2 max-w-[58ch] text-[14px] leading-relaxed text-zinc-700">
                    {item.blurb}
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

function StackSection() {
  return (
    <section className="border-b border-zinc-900/5 bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-24">
        <div className="md:col-span-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            The stack
          </p>
          <h2 className="mt-3 font-display text-[30px] font-medium leading-[1.05] tracking-[-0.015em] md:text-[38px]">
            Boring on purpose.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-400">
            Standard, well-documented pieces your ops team already knows. No exotic runtime, no
            vendor lock-in.
          </p>
        </div>
        <dl className="md:col-span-8">
          {STACK.map(([name, blurb], i) => (
            <div
              key={name}
              className={`grid grid-cols-12 items-baseline gap-6 border-t border-white/10 py-6 ${
                i === STACK.length - 1 ? 'border-b' : ''
              }`}
            >
              <dt className="col-span-12 font-display text-[20px] font-medium tracking-tight text-zinc-50 md:col-span-4">
                {name}
              </dt>
              <dd className="col-span-12 text-[14px] leading-relaxed text-zinc-400 md:col-span-8">
                {blurb}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HostedSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            The honest small print
          </p>
        </div>
        <div className="md:col-span-8 space-y-5 text-[15px] leading-relaxed text-zinc-700">
          <p>
            The platform — every stage, every canvas feature — is in the open repository. A small
            set of produced deliverables, such as AI-written session reports, are hosted services on
            brickthink.io and carry a per-session charge to cover what they cost us to run.
          </p>
          <p>
            Self-hosting gives you the complete workshop tool with no charge and no phoning home. If
            you later want a hosted deliverable, that is what{' '}
            <span className="font-mono text-[13px] text-[#a8482a]">brickthink.io</span> is for.
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
              Apache 2.0 · open source
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[48px]">
              Clone it. Run it. Own it.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
              Bug reports and pull requests welcome — the roadmap is public and the issues are open.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition-colors hover:bg-zinc-800 active:translate-y-[1px]"
              >
                <GitHubGlyph className="h-4 w-4" />
                Get the source
              </a>
              <Link
                href="/roadmap"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-900/15 bg-white px-5 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                See the roadmap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
