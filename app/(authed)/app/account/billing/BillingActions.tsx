'use client';

import { useTransition, useState } from 'react';
import {
  createSubscriptionCheckout,
  createPortalSession,
  type BillingActionResult,
} from './actions';
import { allTierMeta, tierMetaFor, type Tier } from '@/lib/billing/plans';
import { TierDetailsModal } from './TierDetailsModal';

interface Props {
  currentTier: Tier | null;
  status: string | null;
  renewsLabel: string | null;
  /** True when the active subscription is set to end at the period end (cancelled, still usable). */
  cancelAtPeriodEnd: boolean;
}

const ERROR_COPY: Record<string, string> = {
  billing_disabled: 'Billing is not enabled right now.',
  no_email: 'Your account has no email address. Add one and try again.',
  no_customer: 'No billing account found yet. Subscribe first.',
  no_url: 'Could not start checkout. Please try again.',
  stripe_error: 'Something went wrong talking to our payment provider. Please try again.',
};

export default function BillingActions({
  currentTier,
  status,
  renewsLabel,
  cancelAtPeriodEnd,
}: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [detailsTier, setDetailsTier] = useState<Tier | null>(null);

  function go(action: () => Promise<BillingActionResult>) {
    setError(null);
    start(async () => {
      const res = await action();
      if (res.ok) window.location.href = res.url;
      else setError(ERROR_COPY[res.code] ?? 'Something went wrong. Please try again.');
    });
  }

  return (
    <div className="space-y-5">
      {currentTier ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-700">
            Plan: <span className="font-medium">{tierMetaFor(currentTier).name}</span>
            {cancelAtPeriodEnd ? (
              <>
                {' · '}
                <span className="font-medium text-amber-700">Cancelled</span>
                {renewsLabel ? ` — active until ${renewsLabel}` : ''}
              </>
            ) : (
              <>
                {' · Status: '}
                <span className="font-medium">{status}</span>
                {renewsLabel ? ` · renews ${renewsLabel}` : ''}
              </>
            )}
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => go(createPortalSession)}
            className="cursor-pointer rounded-full border border-zinc-900/15 bg-white px-5 py-2.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            Manage subscription
          </button>
        </div>
      ) : null}

      <div className="mx-auto flex w-fit rounded-full border border-zinc-900/15 p-1 text-sm">
        {(['monthly', 'yearly'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setInterval(opt)}
            className={`cursor-pointer rounded-full px-4 py-1.5 ${interval === opt ? 'bg-zinc-900 text-white' : 'text-zinc-700'}`}
          >
            {opt === 'monthly' ? 'Monthly' : 'Yearly'}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {allTierMeta().map((meta) => {
          const isCurrent = currentTier === meta.key;
          return (
            <div
              key={meta.key}
              className={`flex flex-col rounded-2xl border bg-white p-5 ${
                isCurrent ? 'border-zinc-900/40 ring-1 ring-zinc-900/10' : 'border-zinc-900/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[15px] font-semibold text-zinc-950">{meta.name}</h3>
                {isCurrent ? (
                  cancelAtPeriodEnd ? (
                    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-700">
                      Cancelled
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-700">
                      Current plan
                    </span>
                  )
                ) : null}
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
                €{meta.prices[interval].amount}
                <span className="text-sm font-normal text-zinc-500">
                  {interval === 'monthly' ? ' / month' : ' / year'}
                </span>
              </p>
              <ul className="mt-3 space-y-1 text-[13px] text-zinc-600">
                {meta.bullets.map((b) => (
                  <li key={b}>• {b}</li>
                ))}
              </ul>
              {/* Spacer absorbs the equal-height grid slack so every button lines up
                  at the bottom regardless of how many bullets a tier has. */}
              <div className="grow" />
              {isCurrent ? (
                <button
                  type="button"
                  disabled
                  className="mt-6 w-full cursor-default rounded-full border border-zinc-900/15 bg-zinc-50 px-5 py-2.5 text-sm font-medium text-zinc-500"
                >
                  Active
                </button>
              ) : currentTier ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => go(createPortalSession)}
                  className="mt-6 w-full cursor-pointer rounded-full border border-zinc-900/15 bg-white px-5 py-2.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  Switch plan
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => go(() => createSubscriptionCheckout(meta.key, interval))}
                  className="mt-6 w-full cursor-pointer rounded-full bg-zinc-900 px-5 py-2.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  Subscribe
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailsTier(meta.key)}
                className="mt-3 w-full cursor-pointer text-center text-[13px] text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
              >
                Full details
              </button>
            </div>
          );
        })}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {detailsTier ? (
        <TierDetailsModal tier={detailsTier} onClose={() => setDetailsTier(null)} />
      ) : null}
    </div>
  );
}
