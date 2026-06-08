'use client';

import { useTransition, useState } from 'react';
import { createCheckoutSession, createPortalSession, type BillingActionResult } from './actions';

interface Props {
  entitled: boolean;
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

export default function BillingActions({ entitled, status, renewsLabel }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go(action: () => Promise<BillingActionResult>) {
    setError(null);
    start(async () => {
      const res = await action();
      if (res.ok) window.location.href = res.url;
      else setError(ERROR_COPY[res.code] ?? 'Something went wrong. Please try again.');
    });
  }

  if (entitled) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-700">
          Status: <span className="font-medium">{status}</span>
          {renewsLabel ? ` · renews ${renewsLabel}` : ''}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => go(createPortalSession)}
          className="rounded-full border border-zinc-900/15 bg-white px-5 py-3 text-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          Manage subscription
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-700">
        Subscribe to unlock PDF session reports and automatic transcript cleanup.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => go(() => createCheckoutSession('monthly'))}
          className="rounded-full bg-zinc-900 px-5 py-3 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Subscribe monthly
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => go(() => createCheckoutSession('annual'))}
          className="rounded-full border border-zinc-900/15 bg-white px-5 py-3 text-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          Subscribe annually
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
