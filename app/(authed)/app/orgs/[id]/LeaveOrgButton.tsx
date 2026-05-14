'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { removeOrgMemberAction } from '@/app/(authed)/app/orgs/actions';

interface Props {
  orgId: string;
  profileId: string;
}

export function LeaveOrgButton({ orgId, profileId }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 px-3 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-900/5"
      >
        Leave organisation
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-zinc-700">Leave this org?</span>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-3 text-[12px] font-semibold text-zinc-600 hover:bg-zinc-900/5"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await removeOrgMemberAction(orgId, profileId);
            router.push('/app/orgs');
          })
        }
        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-[#c0613d] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#cf6e47] disabled:opacity-60"
      >
        {pending ? 'Leaving…' : 'Leave'}
      </button>
    </div>
  );
}
