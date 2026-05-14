'use client';

import { useTransition } from 'react';

import { removeOrgMemberAction } from '@/app/(authed)/app/orgs/actions';
import type { OrgMember } from '@/lib/orgs/types';

interface Props {
  orgId: string;
  member: OrgMember;
  canRemove: boolean;
}

export function MemberRow({ orgId, member, canRemove }: Props) {
  const [pending, start] = useTransition();

  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-zinc-900/10 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar url={member.avatar_url} name={member.full_name ?? member.email} />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-zinc-950">
            {member.full_name ?? member.email}
          </p>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {member.email} · {member.role}
          </p>
        </div>
      </div>
      {canRemove ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await removeOrgMemberAction(orgId, member.profile_id);
            })
          }
          className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-zinc-900/10 px-3 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-900/5 disabled:opacity-60"
        >
          {pending ? 'Removing…' : 'Remove'}
        </button>
      ) : null}
    </li>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-9 w-9 rounded-full object-cover" />;
  }
  const initial = name.charAt(0).toUpperCase();
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c0613d]/15 text-[13px] font-semibold text-[#c0613d]">
      {initial}
    </span>
  );
}
