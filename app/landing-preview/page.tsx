// Brand-guideline redesign of the marketing landing page. Review-only test
// route: noindex, absent from the sitemap allowlist. Once approved, this
// replaces app/page.tsx and the route is deleted.
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  ArrowRight,
  Footer,
  GITHUB_URL,
  GitHubGlyph,
  NavBar,
} from '@/components/marketing/MarketingChrome';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Landing page redesign preview',
    description: 'Internal preview of the brand-guideline landing page redesign.',
    path: '/landing-preview',
  }),
  robots: { index: false, follow: false },
};

// Named in full per the brand guidelines; labels and default durations match
// lib/sessions/stage-labels.ts (the product source of truth).
const STAGES = [
  {
    n: '01',
    name: 'Skill building',
    duration: '15 min',
    blurb:
      'Warm-up builds. Participants get fluent with the bricks before the real question arrives.',
  },
  {
    n: '02',
    name: 'Individual model',
    duration: '10 min',
    blurb: 'Each person answers the challenge with their own build, then narrates what it means.',
  },
  {
    n: '03',
    name: 'Shared model',
    duration: '30 min',
    blurb: 'The group merges the individual models into one model everyone can stand behind.',
  },
  {
    n: '04',
    name: 'System model',
    duration: '25 min',
    blurb: 'The shared model is placed in its landscape: agents, connections and outside forces.',
  },
  {
    n: '05',
    name: 'Guiding principles',
    duration: '20 min',
    blurb: 'The group draws out simple rules, each one anchored to the bricks that prove it.',
  },
];

const PLATFORM_ROWS = [
  {
    label: 'Story capture',
    title: 'The narration is the record.',
    body: 'Capture text, voice and video against the model itself. Spoken narration is transcribed, so any quote can be found later by person or by stage.',
  },
  {
    label: 'Facilitator tools',
    title: 'The session runs from one place.',
    body: 'Pick your stages, invite the group, run the timer, spotlight a build and keep private notes.',
  },
  {
    label: 'Outputs',
    title: 'Leave with a record, not a screenshot.',
    body: 'Export a PDF report or save each stage as an image. The whole session comes with you.',
  },
  {
    label: 'Accessibility',
    title: 'Built to WCAG 2.2 AA.',
    body: 'Keyboard operation throughout, screen readers name every brick, motion stops when a participant asks, and brick colours carry patterns for colour-blind participants.',
  },
  {
    label: 'AI assist',
    title: 'Prompts and themes, on your approval.',
    body: 'Build prompts from a topic, themes across narrations, draft principles from the system model. Nothing reaches the room until you say yes.',
    status: 'On the roadmap',
  },
];

const REPORT_PRICES = [
  { name: 'Session Report', per: '€9', month: '€29', year: '€290' },
  { name: 'Client-Ready Report', per: '€45', month: '€119', year: '€1,190' },
  { name: 'Full Findings Report', per: '€60', month: '€159', year: '€1,590' },
];

export default function LandingPreviewPage() {
  return (
    <div className="min-h-[100dvh] bg-[#FAF7F1] text-stone-900">
      <NavBar />
      <main id="main">
        <Hero />
        <MethodSection />
        <PlatformSection />
        <CostSection />
        <MethodPositionBand />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* warm terracotta tint over the cream ground, top-left */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_12%_0%,rgba(192,97,61,0.12),transparent_55%)]"
      />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 pb-20 pt-16 md:grid-cols-12 md:items-center md:gap-10 md:pb-28 md:pt-24">
        <div className="md:col-span-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Remote LEGO&reg; SERIOUS PLAY&reg; workshops
          </p>

          <h1 className="mt-6 font-display text-[42px] font-medium leading-[1.02] tracking-[-0.02em] text-stone-950 sm:text-[54px] md:text-[68px]">
            Run the full five-stage method with a team that is not in one room.
          </h1>

          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-stone-700">
            BrickThink gives every participant a set of 57 digital bricks on one shared canvas.
            People build, narrate what their build means, and move through the five stages in order:
            skill building, individual model, shared model, system model, guiding principles. It
            complements in-person delivery. It does not replace it.
          </p>

          <div className="mt-9">
            <Link
              href="/sign-in"
              className="group inline-flex items-center gap-2 rounded-full bg-stone-950 px-6 py-3.5 text-sm font-medium text-[#FAF7F1] transition-colors hover:bg-stone-800 active:translate-y-[1px]"
            >
              Run a workshop
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <dl className="mt-14 grid max-w-xl grid-cols-3 gap-x-6 border-t border-stone-900/10 pt-6">
            {[
              ['57 bricks', 'in the digital set'],
              ['20 templates', 'scenario library'],
              ['Apache 2.0', 'free to self-host'],
            ].map(([val, label]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">
                  {label}
                </dt>
                <dd className="mt-1 text-[15px] font-medium text-stone-900">{val}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="md:col-span-5">
          <HeroCanvas />
        </div>
      </div>
    </section>
  );
}

// Product-surface imagery: the canvas with bricks, not people. Organic brick
// placement over a rigid grid substrate, per the structured/freeform rule.
const HERO_BRICKS = [
  {
    src: '/bricks/flat-1-black-large-left.png',
    left: '12%',
    top: '58%',
    width: '46%',
    ratio: 300 / 190,
  },
  {
    src: '/bricks/block-red-medium-left.png',
    left: '18%',
    top: '42%',
    width: '25%',
    ratio: 180 / 156,
  },
  {
    src: '/bricks/block-yellow-medium.png',
    left: '40%',
    top: '34%',
    width: '25%',
    ratio: 180 / 156,
  },
  {
    src: '/bricks/block-navy-medium-left.png',
    left: '58%',
    top: '50%',
    width: '25%',
    ratio: 180 / 156,
  },
  { src: '/bricks/piece-head.png', left: '66%', top: '14%', width: '16%', ratio: 150 / 161 },
  { src: '/bricks/piece-body.png', left: '66%', top: '29%', width: '16%', ratio: 150 / 158 },
  { src: '/bricks/flower-pink-small.png', left: '18%', top: '18%', width: '13%', ratio: 100 / 94 },
];

function HeroCanvas() {
  return (
    <div
      className="relative aspect-[4/5] w-full overflow-hidden rounded-[28px] border border-stone-900/10 bg-[#FDFAF4] shadow-[0_30px_60px_-40px_rgba(60,30,15,0.35)] sm:aspect-[5/4] md:aspect-[4/5]"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(60,30,15,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(60,30,15,0.05) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
      aria-hidden="true"
    >
      {HERO_BRICKS.map((b) => (
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
      <div className="absolute left-4 top-4 rounded-full border border-stone-900/10 bg-white/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-600">
        Shared model · stage 03
      </div>
    </div>
  );
}

function MethodSection() {
  return (
    <section aria-labelledby="method-heading" className="border-t border-stone-900/10">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
              The five stages
            </p>
            <h2
              id="method-heading"
              className="mt-3 font-display text-[32px] font-medium leading-[1.05] tracking-[-0.015em] text-stone-950 md:text-[42px]"
            >
              Five stages, in the order the method sets.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-stone-600">
              Run all five, or one stage as a focused exercise. The order, the rules and the default
              timings follow the method as it is taught. The method itself is open under CC BY-SA
              3.0.
            </p>
          </div>
          <ol className="md:col-span-8">
            {STAGES.map((s, i) => (
              <li
                key={s.n}
                className={`grid grid-cols-12 items-baseline gap-6 border-t py-6 ${
                  i === STAGES.length - 1 ? 'border-b' : ''
                } border-stone-900/10`}
              >
                <span className="col-span-2 font-mono text-[12px] tabular-nums text-stone-500 md:col-span-1">
                  {s.n}
                </span>
                <div className="col-span-10 md:col-span-7">
                  <p className="text-[20px] font-medium tracking-tight text-stone-950">{s.name}</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-stone-600">{s.blurb}</p>
                </div>
                <span className="col-span-12 font-mono text-[11px] uppercase tracking-[0.16em] text-stone-500 md:col-span-4 md:text-right">
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

function PlatformSection() {
  return (
    <section aria-labelledby="platform-heading" className="border-t border-stone-900/10">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
              The platform
            </p>
            <h2
              id="platform-heading"
              className="mt-3 font-display text-[32px] font-medium leading-[1.05] tracking-[-0.015em] text-stone-950 md:text-[42px]"
            >
              A canvas built for the work, not a whiteboard with bricks on it.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-stone-600">
              Everyone drags, turns and recolours bricks on the same canvas, in real time. Bring
              your own video call: BrickThink handles the bricks, the narration and the record.
            </p>
            <div className="mt-8 hidden md:block">
              <MiniCanvas />
            </div>
          </div>
          <ul className="md:col-span-7">
            {PLATFORM_ROWS.map((row, i) => (
              <li
                key={row.label}
                className={`grid grid-cols-12 gap-4 border-t py-6 ${
                  i === PLATFORM_ROWS.length - 1 ? 'border-b' : ''
                } border-stone-900/10`}
              >
                <p className="col-span-12 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500 md:col-span-3">
                  {row.label}
                </p>
                <div className="col-span-12 md:col-span-9">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-[19px] font-medium tracking-tight text-stone-950">
                      {row.title}
                    </h3>
                    {row.status ? (
                      <span className="rounded-full border border-stone-900/10 bg-white px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-stone-600">
                        {row.status}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 max-w-[58ch] text-[14px] leading-relaxed text-stone-600">
                    {row.body}
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

const MINI_BRICKS = [
  {
    src: '/bricks/block-green-medium-left.png',
    left: '10%',
    top: '38%',
    width: '26%',
    ratio: 180 / 156,
  },
  {
    src: '/bricks/block-pink-medium-right.png',
    left: '38%',
    top: '30%',
    width: '26%',
    ratio: 180 / 156,
  },
  {
    src: '/bricks/corner-orange-small.png',
    left: '66%',
    top: '46%',
    width: '14%',
    ratio: 100 / 98,
  },
  {
    src: '/bricks/flat-1-black-large-left.png',
    left: '18%',
    top: '62%',
    width: '42%',
    ratio: 300 / 190,
  },
];

function MiniCanvas() {
  return (
    <div
      className="relative aspect-[16/9] w-full max-w-md overflow-hidden rounded-[24px] border border-stone-900/10 bg-[#FDFAF4]"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(60,30,15,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(60,30,15,0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
      aria-hidden="true"
    >
      {MINI_BRICKS.map((b) => (
        <span
          key={b.src}
          className="absolute drop-shadow-[0_5px_8px_rgba(60,30,15,0.16)]"
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
    </div>
  );
}

function CostSection() {
  return (
    <section aria-labelledby="cost-heading" className="border-t border-stone-900/10 bg-[#F4E9DB]">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
              What it costs
            </p>
            <h2
              id="cost-heading"
              className="mt-3 font-display text-[32px] font-medium leading-[1.05] tracking-[-0.015em] text-stone-950 md:text-[42px]"
            >
              Free to run. Paid for optional reports.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-stone-700">
              The software is free and open source under Apache 2.0, and self-hosting costs nothing.
              Running workshops on brickthink.io is also free. The hosted instance charges for three
              optional AI-produced deliverables. The source is on{' '}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-stone-900 underline decoration-stone-900/30 underline-offset-4 transition-colors hover:decoration-stone-900"
              >
                <GitHubGlyph className="h-3.5 w-3.5" />
                GitHub
              </a>
              .
            </p>
          </div>

          <div className="md:col-span-7">
            {/* Disclosure sits above the prices, per the candour placement rule. */}
            <div className="rounded-[24px] border border-stone-900/10 bg-[#FAF7F1] p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
                A correction we owe you
              </p>
              <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-stone-800">
                We launched saying free forever, no paid tier. We were wrong about what running the
                hosted service costs. The software is still free and open source; the hosted AI
                services are now paid.
              </p>
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-stone-900/10 bg-white">
              <div className="grid grid-cols-12 gap-2 px-6 pb-2 pt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">
                <span className="col-span-6">Deliverable</span>
                <span className="col-span-2 text-right">Per session</span>
                <span className="col-span-2 text-right">Monthly</span>
                <span className="col-span-2 text-right">Yearly</span>
              </div>
              {REPORT_PRICES.map((r) => (
                <div
                  key={r.name}
                  className="grid grid-cols-12 items-baseline gap-2 border-t border-stone-900/10 px-6 py-4"
                >
                  <span className="col-span-6 text-[15px] font-medium text-stone-900">
                    {r.name}
                  </span>
                  <span className="col-span-2 text-right font-mono text-[14px] tabular-nums text-stone-800">
                    {r.per}
                  </span>
                  <span className="col-span-2 text-right font-mono text-[14px] tabular-nums text-stone-800">
                    {r.month}
                  </span>
                  <span className="col-span-2 text-right font-mono text-[14px] tabular-nums text-stone-800">
                    {r.year}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">
              Prices as published on the pricing page
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MethodPositionBand() {
  return (
    <section className="bg-[#140d07] text-stone-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-24">
        <div className="md:col-span-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-400">
            What this is, and is not
          </p>
        </div>
        <div className="md:col-span-8">
          <p className="font-display text-[24px] font-normal leading-[1.3] tracking-[-0.01em] md:text-[30px]">
            BrickThink removes the same-room constraint. It does not change the method, and it does
            not replace certified facilitation or the value of building in the same room. The LEGO
            name and brick designs belong to the LEGO Group, so our 57 bricks are our own designs.
          </p>
        </div>
      </div>
    </section>
  );
}
