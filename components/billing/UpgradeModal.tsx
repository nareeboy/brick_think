'use client';

import { useId, useState, useTransition } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import {
  createSessionCheckout,
  createSubscriptionCheckout,
} from '@/app/(authed)/app/account/billing/actions';
import { tierMetaFor, type BillingMode, type Tier } from '@/lib/billing/plans';

interface Props {
  open: boolean;
  onClose: () => void;
  feature: string;
  /** When set, the modal offers one-time per-session unlock(s) alongside subscribing. */
  sessionId?: string;
  /**
   * Single tier to offer as a card. Defaults to `session_report`. Ignored when
   * `tiers` is provided. Prices/copy derive from `tierMetaFor(tier)`.
   */
  tier?: Tier;
  /**
   * Tiers to show as side-by-side pricing cards (cheapest first reads best). Each
   * card carries a subscription price (driven by the monthly/yearly toggle) and a
   * one-off "this session" unlock.
   */
  tiers?: Tier[];
}

// Short card descriptor per tier — what the buyer actually gets. Exhaustive over
// Tier so a new tier forces a copy decision here.
const TIER_BLURB: Record<Tier, string> = {
  session_report: 'The standard hosted PDF report',
  client_ready: 'White-labelled with your logo, colours & name',
  full_findings: 'Full written findings & suggestions',
};

/** Whole-euro amount with thousands separators, locale-independent (SSR-safe). */
function euros(amount: number): string {
  return '€' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function UpgradeModal({
  open,
  onClose,
  feature,
  sessionId,
  tier = 'session_report',
  tiers,
}: Props) {
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  // Key of the in-flight checkout button (e.g. "client_ready:once" /
  // "session_report:monthly") so only the clicked button shows "Starting…".
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  // Cards (with the one-off unlock) only make sense for a specific session.
  const cards: Tier[] = sessionId ? (tiers ?? [tier]) : [];

  function go(key: string, action: () => Promise<{ ok: true; url: string } | { ok: false }>) {
    setError(null);
    setBusyKey(key);
    startTransition(async () => {
      const res = await action();
      if (res.ok) window.location.href = res.url;
      else {
        setError('Could not start checkout. Please try again.');
        setBusyKey(null);
      }
    });
  }

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId} panelClassName="w-full max-w-2xl">
      <div className="rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="font-display text-lg font-medium text-zinc-900">
          {sessionId ? 'Unlock this report' : 'Subscribe to continue'}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          {feature} is a paid feature on brickthink.io.
          {sessionId ? ' Unlock it just for this session, or subscribe for every session.' : ''}
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        {cards.length > 0 ? (
          <>
            {/* Monthly / yearly toggle drives the subscription price on every card. */}
            <div className="mt-4 flex justify-center">
              <div
                role="radiogroup"
                aria-label="Billing interval"
                className="inline-flex rounded-full border border-zinc-900/10 p-0.5 text-sm"
              >
                {(['monthly', 'yearly'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={interval === opt}
                    onClick={() => setInterval(opt)}
                    className={
                      interval === opt
                        ? 'cursor-pointer rounded-full bg-zinc-900 px-4 py-1.5 text-white'
                        : 'cursor-pointer rounded-full px-4 py-1.5 text-zinc-600 hover:text-zinc-900'
                    }
                  >
                    {opt === 'monthly' ? 'Monthly' : 'Yearly'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {cards.map((cardTier) => {
                const meta = tierMetaFor(cardTier);
                const subAmount = meta.prices[interval as BillingMode].amount;
                const onceAmount = meta.prices.once.amount;
                const subKey = `${cardTier}:${interval}`;
                const onceKey = `${cardTier}:once`;
                return (
                  <div
                    key={cardTier}
                    className="flex flex-col rounded-2xl border border-zinc-900/10 p-4"
                  >
                    <h3 className="font-display text-base font-medium text-zinc-900">
                      {meta.name}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-600">{TIER_BLURB[cardTier]}</p>

                    {/* Subscription — headline price for the chosen interval. */}
                    <div className="mt-4">
                      <p className="text-zinc-900">
                        <span className="text-2xl font-semibold tabular-nums">
                          {euros(subAmount)}
                        </span>
                        <span className="text-sm text-zinc-600">
                          {' '}
                          /{interval === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {interval === 'monthly'
                          ? `or ${euros(meta.prices.yearly.amount)}/yr`
                          : 'billed yearly · every session'}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          go(subKey, () => createSubscriptionCheckout(cardTier, interval))
                        }
                        disabled={pending}
                        className="mt-2 w-full cursor-pointer rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {pending && busyKey === subKey ? 'Starting…' : 'Subscribe'}
                      </button>
                    </div>

                    <div className="my-3 border-t border-zinc-900/10" />

                    {/* One-off — just this session. */}
                    <div className="mt-auto">
                      <p className="text-xs text-zinc-600">Just this session</p>
                      <button
                        type="button"
                        onClick={() =>
                          go(onceKey, () => createSessionCheckout(cardTier, sessionId!))
                        }
                        disabled={pending}
                        className="mt-2 w-full cursor-pointer rounded-full border border-zinc-900/15 bg-white px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {pending && busyKey === onceKey
                          ? 'Starting…'
                          : `Unlock — ${euros(onceAmount)}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-zinc-900/15 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Not now
          </button>
          <a
            href="/app/account/billing"
            className={
              sessionId
                ? 'rounded-full border border-zinc-900/15 bg-white px-4 py-2 text-sm hover:bg-zinc-50'
                : 'rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800'
            }
          >
            {sessionId ? 'See all plans' : 'View plans'}
          </a>
        </div>
      </div>
    </ModalBackdrop>
  );
}
