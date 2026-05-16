'use client';

import { useState, useTransition } from 'react';

import type { PlanTier, PurchaseableTier } from '@/lib/billing/plans';

interface Props {
  orgId: string;
  tier: PlanTier;
  hasStripeCustomer: boolean;
}

async function postJson(url: string, body: unknown): Promise<{ url?: string; error?: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({}))) as { url?: string; error?: string };
}

export function BillingRowActions({ orgId, tier, hasStripeCustomer }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upgrade(targetTier: PurchaseableTier) {
    setError(null);
    start(async () => {
      const result = await postJson('/api/billing/checkout', { orgId, tier: targetTier });
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setError(result.error ?? 'Could not start checkout.');
    });
  }

  function openPortal() {
    setError(null);
    start(async () => {
      const result = await postJson('/api/billing/portal', { orgId });
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setError(result.error ?? 'Could not open billing portal.');
    });
  }

  const showManage = hasStripeCustomer;
  const upgradeTarget: PurchaseableTier = tier === 'pro' ? 'team' : 'pro';
  const upgradeLabel = tier === 'free' ? 'Upgrade' : tier === 'pro' ? 'Switch to Team' : null;

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {upgradeLabel ? (
        <button
          type="button"
          onClick={() => upgrade(upgradeTarget)}
          disabled={pending}
          data-testid={`account-billing-upgrade-${orgId}`}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
        >
          {pending ? 'Opening…' : upgradeLabel}
        </button>
      ) : null}
      {showManage ? (
        <button
          type="button"
          onClick={openPortal}
          disabled={pending}
          data-testid={`account-billing-manage-${orgId}`}
          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/15 bg-white px-3 text-[12px] font-semibold text-zinc-800 transition-colors hover:bg-zinc-900/5 disabled:opacity-60"
        >
          {pending ? 'Opening…' : 'Manage'}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="text-[11px] text-red-700 sm:max-w-[200px]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
