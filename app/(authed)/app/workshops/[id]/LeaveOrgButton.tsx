'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { removeOrgMemberAction } from '@/app/(authed)/app/workshops/actions';
import { ModalBackdrop } from '@/components/app/ModalBackdrop';

interface Props {
  orgId: string;
  profileId: string;
}

export function LeaveOrgButton({ orgId, profileId }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Leave workshop"
        title="Leave workshop"
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 text-zinc-700 transition-colors hover:bg-zinc-900/5"
      >
        <LeaveIcon className="h-4 w-4" />
      </button>

      {confirming ? (
        <ModalBackdrop titleId={titleId} onClose={() => setConfirming(false)}>
          <div className="rounded-2xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)]">
            <h2 id={titleId} className="text-[18px] font-semibold tracking-tight text-zinc-950">
              Leave this workshop?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">
              You will lose access to its sessions and shared designs. An admin can re-add you
              later.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="cursor-pointer rounded-md px-3 py-2 text-[13px] font-medium text-zinc-600 hover:bg-zinc-900/5 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await removeOrgMemberAction(orgId, profileId);
                    router.push('/app/workshops');
                  })
                }
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-[#c0613d] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
              >
                {pending ? 'Leaving…' : 'Leave'}
              </button>
            </div>
          </div>
        </ModalBackdrop>
      ) : null}
    </>
  );
}

function LeaveIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
