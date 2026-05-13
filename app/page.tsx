// marketing landing — root route. cache-bust marker: bt-marketing-2026-05-11
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { BrickCanvasMockup } from '@/components/marketing/brick-canvas-mockup';

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

const TIERS = [
  {
    name: 'Free',
    price: '£0',
    cadence: '/month',
    line: '2 sessions, up to 8 participants. Sync only.',
    cta: 'Start free',
    href: '/sign-in',
  },
  {
    name: 'Pro',
    price: 'TBC',
    cadence: '/month',
    line: 'Unlimited sessions. Async + AI summaries. Full prompt library.',
    cta: 'Join the beta',
    href: '/sign-in',
    accent: true,
  },
  {
    name: 'Team',
    price: 'TBC',
    cadence: '/seat',
    line: 'Co-facilitation, shared library, branded exports, SSO.',
    cta: 'Talk to us',
    href: '/sign-in',
  },
];

interface HomePageProps {
  searchParams: Promise<{ code?: string; error_description?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { code, error_description } = await searchParams;
  if (code) {
    const params = new URLSearchParams({ code, next: '/app/designs' });
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
        <PricingSection />
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
          <a href="#pricing" className="text-sm text-zinc-600 hover:text-zinc-900">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden text-sm text-zinc-600 hover:text-zinc-900 sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Open the app
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-900/5">
      <GrainOverlay />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 pb-20 pt-14 md:grid-cols-12 md:gap-10 md:pb-28 md:pt-20 lg:gap-14">
        <div className="md:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 backdrop-blur">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
            Virtual Serious Play, remote-native
          </div>

          <h1 className="mt-6 text-[44px] font-semibold leading-[1.02] tracking-tighter text-zinc-950 sm:text-[58px] md:text-[72px]">
            Five stages.
            <br />
            Two hours.
            <br />
            <span className="text-[#c0613d]">One model</span> your team
            <br className="hidden md:block" /> actually believes in.
          </h1>

          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-600">
            BrickThink runs the canonical five-stage Serious Play methodology online. Participants
            build 2D tile models, narrate the meaning out loud, and progress from individual story
            to shared system to written principles — without a box of bricks in sight.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-in"
              className="group inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition-all hover:bg-zinc-800 active:translate-y-[1px]"
            >
              Run a session free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#methodology"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-900/15 bg-white/40 px-5 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-white/80"
            >
              How a session runs
            </a>
          </div>

          <dl className="mt-12 grid max-w-xl grid-cols-3 gap-x-6 border-t border-zinc-900/10 pt-6">
            {[
              ['52', 'tile types in the canon'],
              ['WCAG 2.2 AA', 'from day one'],
              ['Sync · Async · Hybrid', 'session modes'],
            ].map(([val, label]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  {label}
                </dt>
                <dd className="mt-1 text-[15px] font-medium text-zinc-900">{val}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="md:col-span-5">
          <div className="relative md:translate-y-2">
            <FloatingBadge className="-left-3 -top-3 z-10">Live cursors</FloatingBadge>
            <FloatingBadge className="-right-2 top-1/2 z-10">CRDT shared canvas</FloatingBadge>
            <BrickCanvasMockup />
            <FloatingBadge className="-left-2 -bottom-3 z-10">Narration captured</FloatingBadge>
          </div>
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
              className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl"
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
                <span className="col-span-2 font-mono text-[12px] tabular-nums tracking-tight text-zinc-400 md:col-span-1">
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
              className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl"
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
            title="A 2D tile canvas built for serious work."
            body="Konva-rendered grid up to 128×128. Place, rotate, recolour, group, lock. Z-ordered for stacked builds. Yjs CRDT under the hood means 25 cursors stay smooth on a shared model."
          >
            <CanvasFeatureVisual />
          </FeatureCard>

          {/* AI assist */}
          <FeatureCard
            className="md:col-span-2"
            label="ai assist"
            title="Claude in the facilitator chair."
            body="Prompt suggestions from a topic, theme extraction across narrations, and candidate principles drafted from the system model. Always assistive — facilitator approves before participants see it."
          >
            <PromptVisual />
          </FeatureCard>

          {/* Story capture */}
          <FeatureCard
            className="md:col-span-2"
            label="story capture"
            title="Narration is the artefact."
            body="Text, voice, video — captured on the canvas, not in a separate tab. Auto-transcribed. Indexed by participant and stage."
          >
            <NarrationVisual />
          </FeatureCard>

          {/* Facilitator tooling */}
          <FeatureCard
            className="md:col-span-3"
            label="facilitator tooling"
            title="Stage controller, prompt library, roster, timer."
            body="Pre-seeded canonical prompts. Pause, extend, rollback a stage. Spotlight a build. Private notes panel. Pre-session checklist for consent and accessibility."
          >
            <ToolingVisual />
          </FeatureCard>

          {/* Exports */}
          <FeatureCard
            className="md:col-span-3"
            label="outputs"
            title="A session ends with a record, not a screenshot."
            body="PDF and DOCX session reports. Per-stage PNG and SVG. Narrated MP4 per participant. Full JSON state for re-import. CSV of stories and principles."
          >
            <ExportsVisual />
          </FeatureCard>

          {/* Accessibility */}
          <FeatureCard
            className="md:col-span-6"
            label="accessibility"
            title="WCAG 2.2 AA is a hard requirement, not a roadmap item."
            body="Keyboard-navigable canvas. Screen-reader names, positions and colours per brick. Voice-described builds rendered as a text-equivalent artefact alongside visual ones. Colour-blind safe palette with pattern overlays. Reduced-motion mode."
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
  children,
}: {
  className?: string;
  label: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[28px] border border-zinc-900/10 bg-white p-7 transition-shadow duration-300 hover:shadow-[0_30px_60px_-30px_rgba(60,30,15,0.25)] ${className}`}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <h3 className="mt-3 max-w-[28ch] text-[22px] font-semibold leading-tight tracking-tight text-zinc-950">
        {title}
      </h3>
      <p className="mt-3 max-w-[42ch] text-[14px] leading-relaxed text-zinc-600">{body}</p>
      {children ? <div className="mt-7 flex-1">{children}</div> : null}
    </article>
  );
}

function CanvasFeatureVisual() {
  return (
    <div
      className="relative h-full min-h-[220px] overflow-hidden rounded-2xl border border-zinc-900/10 bg-[#FBF7F1]"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(60,30,15,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(60,30,15,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
      aria-hidden="true"
    >
      <Tile className="left-[8%] top-[20%]" w="22%" h="14%" color="#c0613d" studs={4} />
      <Tile className="left-[12%] top-[40%]" w="34%" h="18%" color="#d8a85d" studs={6} />
      <Tile className="left-[40%] top-[24%]" w="14%" h="14%" color="#3b6f8a" studs={2} />
      <Tile className="left-[58%] top-[50%]" w="28%" h="14%" color="#8a9a78" studs={4} />
      <Tile className="left-[64%] top-[18%]" w="14%" h="14%" color="#5b3a8a" studs={2} />
      <Tile className="left-[36%] top-[70%]" w="44%" h="12%" color="#1f1f1f" studs={6} />

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
              className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl"
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
          <p className="text-[22px] font-medium leading-snug tracking-tight md:text-[26px]">
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

function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Pricing
            </p>
            <h2
              id="pricing-heading"
              className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl"
            >
              Per facilitator seat. Participants are free.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            Pro and Team pricing are in market research. Free tier stays free. Existing seats are
            grandfathered.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`flex flex-col rounded-3xl border p-7 ${
                t.accent
                  ? 'border-zinc-900 bg-zinc-950 text-zinc-100'
                  : 'border-zinc-900/10 bg-white text-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-medium tracking-tight">{t.name}</p>
                {t.accent ? (
                  <span className="rounded-full bg-[#c0613d] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white">
                    Recommended
                  </span>
                ) : null}
              </div>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight">{t.price}</span>
                <span
                  className={`font-mono text-[11px] uppercase tracking-[0.16em] ${
                    t.accent ? 'text-zinc-400' : 'text-zinc-500'
                  }`}
                >
                  {t.cadence}
                </span>
              </div>
              <p
                className={`mt-3 text-[14px] leading-relaxed ${
                  t.accent ? 'text-zinc-300' : 'text-zinc-600'
                }`}
              >
                {t.line}
              </p>
              <Link
                href={t.href}
                className={`mt-8 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                  t.accent
                    ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                    : 'border border-zinc-900/15 bg-white text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                {t.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          Enterprise tier available — SAML SSO, audit log, DPA, custom retention. Contact us.
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
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-zinc-950 md:text-[44px]">
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
                href="/app"
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
              <a href="#pricing" className="hover:text-zinc-950">
                Pricing
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
              <Link href="/app" className="hover:text-zinc-950">
                Open the app
              </Link>
            </li>
            <li>
              <Link href="/join/demo" className="hover:text-zinc-950">
                Join with code
              </Link>
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
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-6 py-5 text-[12px] text-zinc-500 md:flex-row md:items-center">
          <p>© BrickThink. The Serious Play methodology is referenced under CC BY-SA 3.0.</p>
          <p className="font-mono uppercase tracking-[0.16em]">v0.1 · 8 May 2026</p>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- primitives ---------------- */

function FloatingBadge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`absolute hidden items-center gap-1.5 rounded-full border border-zinc-900/10 bg-white/95 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-700 shadow-[0_8px_20px_-12px_rgba(60,30,15,0.35)] backdrop-blur md:inline-flex ${className}`}
    >
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
      {children}
    </span>
  );
}

function Dot({ className = '' }: { className?: string }) {
  return <span className={`inline-block rounded-full ${className}`} />;
}

function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 0%, rgba(192,97,61,0.08), transparent 40%), radial-gradient(circle at 90% 30%, rgba(59,111,138,0.06), transparent 35%)',
      }}
    />
  );
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
