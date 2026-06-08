import type { Metadata } from 'next';
import Link from 'next/link';

import {
  ArrowRight,
  CtaBricks,
  MarketingShell,
  PlusGlyph,
} from '@/components/marketing/MarketingChrome';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'BrickThink is free, open-source and self-hostable. A handful of hosted services we produce for you carry a subscription, to cover their real cost to run. This is cost-recovery, not a tier wall.',
};

type Faq = { q: string; a: string };

const FAQS: Faq[] = [
  {
    q: 'Is BrickThink really free?',
    a: 'Yes. The whole app is open source under Apache 2.0. Every stage, every feature on the canvas, no caps. Run it on our hosted site or your own server — the tool itself never costs anything.',
  },
  {
    q: 'Then what do you charge for?',
    a: 'Four services we produce and deliver on the hosted site: PDF session reports, automatic transcript cleanup, fully white-labelled reports, and a full written report with our findings from the session. Each one costs us money every time we run it, so each carries a subscription rather than quietly degrading the free tool to pay for it.',
  },
  {
    q: 'What will it cost?',
    a: 'We have not set a price yet. We are watching real usage first, then we will set it at launch — monthly or annual, per facilitator, with annual working out at roughly two months free. We would rather price it once, fairly, than guess now.',
  },
  {
    q: 'Can I self-host to avoid paying?',
    a: 'You can self-host the whole tool for free and run unlimited sessions — that part is yours under Apache 2.0. The four paid services are different: they are things we produce and deliver for you, so they live only on the hosted site at brickthink.io and are not part of the self-hosted tool.',
  },
  {
    q: 'Is there a free trial?',
    a: 'No free trial. The rest of BrickThink is already free to use as much as you like, so you can judge the tool fully before you ever pay. The paid services are the only thing behind a subscription.',
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <Hero />
      <CostRecoveryBand />
      <PaidFeaturesSection />
      <FaqSection />
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
            Pricing
          </div>
          <h1 className="mt-6 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 sm:text-[58px] md:text-[78px]">
            Free tool.
            <br />
            Four services that <span className="text-[#c0613d]">cost us money</span>.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[17px] leading-relaxed text-zinc-700">
            BrickThink is free, open-source (Apache 2.0) and yours to self-host. We also produce
            four hosted services for you — each with a real cost to run — so each carries a
            subscription. The tool itself stays free, for everyone, forever.
          </p>
        </div>
        <aside className="md:col-span-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-zinc-900/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            {[
              ['Free', 'The whole app'],
              ['Apache 2.0', 'Code licence'],
              ['4 services', 'Paid, on brickthink.io'],
              ['Self-host', 'The tool, free'],
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

function CostRecoveryBand() {
  return (
    <section className="border-b border-zinc-900/5 bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-24">
        <div className="md:col-span-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            Cost-recovery, not a tier wall
          </p>
        </div>
        <div className="md:col-span-8">
          <p className="font-display text-[24px] font-normal leading-[1.25] tracking-[-0.01em] md:text-[34px]">
            The tool stays free. We only charge for the four services we produce for you, each with
            a real <span className="text-[#d8a85d]">cost to run</span> — from the compute to render
            a PDF to the AI tokens behind a written report — and only on the hosted site. Self-host
            the tool and you run unlimited sessions free; the delivered services live on
            brickthink.io.
          </p>
        </div>
      </div>
    </section>
  );
}

function PdfGlyph({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13h7" />
      <path d="M8.5 16.5h7" />
    </svg>
  );
}

function SparkleGlyph({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </svg>
  );
}

function TagGlyph({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.6 11.4 11.4 3.6a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v6.2a2 2 0 0 1-.6 1.4l-7.8 7.8a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1 0-2.8z" />
      <path d="M16.4 7.6h.01" />
    </svg>
  );
}

function InsightGlyph({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.2-4.2" />
      <path d="M8 10.5h5" />
      <path d="M8 8h5" />
      <path d="M8 13h3" />
    </svg>
  );
}

const PAID_FEATURES = [
  {
    label: 'Paid service 01',
    icon: PdfGlyph,
    title: 'PDF session reports',
    body: 'A clean, server-rendered PDF summary of a finished session — bricks, stories and the shared model — ready to send round the room.',
  },
  {
    label: 'Paid service 02',
    icon: SparkleGlyph,
    title: 'Automatic transcript cleanup',
    body: 'AI tidies your narration transcripts into readable notes, so spoken stories become something you can actually reuse.',
  },
  {
    label: 'Paid service 03',
    icon: TagGlyph,
    title: 'Fully white-labelled reports',
    body: 'A session report rendered entirely in your own brand — your logo, colours and name, none of ours — ready to hand to a client as your own deliverable.',
  },
  {
    label: 'Paid service 04',
    icon: InsightGlyph,
    title: 'Full report with findings',
    body: 'A complete written report of a workshop: the shared model and the stories, plus our suggestions and findings drawn from what actually happened in the room.',
  },
];

function PaidFeaturesSection() {
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              The four paid services
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              Everything we charge for, in one place.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            Each one costs us money every time we run it, so the subscription on the hosted site
            covers it. They are services we deliver — not part of the self-hosted tool.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {PAID_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li
                key={f.title}
                className="group relative flex flex-col overflow-hidden rounded-[28px] border border-zinc-900/10 bg-white p-7 transition-shadow duration-300 hover:shadow-[0_30px_60px_-30px_rgba(60,30,15,0.25)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-900/10 bg-[#FAF7F1] text-[#c0613d]">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  {f.label}
                </p>
                <h3 className="mt-2 max-w-[28ch] font-display text-[24px] font-medium leading-tight tracking-tight text-zinc-950">
                  {f.title}
                </h3>
                <p className="mt-3 max-w-[48ch] text-[14px] leading-relaxed text-zinc-700">
                  {f.body}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="pricing" className="border-b border-zinc-900/5 scroll-mt-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-12 md:py-28">
        <div className="md:col-span-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Pricing FAQ
          </p>
          <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
            The honest version.
          </h2>
        </div>
        <div className="md:col-span-8">
          <ul className="divide-y divide-zinc-900/10 border-t border-zinc-900/10">
            {FAQS.map((item) => (
              <li key={item.q}>
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 text-[16px] font-medium text-zinc-950 transition-colors hover:text-[#c0613d]">
                    <span className="max-w-[58ch]">{item.q}</span>
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-900/10 bg-white text-zinc-700 transition-transform duration-200 group-open:rotate-45">
                      <PlusGlyph className="h-3.5 w-3.5" />
                    </span>
                  </summary>
                  <p className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-zinc-700">
                    {item.a}
                  </p>
                </details>
              </li>
            ))}
          </ul>
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
              Free to start · paid only for what we deliver
            </p>
            <h2 className="mt-3 font-display text-[34px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[48px]">
              Start free. Add a service when you need it.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">
              Make an account, run a session, use the whole tool. The paid services are there in
              your account whenever a report, a tidy transcript or a white-label deliverable is
              worth it to you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-in?next=%2Fapp%2Faccount%2Fbilling"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition-colors hover:bg-zinc-800 active:translate-y-[1px]"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/help#pricing"
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
