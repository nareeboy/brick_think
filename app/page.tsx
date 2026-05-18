// marketing landing — root route. cache-bust marker: bt-marketing-2026-05-11
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'BrickThink' };

const STAGES = [
  {
    n: '01',
    name: 'Skill-building',
    duration: '15 min',
    blurb: 'Warm-up. Learn the grid, learn to build with metaphor.',
  },
  {
    n: '02',
    name: 'Individual model',
    duration: '13 min',
    blurb: 'Each participant builds privately, then narrates.',
  },
  {
    n: '03',
    name: 'Shared model',
    duration: '30 min',
    blurb: 'Combine builds on a shared canvas. Negotiate. Decide.',
  },
  {
    n: '04',
    name: 'System model',
    duration: '25 min',
    blurb: 'Add connections, agents, forces. The system shows itself.',
  },
  {
    n: '05',
    name: 'Guiding principles',
    duration: '20 min',
    blurb: 'Extract written principles, anchored to the bricks that justify them.',
  },
];

const PERSONAS = [
  {
    role: 'Certified Serious Play facilitator',
    who: 'Independent or agency',
    line: 'Run paid client workshops remotely with the same outcomes you get in a room. Methodology fidelity, not a generic whiteboard.',
  },
  {
    role: 'Agile coach',
    who: 'Internal at enterprise',
    line: 'Retrospectives, working agreements, strategy sessions — across distributed teams. Two hours, real shared model, exportable record.',
  },
  {
    role: 'Leadership & L&D',
    who: 'Director, Head of People',
    line: 'Strategy alignment, team formation, cultural integration. Hands-on insight from people who would never speak up in a regular meeting.',
  },
];

const GITHUB_URL = 'https://github.com/nareeboy/brick_think';

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
      <main id="main">
        <Hero />
        <MethodologySection />
        <FeatureBento />
        <PersonasSection />
        <FidelitySection />
        <OpenSourceSection />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}

function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-900/5 bg-[#FAF7F1]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-zinc-900">
          <BrickGlyph />
          <span className="text-[15px] font-semibold tracking-tight">BrickThink</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          <a href="#methodology" className="text-sm text-zinc-600 hover:text-zinc-900">
            Methodology
          </a>
          <a href="#features" className="text-sm text-zinc-600 hover:text-zinc-900">
            Features
          </a>
          <a href="#open-source" className="text-sm text-zinc-600 hover:text-zinc-900">
            Open source
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="BrickThink on GitHub"
            className="hidden h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 md:inline-flex"
          >
            <GitHubGlyph className="h-4 w-4" />
          </a>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#140d07]">
      {/* video background */}
      <video
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        src="/lego-video.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
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
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
            Virtual Serious Play, remote-native
          </div>

          <h1 className="mt-6 font-display text-[44px] font-medium leading-[0.98] tracking-[-0.02em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] sm:text-[58px] md:text-[78px]">
            Build <span className="text-[#c0613d]">one model</span>
            <br />
            your team believes in.
          </h1>

          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-200/95 drop-shadow-[0_1px_12px_rgba(0,0,0,0.45)]">
            BrickThink runs the canonical five-stage Serious Play methodology online. Participants
            build 2D tile models, narrate the meaning out loud, and progress from individual story
            to shared system to written principles — without a box of bricks in sight.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-in"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-zinc-950 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] transition-all hover:bg-zinc-100 active:translate-y-[1px]"
            >
              Run a session free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#methodology"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.06] px-5 py-3 text-sm font-medium text-zinc-100 backdrop-blur transition-colors hover:bg-white/[0.12]"
            >
              How a session runs
            </a>
          </div>

          <dl className="mt-12 grid max-w-xl grid-cols-3 gap-x-6 border-t border-white/15 pt-6">
            {[
              ['57', 'brick pieces in the canon'],
              ['WCAG 2.2 AA', 'from day one'],
              ['Apache 2.0', 'open source'],
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
              Methodology fidelity, end to end.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
              The canonical etiquette is a first-class concept in the data model and the UI. Run all
              five, run a subset, or run a single stage as a focused exercise.
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
              A whole facilitator toolkit, not a whiteboard with extra steps.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            Pair with whatever video tool the team already uses. BrickThink is the build, the
            narration, the record — not the call.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6 md:gap-5">
          {/* canvas — large */}
          <FeatureCard
            className="md:col-span-4 md:row-span-2"
            label="canvas"
            title="A brick canvas built for serious work."
            body="Konva-rendered, infinite zoom, layer groups, lock, z-order, drag-rotate-recolour. Yjs CRDT under the hood — shared-model stages stay smooth with every facilitator and participant pointing at the same canvas."
          >
            <CanvasFeatureVisual />
          </FeatureCard>

          {/* AI assist */}
          <FeatureCard
            className="md:col-span-2"
            label="ai assist"
            title="Claude in the facilitator chair."
            body="Prompt suggestions from a topic, theme extraction across narrations, and candidate principles drafted from the system model. Always assistive — the facilitator approves before participants see anything."
            status="roadmap"
          >
            <PromptVisual />
          </FeatureCard>

          {/* Story capture */}
          <FeatureCard
            className="md:col-span-2"
            label="story capture"
            title="Narration is the artefact."
            body="Text, voice and video captured on the canvas, not in a separate tab. Auto-transcribed and indexed by participant and stage."
            status="roadmap"
          >
            <NarrationVisual />
          </FeatureCard>

          {/* Facilitator tooling */}
          <FeatureCard
            className="md:col-span-3"
            label="facilitator tooling"
            title="Sessions, stages, roster — wired end to end."
            body="Create a session, configure the five stages, invite an org, start each participant's model. Stage timer controls, spotlight a build, private notes and a pre-session consent checklist are next."
          >
            <ToolingVisual />
          </FeatureCard>

          {/* Exports */}
          <FeatureCard
            className="md:col-span-3"
            label="outputs"
            title="A session ends with a record, not a screenshot."
            body="PDF and DOCX session reports, per-stage PNG and SVG, narrated MP4 per participant, full JSON state for re-import, CSV of stories and principles. Canvas thumbnails ship today; the rest is next."
            status="roadmap"
          >
            <ExportsVisual />
          </FeatureCard>

          {/* Accessibility */}
          <FeatureCard
            className="md:col-span-6"
            label="accessibility"
            title="WCAG 2.2 AA is the bar, from day one."
            body="Reduced-motion respected. Keyboard navigation across modals and panels. Screen-reader-named brick canvas, colour-blind safe palette with pattern overlays, and voice-described builds rendered as text-equivalents are next on the bar to clear."
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
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
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

function Tile({
  className = '',
  w,
  h,
  color,
  studs,
}: {
  className?: string;
  w: string;
  h: string;
  color: string;
  studs: number;
}) {
  return (
    <div
      className={`absolute rounded-[5px] ${className}`}
      style={{
        width: w,
        height: h,
        background: color,
        boxShadow:
          'inset 0 0 0 1px rgba(0,0,0,0.22), 0 1px 0 rgba(255,255,255,0.35) inset, 0 6px 12px -8px rgba(60,30,15,0.4)',
      }}
    >
      <div className="flex h-full items-center justify-evenly px-[6%]">
        {Array.from({ length: studs }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.18)' }}
          />
        ))}
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
        <span className="inline-flex h-2 w-2 rounded-full bg-[#c0613d]" />
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
          <Dot className="h-1.5 w-1.5 bg-[#c0613d]" />
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
        <RosterPill name="Idris" color="#c0613d" />
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
    { ext: 'MP4', name: 'idris-stage-03-narration.mp4', meta: '00:48 · 12 MB' },
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
              Three audiences. One non-negotiable: methodology fidelity.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-zinc-600">
              The product exists for facilitators who can already run this in a room and want the
              remote version to feel like the same thing — not a compromise.
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
                  Persona {String(i + 1).padStart(2, '0')}
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
            BrickThink is a remote-native adaptation of the Serious Play methodology — published
            under{' '}
            <span className="font-mono text-[18px] text-[#d8a85d] md:text-[22px]">
              CC BY-SA 3.0
            </span>
            . The methodology can be referenced and taught. The trademark and the bricks of the
            other company cannot. We do not reference them, we do not copy them, and our 52-tile
            asset set is original.
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
              Free to use. Free to self-host. Apache&nbsp;2.0.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            BrickThink is built in the open. Use the hosted version, or run your own — the entire
            stack is on GitHub.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-zinc-900/10 bg-white p-7 text-zinc-900">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium tracking-tight">Hosted</p>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                brickthink.io
              </span>
            </div>
            <p className="mt-6 max-w-[42ch] text-[14px] leading-relaxed text-zinc-600">
              Sign in and run a session. No setup, no infrastructure, no bill. EU residency, WCAG
              2.2 AA, GDPR-aligned.
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
              <p className="text-[15px] font-medium tracking-tight">Self-host</p>
              <span className="rounded-full bg-[#c0613d] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white">
                Apache 2.0
              </span>
            </div>
            <p className="mt-6 max-w-[42ch] text-[14px] leading-relaxed text-zinc-300">
              Clone the repo, point it at your own Supabase, run it on Railway or anywhere Node
              runs. Same five-stage methodology, your data on your infrastructure. Issues and PRs
              welcome.
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
          Apache 2.0 · Built with Next.js, Supabase, Yjs and Konva · Methodology referenced under CC
          BY-SA 3.0
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
              Phase 0 in build · early access open
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[52px]">
              Run your first session free.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
              Two sessions a month, up to eight participants, all five stages. No card. We will tell
              you when Pro is ready, not before.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition-colors hover:bg-zinc-800 active:translate-y-[1px]"
              >
                Create a facilitator account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/app/my-designs"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-900/15 bg-white px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Open the app
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaBricks() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Tile className="left-[10%] top-[18%]" w="36%" h="14%" color="#c0613d" studs={6} />
      <Tile className="left-[26%] top-[44%]" w="22%" h="14%" color="#d8a85d" studs={4} />
      <Tile className="left-[58%] top-[28%]" w="20%" h="14%" color="#3b6f8a" studs={2} />
      <Tile className="left-[44%] top-[68%]" w="32%" h="14%" color="#1f1f1f" studs={4} />
      <Tile className="left-[16%] top-[72%]" w="22%" h="14%" color="#8a9a78" studs={4} />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-900/10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Link href="/" className="flex items-center gap-2 text-zinc-900">
            <BrickGlyph />
            <span className="text-[15px] font-semibold tracking-tight">BrickThink</span>
          </Link>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-zinc-600">
            A remote-native platform for the five-stage Serious Play methodology. Built on Next.js,
            Supabase and Claude.
          </p>
        </div>
        <div className="md:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Product</p>
          <ul className="mt-3 space-y-2 text-[13px] text-zinc-700">
            <li>
              <a href="#methodology" className="hover:text-zinc-950">
                Methodology
              </a>
            </li>
            <li>
              <a href="#features" className="hover:text-zinc-950">
                Features
              </a>
            </li>
            <li>
              <a href="#open-source" className="hover:text-zinc-950">
                Open source
              </a>
            </li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Get in</p>
          <ul className="mt-3 space-y-2 text-[13px] text-zinc-700">
            <li>
              <Link href="/sign-in" className="hover:text-zinc-950">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/app/my-designs" className="hover:text-zinc-950">
                Open the app
              </Link>
            </li>
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-zinc-950"
              >
                <GitHubGlyph className="h-3.5 w-3.5" />
                GitHub
              </a>
            </li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Status</p>
          <p className="mt-3 inline-flex items-center gap-2 text-[13px] text-zinc-700">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Phase 0 — Foundations · v0.1
          </p>
          <p className="mt-2 text-[13px] text-zinc-600">
            WCAG 2.2 AA. GDPR-aligned. EU residency on Pro and above.
          </p>
        </div>
      </div>
      <div className="border-t border-zinc-900/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-6 py-5 text-[12px] text-zinc-500 md:flex-row md:items-center">
          <div className="max-w-3xl space-y-1">
            <p>© BrickThink. The Serious Play methodology is referenced under CC BY-SA 3.0.</p>
            <p>
              LEGO, SERIOUS PLAY, IMAGINOPEDIA, the Minifigure and the Brick and Knob configurations
              are trademarks of the LEGO Group, which does not sponsor, authorize or endorse this
              product.
            </p>
          </div>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link href="/terms" className="hover:text-zinc-800">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-zinc-800">
              Privacy
            </Link>
            <span className="font-mono uppercase tracking-[0.16em]">v0.1 · 8 May 2026</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- primitives ---------------- */

function Dot({ className = '' }: { className?: string }) {
  return <span className={`inline-block rounded-full ${className}`} />;
}

function BrickGlyph() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#c0613d] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),0_2px_0_rgba(255,255,255,0.4)_inset]">
      <span className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-black/20" />
      <span className="absolute right-1/4 top-1.5 h-1.5 w-1.5 translate-x-1/2 rounded-full bg-black/20" />
    </span>
  );
}

function ArrowRight({ className = '' }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function GitHubGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.236 1.839 1.236 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.103.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z"
      />
    </svg>
  );
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
