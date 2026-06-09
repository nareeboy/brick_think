// marketing landing — root route. cache-bust marker: bt-marketing-2026-05-19
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  ArrowRight,
  ArrowUpRight,
  CtaBricks,
  Footer,
  GITHUB_URL,
  GitHubGlyph,
  NavBar,
} from '@/components/marketing/MarketingChrome';
import { HeroVideo } from '@/components/marketing/HeroVideo';
import { PricingTiers } from '@/components/marketing/PricingTiers';

export const metadata: Metadata = { title: 'BrickThink' };

const LSP_DACH_EVENT_URL =
  'https://www.linkedin.com/events/2-treffenderlego-seriousplay-co7467623386521821185/';

const STAGES = [
  {
    n: '01',
    name: 'Skill-building',
    duration: '15 min',
    blurb: 'Warm up. Get used to the bricks and how to build a small idea.',
  },
  {
    n: '02',
    name: 'Individual model',
    duration: '13 min',
    blurb: 'Each person builds alone. Then they share what it means.',
  },
  {
    n: '03',
    name: 'Shared model',
    duration: '30 min',
    blurb: 'Combine the builds on one canvas. Talk. Decide together.',
  },
  {
    n: '04',
    name: 'System model',
    duration: '25 min',
    blurb: 'Add links and outside forces. Now you see how it all fits.',
  },
  {
    n: '05',
    name: 'Guiding principles',
    duration: '20 min',
    blurb: 'Pull out clear rules. Each one points to the bricks that prove it.',
  },
];

const PERSONAS = [
  {
    role: 'Certified LSP facilitator',
    who: 'Solo or agency',
    line: 'Run your paid client workshops online. Same outcomes as the room. Not a blank whiteboard with bricks pasted on it.',
  },
  {
    role: 'Agile coach',
    who: 'Inside a big company',
    line: 'Run retros, working agreements, and strategy sessions with teams in different cities. Two hours, one shared model, a record you can keep.',
  },
  {
    role: 'Head of People or L&D',
    who: 'Director, Head of People',
    line: 'Plan strategy. Form new teams. Settle a new culture. Hear from the quiet people who would never speak up in a normal meeting.',
  },
];

interface HomePageProps {
  searchParams: Promise<{ code?: string; error_description?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { code, error_description } = await searchParams;
  if (code) {
    const params = new URLSearchParams({ code, next: '/app/my-designs' });
    redirect(`/auth/callback?${params.toString()}`);
  }
  if (error_description) {
    redirect(`/sign-in?error=${encodeURIComponent(error_description)}`);
  }

  return (
    <div className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <NavBar />
      <EventBanner />
      <main id="main">
        <Hero />
        <MethodologySection />
        <FeatureBento />
        <PersonasSection />
        <FidelitySection />
        <OpenSourceSection />
        <PricingTiers />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}

function EventBanner() {
  return (
    <aside
      aria-label="Upcoming live demo"
      className="relative z-20 border-b border-white/10 bg-[#140d07]"
    >
      <a
        href={LSP_DACH_EVENT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group block transition-colors hover:bg-white/[0.03]"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-x-5 gap-y-2 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center">
            <span className="mt-px inline-flex shrink-0 items-center gap-2 rounded-full border border-[#a8482a]/40 bg-[#a8482a]/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#e7a282] sm:mt-0">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a8482a] opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#a8482a]" />
              </span>
              Live demo
            </span>
            <p className="text-[13.5px] leading-snug text-zinc-300">
              <span className="font-medium text-white">We&rsquo;re demoing BrickThink</span> at the
              2nd LEGO&reg; SERIOUS PLAY&reg; Community DACH meetup
              <span className="text-zinc-400">
                {' '}
                &middot; Wed 24 Jun 2026, 19:00&ndash;20:30 CEST &middot; Online
              </span>
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-zinc-950 transition-colors group-hover:bg-zinc-100 sm:self-auto">
            Reserve your spot
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </a>
    </aside>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#140d07]">
      {/* video background — playback is JS-gated on prefers-reduced-motion
          (see HeroVideo) to satisfy WCAG 2.2.2; the CSS reduced-motion reset
          does not stop <video>. */}
      <HeroVideo
        src="/lego-video.mp4"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      {/* base dark overlay — solid at top, fades to transparent at the bottom so it dissolves with the video */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-[#140d07]/70 via-[#140d07]/45 via-55% to-transparent"
      />
      {/* asymmetric left-side darkening for headline legibility — also fades out at the bottom */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(20,13,7,0.55),rgba(20,13,7,0.25)_45%,transparent_75%)] [mask-image:linear-gradient(to_bottom,black_55%,transparent_95%)]"
      />
      {/* terracotta wash, top-left, to tie hero to brand palette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_8%,rgba(192,97,61,0.20),transparent_55%)]"
      />
      {/* bottom fade — long, three-stop blend straight into the cream methodology section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-b from-transparent via-[#FAF7F1]/55 to-[#FAF7F1]"
      />
      <div className="relative mx-auto grid min-h-[115dvh] max-w-7xl grid-cols-1 px-6 pb-48 pt-20 md:grid-cols-12 md:items-center md:gap-10 md:pb-56 md:pt-28">
        <div className="md:col-span-8 lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-200 backdrop-blur">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#a8482a]" />
            Run your LSP workshop online
          </div>

          <h1 className="mt-6 font-display text-[44px] font-medium leading-[0.98] tracking-[-0.02em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] sm:text-[58px] md:text-[78px]">
            Build <span className="text-[#a8482a]">one model</span>
            <br />
            your team believes in, <span className="text-[#a8482a]">remotely</span>.
          </h1>

          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-200/95 drop-shadow-[0_1px_12px_rgba(0,0,0,0.45)]">
            Finally, people who work remotely can take part in real LSP workshops. They build. They
            share what each build means. Five stages, in order, the same flow as the room. No box of
            bricks needed. Not a replacement for being in the room together—an option for when you
            can&rsquo;t be.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-in"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-zinc-950 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] transition-all hover:bg-zinc-100 active:translate-y-[1px]"
            >
              Run your first session free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#methodology"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.06] px-5 py-3 text-sm font-medium text-zinc-100 backdrop-blur transition-colors hover:bg-white/[0.12]"
            >
              See how a session runs
            </a>
          </div>

          <dl className="mt-12 grid max-w-xl grid-cols-3 gap-x-6 border-t border-white/15 pt-6">
            {[
              ['57', 'brick pieces, free to use'],
              ['Always free', 'no card, no caps'],
              ['Open source', 'run your own copy'],
            ].map(([val, label]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                  {label}
                </dt>
                <dd className="mt-1 text-[15px] font-medium text-zinc-50">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function MethodologySection() {
  return (
    <section
      id="methodology"
      aria-labelledby="methodology-heading"
      className="border-b border-zinc-900/5"
    >
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              The five stages
            </p>
            <h2
              id="methodology-heading"
              className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]"
            >
              All five stages. Done right.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
              Run all five. Run a few. Or run one as a focused exercise. The order, the rules, and
              the timing are the same as in the room.
            </p>
          </div>
          <ol className="md:col-span-8">
            {STAGES.map((s, i) => (
              <li
                key={s.n}
                className={`group grid grid-cols-12 items-baseline gap-6 border-t py-6 transition-colors hover:bg-white/40 ${
                  i === STAGES.length - 1 ? 'border-b' : ''
                } border-zinc-900/10`}
              >
                {/* WCAG 1.4.3 — was text-zinc-400 (2.56:1), bumped to text-zinc-500 for 4.83:1 on white */}
                <span className="col-span-2 font-mono text-[12px] tabular-nums tracking-tight text-zinc-500 md:col-span-1">
                  {s.n}
                </span>
                <div className="col-span-10 md:col-span-7">
                  <p className="text-[20px] font-medium tracking-tight text-zinc-950">{s.name}</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-600">{s.blurb}</p>
                </div>
                <span className="col-span-12 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500 md:col-span-4 md:text-right">
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

function FeatureBento() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="border-b border-zinc-900/5"
    >
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              What is in the room
            </p>
            <h2
              id="features-heading"
              className="mt-3 max-w-2xl font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]"
            >
              Built for facilitators. Not just a whiteboard.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            Use your own video tool. BrickThink handles the bricks, the story, and the record. Not
            the call.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6 md:gap-5">
          {/* canvas — large */}
          <FeatureCard
            className="md:col-span-4 md:row-span-2"
            label="canvas"
            title="A canvas built for the work."
            body="Drag, turn, and recolour bricks. Zoom in close, zoom out far. Everyone in the room sees the same canvas, in real time. No lag. No fight over who is editing."
          >
            <CanvasFeatureVisual />
          </FeatureCard>

          {/* AI assist */}
          <FeatureCard
            className="md:col-span-2"
            label="ai assist"
            title="An AI helper, on your side."
            body="Get build prompts from a topic. Spot themes across stories. Draft first-pass rules from the system model. Nothing reaches the room until you say yes."
            status="roadmap"
          >
            <PromptVisual />
          </FeatureCard>

          {/* Story capture */}
          <FeatureCard
            className="md:col-span-2"
            label="story capture"
            title="The story is the record."
            body="Capture text, voice, and video right on the canvas. We write it out for you. Find any quote by person or stage."
          >
            <NarrationVisual />
          </FeatureCard>

          {/* Facilitator tooling */}
          <FeatureCard
            className="md:col-span-3"
            label="facilitator tools"
            title="Set up a session in five minutes."
            body="Make a session. Pick your stages. Invite your group. Run the timer, spotlight a build, and keep private notes — all in one place."
          >
            <ToolingVisual />
          </FeatureCard>

          {/* Exports */}
          <FeatureCard
            className="md:col-span-3"
            label="outputs"
            title="Walk away with a record, not a screenshot."
            body="Export a PDF report. Save each stage as an image. Take the whole session with you — no lock-in."
          >
            <ExportsVisual />
          </FeatureCard>

          {/* Accessibility */}
          <FeatureCard
            className="md:col-span-6"
            label="accessibility"
            title="Works for every person in the room."
            body="Stops the motion if a person asks. Works with a keyboard. Screen readers name every brick. Our colours work for colour-blind people, with patterns to back them up."
          >
            <AccessibilityVisual />
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  className = '',
  label,
  title,
  body,
  status,
  children,
}: {
  className?: string;
  label: string;
  title: string;
  body: string;
  status?: 'roadmap';
  children?: React.ReactNode;
}) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[28px] border border-zinc-900/10 bg-white p-7 transition-shadow duration-300 hover:shadow-[0_30px_60px_-30px_rgba(60,30,15,0.25)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
        {status === 'roadmap' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-900/10 bg-zinc-50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#a8482a]" />
            On the roadmap
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 max-w-[28ch] text-[22px] font-semibold leading-tight tracking-tight text-zinc-950">
        {title}
      </h3>
      <p className="mt-3 max-w-[42ch] text-[14px] leading-relaxed text-zinc-600">{body}</p>
      {children ? <div className="mt-7 flex-1">{children}</div> : null}
    </article>
  );
}

const CANVAS_BRICKS = [
  {
    src: '/bricks/flat-1-black-large-left.png',
    left: '6%',
    top: '64%',
    width: '32%',
    ratio: 300 / 190,
  },
  {
    src: '/bricks/block-red-medium-left.png',
    left: '10%',
    top: '40%',
    width: '20%',
    ratio: 180 / 156,
  },
  {
    src: '/bricks/block-yellow-medium.png',
    left: '32%',
    top: '38%',
    width: '20%',
    ratio: 180 / 156,
  },
  {
    src: '/bricks/block-navy-medium-left.png',
    left: '54%',
    top: '46%',
    width: '20%',
    ratio: 180 / 156,
  },
  { src: '/bricks/piece-head.png', left: '40%', top: '8%', width: '13%', ratio: 150 / 161 },
  { src: '/bricks/piece-body.png', left: '40%', top: '22%', width: '13%', ratio: 150 / 158 },
  {
    src: '/bricks/corner-orange-small.png',
    left: '76%',
    top: '62%',
    width: '10%',
    ratio: 100 / 98,
  },
  { src: '/bricks/flower-pink-small.png', left: '74%', top: '24%', width: '10%', ratio: 100 / 94 },
];

function CanvasFeatureVisual() {
  return (
    <div
      className="relative h-full min-h-[260px] overflow-hidden rounded-2xl border border-zinc-900/10 bg-[#FBF7F1]"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(60,30,15,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(60,30,15,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
      aria-hidden="true"
    >
      {CANVAS_BRICKS.map((b) => (
        <span
          key={b.src}
          className="absolute drop-shadow-[0_6px_10px_rgba(60,30,15,0.18)]"
          style={{
            left: b.left,
            top: b.top,
            width: b.width,
            aspectRatio: b.ratio,
            backgroundImage: `url(${b.src})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
      ))}

      <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-900/10 bg-white/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600 backdrop-blur">
        <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />4
        cursors live
      </div>
    </div>
  );
}

function PromptVisual() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {[
        'Suggest 3 stage-2 prompts for a team coming off a failed launch.',
        'Cluster the 9 narrations from stage 3 into themes.',
        'Draft principles from the system model. Show source bricks.',
      ].map((p, i) => (
        <div
          key={p}
          className="flex items-start gap-2 rounded-xl border border-zinc-900/10 bg-zinc-50 p-3 text-[12px] leading-snug text-zinc-700"
        >
          <span className="mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-zinc-900 font-mono text-[9px] text-white">
            {i + 1}
          </span>
          <span>{p}</span>
        </div>
      ))}
    </div>
  );
}

function NarrationVisual() {
  return (
    <div className="rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4" aria-hidden="true">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
        <span className="inline-flex h-2 w-2 rounded-full bg-[#a8482a]" />
        recording · 00:42
      </div>
      <div className="mt-3 flex h-12 items-center gap-[3px]">
        {[
          6, 14, 22, 30, 18, 36, 42, 24, 28, 18, 30, 24, 14, 32, 26, 20, 30, 38, 22, 14, 28, 18, 24,
          16,
        ].map((bar, i) => (
          <span
            key={i}
            className="w-[4px] rounded-sm bg-zinc-800"
            style={{ height: `${bar}px`, opacity: 0.55 + (i % 5) * 0.08 }}
          />
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-snug text-zinc-700">
        “…the part I keep coming back to is the bridge between those two clusters — that is where
        the trust actually lives.”
      </p>
    </div>
  );
}

function ToolingVisual() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      <div className="flex items-center justify-between rounded-xl border border-zinc-900/10 bg-zinc-50 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5 text-[12px] text-zinc-700">
          <Dot className="h-1.5 w-1.5 bg-[#a8482a]" />
          Stage 03 — Shared model
        </div>
        <span className="font-mono text-[11px] tabular-nums text-zinc-500">17:42</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['Pause', 'Extend +5', 'Advance'].map((b, i) => (
          <button
            key={b}
            type="button"
            tabIndex={-1}
            className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              i === 2
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-900/10 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {b}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-zinc-900/10 bg-zinc-50 px-3.5 py-2.5">
        <RosterPill name="Maren" color="#3b6f8a" />
        <RosterPill name="Idris" color="#a8482a" />
        <RosterPill name="Yuki" color="#8a9a78" />
        <RosterPill name="Tomás" color="#5b3a8a" />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          +5
        </span>
      </div>
    </div>
  );
}

function RosterPill({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] text-zinc-700 ring-1 ring-zinc-900/10">
      <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}

function ExportsVisual() {
  const items: { ext: string; name: string; meta: string }[] = [
    { ext: 'PDF', name: 'session-report.pdf', meta: '24 pages · 4.2 MB' },
    { ext: 'JSON', name: 'session-state.json', meta: '1,284 nodes · 318 KB' },
    { ext: 'PNG', name: 'shared-model.png', meta: '3200×2400' },
  ];
  return (
    <div className="divide-y divide-zinc-900/10 rounded-2xl border border-zinc-900/10 bg-zinc-50">
      {items.map((it) => (
        <div key={it.name} className="flex items-center gap-3 px-4 py-2.5">
          <span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-zinc-900 font-mono text-[9px] font-medium tracking-wider text-white">
            {it.ext}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-zinc-800">{it.name}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              {it.meta}
            </p>
          </div>
          <ArrowDown className="h-3.5 w-3.5 text-zinc-500" />
        </div>
      ))}
    </div>
  );
}

function AccessibilityVisual() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-hidden="true">
      <div className="rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          Screen reader
        </p>
        <p className="mt-2 text-[13px] leading-snug text-zinc-800">
          “Brick 2×4, terracotta with diagonal hatch pattern, position B6, owned by Idris.”
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          Voice-described build
        </p>
        <p className="mt-2 text-[13px] leading-snug text-zinc-800">
          Spoken description is transcribed and presented as a text-equivalent artefact alongside
          the visual model.
        </p>
      </div>
      <div className="rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          Adjustable timer
        </p>
        <div className="mt-2 flex items-center gap-2">
          {['Strict', 'Standard', 'No pressure'].map((m, i) => (
            <span
              key={m}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                i === 1
                  ? 'bg-zinc-900 text-white'
                  : 'border border-zinc-900/10 bg-white text-zinc-700'
              }`}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonasSection() {
  return (
    <section aria-labelledby="personas-heading" className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Built for
            </p>
            <h2
              id="personas-heading"
              className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]"
            >
              Built for facilitators who take this work seriously.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
              You can run LSP in a room. You want the online version to feel the same — not a
              second-best. That is who this is for.
            </p>
          </div>
          <ul className="md:col-span-7">
            {PERSONAS.map((p, i) => (
              <li
                key={p.role}
                className={`grid grid-cols-12 gap-6 border-t py-7 ${
                  i === PERSONAS.length - 1 ? 'border-b' : ''
                } border-zinc-900/10`}
              >
                <span className="col-span-12 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 md:col-span-3">
                  Who it is for · {String(i + 1).padStart(2, '0')}
                </span>
                <div className="col-span-12 md:col-span-9">
                  <p className="text-[19px] font-medium tracking-tight text-zinc-950">{p.role}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                    {p.who}
                  </p>
                  <p className="mt-3 max-w-[58ch] text-[14px] leading-relaxed text-zinc-600">
                    {p.line}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FidelitySection() {
  return (
    <section className="border-b border-zinc-900/5 bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-24">
        <div className="md:col-span-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            What this is, and is not
          </p>
        </div>
        <div className="md:col-span-8">
          <p className="font-display text-[24px] font-normal leading-[1.25] tracking-[-0.01em] md:text-[30px]">
            BrickThink brings LSP online. The method is open{' '}
            <span className="font-mono text-[18px] text-[#d8a85d] md:text-[22px]">
              CC BY-SA 3.0
            </span>
            , so anyone can teach it. The LEGO® name and brick designs are not. So we made our own
            52 tiles. They look different. They feel right.
          </p>
        </div>
      </div>
    </section>
  );
}

function OpenSourceSection() {
  return (
    <section
      id="open-source"
      aria-labelledby="open-source-heading"
      className="border-b border-zinc-900/5"
    >
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Open source
            </p>
            <h2
              id="open-source-heading"
              className="mt-3 max-w-2xl font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]"
            >
              Our platform and virtual sessions are free to use. Always…
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            Running workshops is free — on our site or your own copy. You only pay for the
            deliverables we produce, below.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-zinc-900/10 bg-white p-7 text-zinc-900">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium tracking-tight">Use our site</p>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                brickthink.io
              </span>
            </div>
            <p className="mt-6 max-w-[42ch] text-[14px] leading-relaxed text-zinc-600">
              Sign in and run unlimited workshops — no setup, free to facilitate. Your data stays in
              the EU, built for screen readers from day one. You only pay if you want a deliverable
              we produce.
            </p>
            <Link
              href="/sign-in"
              className="mt-8 inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-zinc-900/15 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
            >
              Create a facilitator account
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex flex-col rounded-3xl border border-zinc-900 bg-zinc-950 p-7 text-zinc-100">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium tracking-tight">Run your own copy</p>
              <span className="rounded-full bg-[#a8482a] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white">
                Apache 2.0
              </span>
            </div>
            <p className="mt-6 max-w-[42ch] text-[14px] leading-relaxed text-zinc-300">
              Run it on your own servers. Your data, your rules. Same five stages. Bug reports and
              pull requests welcome.
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center justify-center gap-2 self-start rounded-full bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
            >
              <GitHubGlyph className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </div>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          Apache 2.0 · LSP method used under CC BY-SA 3.0
        </p>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="bg-[#FAF7F1]">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="relative overflow-hidden rounded-[32px] border border-zinc-900/10 bg-gradient-to-br from-[#FBF7F1] to-[#F2E8D8] p-10 md:p-14">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
            <CtaBricks />
          </div>
          <div className="relative max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Open source · always free
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[52px]">
              Run your first session free.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
              All stages. All features. No card. No caps. BrickThink is open source. We will never
              charge for it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-in"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition-colors hover:bg-zinc-800 active:translate-y-[1px]"
              >
                Create a facilitator account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- primitives ---------------- */

function Dot({ className = '' }: { className?: string }) {
  return <span className={`inline-block rounded-full ${className}`} />;
}

function ArrowDown({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </svg>
  );
}
