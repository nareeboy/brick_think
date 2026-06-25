import type { Metadata } from 'next';
import Link from 'next/link';

import { ArrowRight, CtaBricks, MarketingShell } from '@/components/marketing/MarketingChrome';
import { pageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Roadmap',
  description:
    'Where BrickThink is going — phase by phase. What is shipped, what we are doing now, and what comes next. Honest dates, not vapour.',
  path: '/roadmap',
});

type PhaseStatus = 'Done' | 'Now' | 'Next' | 'Later';

type Phase = {
  status: PhaseStatus;
  name: string;
  summary: string;
  items: string[];
};

const PHASES: Phase[] = [
  {
    status: 'Done',
    name: 'Phase 0 — Foundations',
    summary: 'Build the method into a real tool and ship it.',
    items: [
      'Five-stage LSP flow, in order',
      'Brick canvas — custom 52-tile asset set',
      'Sessions & facilitation in one place',
      'Live collaboration (Yjs CRDT)',
      'Accessibility baseline — WCAG 2.2 AA',
      'Open-sourced under Apache 2.0',
    ],
  },
  {
    status: 'Now',
    name: 'Phase 1 — Feedback',
    summary: 'Get it in front of real facilitators and run real sessions.',
    items: [
      'Onboard early facilitators',
      'Run live sessions end-to-end',
      'Gather feedback, fix what breaks',
      'Harden the core flow',
      'Tighten performance & reliability',
    ],
  },
  {
    status: 'Next',
    name: 'Phase 2 — Capture & Export',
    summary: 'Take the whole session with you — no lock-in.',
    items: [
      'Text, voice & video capture on the canvas',
      'Auto transcription, searchable by person & stage',
      'PDF session report',
      'Per-stage images',
      'Narration video export',
    ],
  },
  {
    status: 'Later',
    name: 'Phase 3 — AI assist',
    summary: "A helper on the facilitator's side — never the participant's.",
    items: [
      'Stage-prompt suggestions',
      'Narration clustering into themes',
      'Facilitator-only, opt-in',
    ],
  },
  {
    status: 'Later',
    name: 'Phase 4 — Self-host & scale',
    summary: 'Run your own copy. Your data, your rules.',
    items: [
      'One-command self-host',
      'Docs & deploy guides',
      'Org & admin polish',
      'Scale hardening',
    ],
  },
];

export default function RoadmapPage() {
  return (
    <MarketingShell>
      <Hero />
      <Timeline />
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
            Roadmap
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[78px]">
            Honest dates.
            <br />
            Not <span className="text-[#a8482a]">vapour</span>.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            Where BrickThink is going, phase by phase. What is shipped, what we are doing right now,
            and what comes next. We move one phase at a time and we say so out loud.
          </p>
        </div>
        <aside className="md:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            {[
              ['Phase 1', 'Where we are'],
              ['Feedback', 'What it is about'],
              ['Apache 2.0', 'Code licence'],
              ['Always free', 'What it costs'],
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

const STATUS_STYLES: Record<PhaseStatus, string> = {
  Done: 'border-zinc-900/15 bg-white text-zinc-600',
  Now: 'border-transparent bg-[#a8482a] text-white',
  Next: 'border-zinc-900/15 bg-white text-zinc-700',
  Later: 'border-zinc-900/10 bg-white/60 text-zinc-500',
};

function Timeline() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              The plan
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              Five phases. One at a time.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            Phase 0 is built and shipped. We are in Phase 1 now. The rest is honest intent, not a
            promise of dates.
          </p>
        </div>

        <ol className="mt-12 space-y-4 md:space-y-5">
          {PHASES.map((phase) => {
            const isNow = phase.status === 'Now';
            return (
              <li
                key={phase.name}
                aria-current={isNow ? 'step' : undefined}
                className={`grid grid-cols-1 gap-6 rounded-[28px] border p-7 md:grid-cols-12 md:p-9 ${
                  isNow
                    ? 'border-[#a8482a]/40 bg-[#FBF7F1] shadow-[0_8px_24px_-16px_rgba(192,97,61,0.5)]'
                    : 'border-zinc-900/10 bg-white'
                }`}
              >
                <div className="md:col-span-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${STATUS_STYLES[phase.status]}`}
                  >
                    {isNow && <span className="inline-flex h-1.5 w-1.5 rounded-full bg-white" />}
                    {phase.status}
                  </span>
                  <h3 className="mt-4 font-display text-[24px] font-medium leading-tight tracking-tight text-zinc-950 md:text-[28px]">
                    {phase.name}
                  </h3>
                  <p className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-zinc-600">
                    {phase.summary}
                  </p>
                </div>
                <ul className="md:col-span-8 md:border-l md:border-zinc-900/10 md:pl-8">
                  {phase.items.map((item, i) => (
                    <li
                      key={item}
                      className={`flex items-baseline gap-3 py-2.5 ${
                        i === 0 ? '' : 'border-t border-zinc-900/[0.06]'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-1.5 inline-flex h-1.5 w-1.5 flex-none rounded-full ${
                          phase.status === 'Done'
                            ? 'bg-emerald-500'
                            : isNow
                              ? 'bg-[#a8482a]'
                              : 'bg-zinc-300'
                        }`}
                      />
                      <span className="text-[15px] leading-relaxed text-zinc-800">{item}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
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
              We are in Phase 1
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[48px]">
              Run a session. Tell us what breaks.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
              Phase 1 is about you. Real facilitators, real sessions, real feedback. What you tell
              us now is what shapes Phase 2.
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
                Send feedback
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
