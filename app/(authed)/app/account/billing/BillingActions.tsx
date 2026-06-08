'use client';

import { useTransition, useState } from 'react';
import {
  createSubscriptionCheckout,
  createPortalSession,
  type BillingActionResult,
} from './actions';
import { allTierMeta, tierMetaFor, type Tier } from '@/lib/billing/plans';

interface Props {
  currentTier: Tier | null;
  status: string | null;
  renewsLabel: string | null;
}

const ERROR_COPY: Record<string, string> = {
  billing_disabled: 'Billing is not enabled right now.',
  no_email: 'Your account has no email address. Add one and try again.',
  no_customer: 'No billing account found yet. Subscribe first.',
  no_url: 'Could not start checkout. Please try again.',
  stripe_error: 'Something went wrong talking to our payment provider. Please try again.',
};

export default function BillingActions({ currentTier, status, renewsLabel }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  function go(action: () => Promise<BillingActionResult>) {
    setError(null);
    start(async () => {
      const res = await action();
      if (res.ok) window.location.href = res.url;
      else setError(ERROR_COPY[res.code] ?? 'Something went wrong. Please try again.');
    });
  }

  if (currentTier) {
    const meta = tierMetaFor(currentTier);
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-700">
          Plan: <span className="font-medium">{meta.name}</span> · Status:{' '}
          <span className="font-medium">{status}</span>
          {renewsLabel ? ` · renews ${renewsLabel}` : ''}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => go(createPortalSession)}
          className="cursor-pointer rounded-full border border-zinc-900/15 bg-white px-5 py-3 text-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          Manage subscription
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
        {allTierMeta().map((meta) => (
          <div
            key={meta.key}
            className="flex flex-col rounded-2xl border border-zinc-900/10 bg-white p-5"
          >
            <h3 className="text-[15px] font-semibold text-zinc-950">{meta.name}</h3>
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
            {/* Spacer absorbs the equal-height grid slack so every Subscribe button
                lines up at the bottom regardless of how many bullets a tier has. */}
            <div className="grow" />
            <button
              type="button"
              disabled={pending}
              onClick={() => go(() => createSubscriptionCheckout(meta.key, interval))}
              className="mt-6 w-full cursor-pointer rounded-full bg-zinc-900 px-5 py-2.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Subscribe
            </button>
          </div>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
