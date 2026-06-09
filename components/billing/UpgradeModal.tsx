'use client';

import { useId, useState, useTransition } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import { createSessionCheckout } from '@/app/(authed)/app/account/billing/actions';
import { tierMetaFor, type Tier } from '@/lib/billing/plans';

interface Props {
  open: boolean;
  onClose: () => void;
  feature: string;
  /** When set, the modal offers a one-time per-session unlock alongside subscribing. */
  sessionId?: string;
  /**
   * Which tier the one-time unlock buys. Defaults to `session_report` (€9), the
   * cheapest path and the only tier with a working deliverable today. Higher tiers
   * (client_ready €45, full_findings €60) light up the moment a caller passes their
   * tier — price and Stripe checkout derive from `tierMetaFor(tier)`, no rewiring.
   */
  tier?: Tier;
}

export default function UpgradeModal({
  open,
  onClose,
  feature,
  sessionId,
  tier = 'session_report',
}: Props) {
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  // plans.ts is dual-use (not server-only) — its display metadata is meant for
  // client components like this one, so the price is read from the single source
  // of truth rather than hardcoded.
  const amount = tierMetaFor(tier).prices.once.amount;

  function unlock() {
    if (!sessionId) return;
    setError(null);
    startTransition(async () => {
      const res = await createSessionCheckout(tier, sessionId);
      if (res.ok) window.location.href = res.url;
      else setError('Could not start checkout. Please try again.');
    });
  }

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId}>
      <div className="rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="font-display text-lg font-medium text-zinc-900">
          Subscribe to continue
        </h2>
        <p className="mt-2 text-sm text-zinc-600">{feature} is a paid feature on brickthink.io.</p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
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
            {sessionId ? 'Subscribe' : 'View plans'}
          </a>
          {sessionId ? (
            <button
              type="button"
              onClick={unlock}
              disabled={pending}
              className="cursor-pointer rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {pending ? 'Starting…' : `Unlock — €${amount}`}
            </button>
          ) : null}
        </div>
      </div>
    </ModalBackdrop>
  );
}
