'use client';

import { useId } from 'react';

import { ModalBackdrop } from '@/components/app/ModalBackdrop';

interface Props {
  open: boolean;
  onClose: () => void;
  feature: string;
}

export default function UpgradeModal({ open, onClose, feature }: Props) {
  const titleId = useId();

  if (!open) return null;

  return (
    <ModalBackdrop onClose={onClose} titleId={titleId}>
      <div className="rounded-2xl border border-zinc-900/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
        <h2 id={titleId} className="font-display text-lg font-medium text-zinc-900">
          Subscribe to continue
        </h2>
        <p className="mt-2 text-sm text-zinc-600">{feature} is a paid feature on brickthink.io.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-900/15 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Not now
          </button>
          <a
            href="/app/account/billing"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
          >
            View plans
          </a>
        </div>
      </div>
    </ModalBackdrop>
  );
}
