import Link from 'next/link';
import type { ReactElement } from 'react';

import { ArrowRight } from '@/components/marketing/MarketingChrome';
import { allTierMeta, type Tier } from '@/lib/billing/plans';

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

const TIER_GLYPHS: Record<Tier, (props: { className?: string }) => ReactElement> = {
  session_report: PdfGlyph,
  client_ready: TagGlyph,
  full_findings: InsightGlyph,
};

const POPULAR_TIER = 'client_ready';

function formatTierPrice(m: ReturnType<typeof allTierMeta>[number]): string {
  const yearly = m.prices.yearly.amount.toLocaleString('en-GB');
  return `€${m.prices.once.amount} / session · €${m.prices.monthly.amount} / month · €${yearly} / year`;
}

export function PricingTiers() {
  const tiers = allTierMeta();
  return (
    <section className="border-b border-zinc-900/5">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Three tiers, one ladder
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-[34px] font-medium leading-[1.02] tracking-[-0.015em] text-zinc-950 md:text-[44px]">
              Pick the deliverable you need.
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-zinc-600">
            Each tier is a superset of the one below — pay per session, monthly or yearly, only on
            the hosted site. They are deliverables we produce, not part of the self-hosted tool.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {tiers.map((m) => {
            const Icon = TIER_GLYPHS[m.key];
            const isPopular = m.key === POPULAR_TIER;
            const cta = m.key === 'session_report' ? 'Get started' : `Choose ${m.name}`;
            return (
              <li
                key={m.key}
                className={`group relative flex flex-col overflow-hidden rounded-[28px] border bg-white p-7 transition-shadow duration-300 hover:shadow-[0_30px_60px_-30px_rgba(60,30,15,0.25)] ${
                  isPopular ? 'border-[#c0613d]/40 ring-1 ring-[#c0613d]/30' : 'border-zinc-900/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-900/10 bg-[#FAF7F1] text-[#c0613d]">
                    <Icon className="h-5 w-5" />
                  </span>
                  {isPopular ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#c0613d]/30 bg-[#FAF7F1] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#c0613d]">
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#c0613d]" />
                      Most popular
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-5 font-display text-[24px] font-medium leading-tight tracking-tight text-zinc-950">
                  {m.name}
                </h3>
                <p className="mt-2 text-[16px] font-medium leading-snug text-zinc-950">
                  {formatTierPrice(m)}
                </p>
                <p className="mt-3 max-w-[44ch] text-[14px] leading-relaxed text-zinc-700">
                  {m.tagline}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {m.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2.5 text-[14px] leading-relaxed text-zinc-700"
                    >
                      <span className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#c0613d]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex grow items-end">
                  <Link
                    href="/sign-in?next=%2Fapp%2Faccount%2Fbilling"
                    className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0613d] focus-visible:ring-offset-2 active:translate-y-[1px] ${
                      isPopular
                        ? 'bg-zinc-900 text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] hover:bg-zinc-800'
                        : 'border border-zinc-900/15 bg-white text-zinc-900 hover:bg-zinc-50'
                    }`}
                  >
                    {cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
