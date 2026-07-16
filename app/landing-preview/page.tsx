// Brand-guideline redesign of the marketing landing page, iteration 2.
// Review-only test route: noindex, absent from the sitemap allowlist. Fonts
// (Instrument Serif display, Manrope body) and the parchment/espresso palette
// are scoped to this page so the rest of the site is untouched; if approved
// they move into the global tokens with the promotion to app/page.tsx.
import type { Metadata } from 'next';
import { Instrument_Serif, Manrope } from 'next/font/google';
import Link from 'next/link';

import { HeroVideo } from '@/components/marketing/HeroVideo';
import {
  ArrowRight,
  Footer,
  GITHUB_URL,
  GitHubGlyph,
  NavBar,
} from '@/components/marketing/MarketingChrome';
import { pageMetadata } from '@/lib/seo/metadata';

const instrument = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Landing page redesign preview',
    description: 'Internal preview of the brand-guideline landing page redesign.',
    path: '/landing-preview',
  }),
  robots: { index: false, follow: false },
};

// Palette, scoped to this preview. Warm throughout per the warm-ground
// correction: parchment ground, espresso ink, terracotta as the sole accent.
const INK = '#26150A';
const PARCHMENT = '#F1E7D6';
const PAPER = '#FBF5EA';
const BODY = '#4A3A2E';
const LABEL = '#6B5645';
const TERRACOTTA = '#A8482A';
const ESPRESSO = '#1C1006';
const HAIRLINE = 'border-[#26150A]/15';

// Named in full per the brand guidelines; labels and default durations match
// lib/sessions/stage-labels.ts (the product source of truth).
const STAGES = [
  {
    n: '1',
    name: 'Skill building',
    duration: '15 min',
    blurb: 'Loosens hands and heads. Small builds teach the group to say things with bricks.',
  },
  {
    n: '2',
    name: 'Individual model',
    duration: '10 min',
    blurb: 'Everyone builds their own answer to the question. No consensus yet, and no hiding.',
  },
  {
    n: '3',
    name: 'Shared model',
    duration: '30 min',
    blurb: 'The group combines what matters from each build into one model it can agree on.',
  },
  {
    n: '4',
    name: 'System model',
    duration: '25 min',
    blurb:
      'The agreed model is set in its landscape: the people, forces and connections around it.',
  },
  {
    n: '5',
    name: 'Guiding principles',
    duration: '20 min',
    blurb: 'Simple rules are drawn from the system, each traceable to the bricks behind it.',
  },
];

const PLATFORM_ROWS = [
  {
    label: 'Story capture',
    title: 'Narration, kept.',
    body: 'Text, voice and video are captured against the model itself. Spoken words are transcribed, searchable by person and by stage.',
  },
  {
    label: 'Facilitator tools',
    title: 'One desk for the facilitator.',
    body: 'Stages, invitations, timers, spotlights and private notes sit in one place.',
  },
  {
    label: 'Outputs',
    title: 'The session leaves with you.',
    body: 'Export the report as a PDF and save any stage as an image. No lock-in.',
  },
  {
    label: 'Accessibility',
    title: 'Accessible by design.',
    body: 'Built to WCAG 2.2 AA: keyboard operation throughout, screen readers that name every brick, motion that stops on request, and patterns behind every brick colour.',
  },
  {
    label: 'AI assist',
    title: 'Suggestions wait for a yes.',
    body: 'Build prompts, narration themes and draft principles are prepared for the facilitator. Nothing reaches participants until approved.',
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
    <div
      className={`${manrope.className} min-h-[100dvh]`}
      style={{ backgroundColor: PARCHMENT, color: INK }}
    >
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
    <section className="relative isolate overflow-hidden" style={{ backgroundColor: ESPRESSO }}>
      {/* playback is JS-gated on prefers-reduced-motion and carries a visible,
          keyboard-focusable pause control, per the quiet-motion correction */}
      <HeroVideo
        src="/lego-video.mp4"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      {/* warm espresso overlay: solid at the top, dissolving toward the base */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-[#1C1006]/85 via-[#1C1006]/55 via-50% to-[#1C1006]/20"
      />
      {/* left-side deepening for headline legibility */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(28,16,6,0.65),rgba(28,16,6,0.3)_50%,transparent_80%)]"
      />
      {/* terracotta wash, upper left, tying the video to the palette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_10%,rgba(168,72,42,0.35),transparent_60%)]"
      />
      {/* long fade into the parchment ground below */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-b from-transparent via-[#F1E7D6]/60 to-[#F1E7D6]"
      />
      <div className="relative mx-auto grid min-h-[92dvh] max-w-7xl grid-cols-1 items-center px-6 pb-40 pt-20 md:grid-cols-12 md:gap-10 md:pb-48 md:pt-24">
        <div className="md:col-span-9 lg:col-span-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E8B39B]">
            Online LEGO&reg; SERIOUS PLAY&reg; workshops
          </p>

          <h1
            className={`${instrument.className} mt-6 text-[52px] leading-[1.0] tracking-[-0.01em] text-[#F7EFE2] sm:text-[68px] md:text-[88px]`}
          >
            The team builds its answer, one brick at a time.
          </h1>

          <p className="mt-7 max-w-[56ch] text-[17px] leading-relaxed text-[#EADFCE]">
            BrickThink runs the five-stage method on a live shared canvas: skill building,
            individual model, shared model, system model, guiding principles, in order. Every
            participant gets the same 57 bricks. Every model gets narrated. Remote sessions
            complement in-person delivery; they do not replace it.
          </p>

          <div className="mt-10">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#A8482A] px-7 py-4 text-[15px] font-semibold text-[#FBF5EA] transition-colors hover:bg-[#8F3B21] active:translate-y-[1px]"
            >
              Run a workshop
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <dl className="mt-14 grid max-w-xl grid-cols-3 gap-x-6 border-t border-white/20 pt-6">
            {[
              ['57 bricks', 'one set for everyone'],
              ['20 templates', 'scenario library'],
              ['Apache 2.0', 'free to self-host'],
            ].map(([val, label]) => (
              <div key={label}>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D9C9B4]">
                  {label}
                </dt>
                <dd className="mt-1 text-[15px] font-semibold text-[#F7EFE2]">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function MethodSection() {
  return (
    <section aria-labelledby="method-heading">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: LABEL }}
          >
            The method
          </p>
          <h2
            id="method-heading"
            className={`${instrument.className} mt-4 text-[40px] leading-[1.02] tracking-[-0.01em] md:text-[56px]`}
            style={{ color: INK }}
          >
            Five stages. The order is the point.
          </h2>
          <p className="mt-6 max-w-[58ch] text-[16px] leading-relaxed" style={{ color: BODY }}>
            A session can run all five stages or focus on one. The order, the rules and the default
            timings follow the method as it is taught. The method itself is published under CC BY-SA
            3.0.
          </p>
        </div>

        <ol className="mt-14">
          {STAGES.map((s, i) => (
            <li
              key={s.n}
              className={`grid grid-cols-12 items-center gap-4 border-t py-7 md:gap-8 ${
                i === STAGES.length - 1 ? 'border-b' : ''
              } ${HAIRLINE}`}
            >
              <span
                className={`${instrument.className} col-span-2 text-[56px] leading-none md:col-span-1 md:text-[72px]`}
                style={{ color: TERRACOTTA }}
                aria-hidden="true"
              >
                {s.n}
              </span>
              <div className="col-span-10 md:col-span-7">
                <h3 className="text-[22px] font-semibold tracking-tight" style={{ color: INK }}>
                  {s.name}
                </h3>
                <p
                  className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed"
                  style={{ color: BODY }}
                >
                  {s.blurb}
                </p>
              </div>
              <span
                className="col-span-12 text-[11px] font-semibold uppercase tracking-[0.18em] md:col-span-4 md:text-right"
                style={{ color: LABEL }}
              >
                default · {s.duration}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function PlatformSection() {
  return (
    <section aria-labelledby="platform-heading" className={`border-t ${HAIRLINE}`}>
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: LABEL }}
            >
              The platform
            </p>
            <h2
              id="platform-heading"
              className={`${instrument.className} mt-4 text-[38px] leading-[1.05] tracking-[-0.01em] md:text-[48px]`}
              style={{ color: INK }}
            >
              The canvas carries the session. Your video call carries the faces.
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed" style={{ color: BODY }}>
              Bricks drag, turn and recolour in real time for everyone at once. BrickThink keeps the
              builds and the narration; the meeting tool stays yours.
            </p>
            <div className="mt-10 hidden md:block">
              <MiniCanvas />
            </div>
          </div>
          <ul className="md:col-span-7">
            {PLATFORM_ROWS.map((row, i) => (
              <li
                key={row.label}
                className={`grid grid-cols-12 gap-4 border-t py-7 ${
                  i === PLATFORM_ROWS.length - 1 ? 'border-b' : ''
                } ${HAIRLINE}`}
              >
                <p
                  className="col-span-12 text-[10px] font-semibold uppercase tracking-[0.2em] md:col-span-3"
                  style={{ color: LABEL }}
                >
                  {row.label}
                </p>
                <div className="col-span-12 md:col-span-9">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-[20px] font-semibold tracking-tight" style={{ color: INK }}>
                      {row.title}
                    </h3>
                    {row.status ? (
                      <span
                        className="rounded-full border border-[#A8482A]/40 bg-[#A8482A]/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                        style={{ color: TERRACOTTA }}
                      >
                        {row.status}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className="mt-2 max-w-[58ch] text-[15px] leading-relaxed"
                    style={{ color: BODY }}
                  >
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

// Product-surface imagery: the canvas with bricks, not people. Organic brick
// placement over a rigid grid substrate, per the structured/freeform rule.
const MINI_BRICKS = [
  {
    src: '/bricks/flat-1-black-large-left.png',
    left: '16%',
    top: '54%',
    width: '44%',
    ratio: 300 / 190,
  },
  {
    src: '/bricks/block-green-medium-left.png',
    left: '22%',
    top: '36%',
    width: '25%',
    ratio: 180 / 156,
  },
  {
    src: '/bricks/block-pink-medium-right.png',
    left: '44%',
    top: '30%',
    width: '25%',
    ratio: 180 / 156,
  },
  {
    src: '/bricks/corner-orange-small.png',
    left: '66%',
    top: '52%',
    width: '15%',
    ratio: 100 / 98,
  },
];

function MiniCanvas() {
  return (
    <div
      className="relative aspect-[16/10] w-full max-w-md overflow-hidden rounded-[24px] border border-[#26150A]/15"
      style={{
        backgroundColor: PAPER,
        backgroundImage:
          'linear-gradient(to right, rgba(38,21,10,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(38,21,10,0.06) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }}
      aria-hidden="true"
    >
      {MINI_BRICKS.map((b) => (
        <span
          key={b.src}
          className="absolute drop-shadow-[0_5px_8px_rgba(38,21,10,0.18)]"
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
      <div
        className="absolute left-4 top-4 rounded-full border border-[#26150A]/15 bg-[#FBF5EA]/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: LABEL }}
      >
        Shared model · stage 3
      </div>
    </div>
  );
}

function CostSection() {
  return (
    <section
      aria-labelledby="cost-heading"
      className={`border-t ${HAIRLINE}`}
      style={{ backgroundColor: '#EADCC4' }}
    >
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: LABEL }}
            >
              Money
            </p>
            <h2
              id="cost-heading"
              className={`${instrument.className} mt-4 text-[38px] leading-[1.05] tracking-[-0.01em] md:text-[48px]`}
              style={{ color: INK }}
            >
              The software is free. Three reports are not.
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed" style={{ color: BODY }}>
              BrickThink is open source under Apache 2.0. Self-hosting costs nothing, and running
              workshops on brickthink.io costs nothing. The hosted instance charges for three
              optional AI-produced reports. The source is on{' '}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline decoration-[#A8482A]/50 underline-offset-4 transition-colors hover:decoration-[#A8482A]"
                style={{ color: INK }}
              >
                <GitHubGlyph className="h-3.5 w-3.5" />
                GitHub
              </a>
              .
            </p>
          </div>

          <div className="md:col-span-7">
            {/* Disclosure sits above the prices, per the candour placement rule. */}
            <div
              className="rounded-[24px] border border-[#A8482A]/35 p-7"
              style={{ backgroundColor: PAPER }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: TERRACOTTA }}
              >
                A reversal, on the record
              </p>
              <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed" style={{ color: INK }}>
                We launched saying free forever, no paid tier. We were wrong about what running the
                hosted service costs. The software is still free and open source; the hosted AI
                services are now paid.
              </p>
            </div>

            <div
              className="mt-6 overflow-hidden rounded-[24px] border border-[#26150A]/15"
              style={{ backgroundColor: PAPER }}
            >
              <div
                className="grid grid-cols-12 gap-2 px-6 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: LABEL }}
              >
                <span className="col-span-6">Report</span>
                <span className="col-span-2 text-right">Per session</span>
                <span className="col-span-2 text-right">Monthly</span>
                <span className="col-span-2 text-right">Yearly</span>
              </div>
              {REPORT_PRICES.map((r) => (
                <div
                  key={r.name}
                  className={`grid grid-cols-12 items-baseline gap-2 border-t px-6 py-4 ${HAIRLINE}`}
                >
                  <span className="col-span-6 text-[15px] font-semibold" style={{ color: INK }}>
                    {r.name}
                  </span>
                  <span
                    className="col-span-2 text-right font-mono text-[14px] tabular-nums"
                    style={{ color: BODY }}
                  >
                    {r.per}
                  </span>
                  <span
                    className="col-span-2 text-right font-mono text-[14px] tabular-nums"
                    style={{ color: BODY }}
                  >
                    {r.month}
                  </span>
                  <span
                    className="col-span-2 text-right font-mono text-[14px] tabular-nums"
                    style={{ color: BODY }}
                  >
                    {r.year}
                  </span>
                </div>
              ))}
            </div>
            <p
              className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: LABEL }}
            >
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
    <section style={{ backgroundColor: ESPRESSO }} className="text-[#EADFCE]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-24">
        <div className="md:col-span-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B79A80]">
            What this is, and is not
          </p>
        </div>
        <div className="md:col-span-8">
          <p
            className={`${instrument.className} text-[28px] leading-[1.25] tracking-[-0.005em] text-[#F7EFE2] md:text-[36px]`}
          >
            BrickThink removes the same-room constraint and changes nothing else. The method stays
            as taught. Certified facilitation stays essential. The LEGO name and brick designs
            belong to the LEGO Group, so our 57 bricks are original designs.
          </p>
        </div>
      </div>
    </section>
  );
}
