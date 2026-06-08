'use client';

import { useId } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';
import { tierMetaFor, type Tier } from '@/lib/billing/plans';

export function TierDetailsModal({ tier, onClose }: { tier: Tier; onClose: () => void }) {
  const titleId = useId();
  const meta = tierMetaFor(tier);

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId} panelClassName="w-full max-w-lg">
      <div className="max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="font-display text-xl font-medium text-zinc-950">
          {meta.name}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">{meta.tagline}</p>

        <p className="mt-3 text-[13px] font-medium text-zinc-700">
          €{meta.prices.once.amount} / session · €{meta.prices.monthly.amount} / month · €
          {meta.prices.yearly.amount.toLocaleString('en-GB')} / year
        </p>

        <dl className="mt-5 space-y-4 border-t border-zinc-900/10 pt-5">
          {meta.details.map((d) => (
            <div key={d.title}>
              <dt className="text-sm font-semibold text-zinc-950">{d.title}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-zinc-600">{d.body}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-zinc-900/15 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
