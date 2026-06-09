'use client';

import { useId, useState, useTransition } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import { createSessionCheckout } from '@/app/(authed)/app/account/billing/actions';
import { tierMetaFor, type Tier } from '@/lib/billing/plans';

interface Props {
  open: boolean;
  onClose: () => void;
  feature: string;
  /** When set, the modal offers one-time per-session unlock(s) alongside subscribing. */
  sessionId?: string;
  /**
   * Single one-off tier to offer. Defaults to `session_report` (€9). Ignored when
   * `tiers` is provided. Price + Stripe checkout derive from `tierMetaFor(tier)`.
   */
  tier?: Tier;
  /**
   * Multiple one-off tiers to offer as a good/better ladder (e.g. the standard PDF
   * for €9 plus the white-labelled report for €45). Each renders its own
   * "Unlock — €{amount}" row. Order is preserved (cheapest first reads best).
   */
  tiers?: Tier[];
}

// Short row descriptor per tier — what the buyer actually gets for the one-off.
// Exhaustive over Tier so a new tier forces a copy decision here.
const UNLOCK_BLURB: Record<Tier, string> = {
  session_report: 'The standard hosted PDF report',
  client_ready: 'White-labelled with your logo, colours & name',
  full_findings: 'Full written findings & suggestions',
};

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
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  // One-off offers only make sense for a specific session. plans.ts is dual-use
  // (not server-only), so prices/names come straight from the source of truth.
  const offers: Tier[] = sessionId ? (tiers ?? [tier]) : [];

  function unlock(offerTier: Tier) {
    if (!sessionId) return;
    setError(null);
    setPendingTier(offerTier);
    startTransition(async () => {
      const res = await createSessionCheckout(offerTier, sessionId);
      if (res.ok) window.location.href = res.url;
      else {
        setError('Could not start checkout. Please try again.');
        setPendingTier(null);
      }
    });
  }

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId}>
      <div className="rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="font-display text-lg font-medium text-zinc-900">
          {sessionId ? 'Unlock this report' : 'Subscribe to continue'}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          {feature} is a paid feature on brickthink.io.
          {sessionId ? ' Unlock it just for this session, or subscribe.' : ''}
        </p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

        {offers.length > 0 ? (
          <ul className="mt-4 divide-y divide-zinc-900/10 rounded-xl border border-zinc-900/10">
            {offers.map((offerTier) => {
              const meta = tierMetaFor(offerTier);
              const isPending = pending && pendingTier === offerTier;
              return (
                <li key={offerTier} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <p className="text-xs text-zinc-600">{UNLOCK_BLURB[offerTier]}</p>
                  <button
                    type="button"
                    onClick={() => unlock(offerTier)}
                    disabled={pending}
                    className="shrink-0 cursor-pointer rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {isPending ? 'Starting…' : `Unlock — €${meta.prices.once.amount}`}
                  </button>
                </li>
              );
            })}
          </ul>
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
