'use client';

import { useTransition } from 'react';

import { removeOrgMemberAction } from '@/app/(authed)/app/orgs/actions';
import { Avatar } from '@/components/app/Avatar';
import type { OrgMember } from '@/lib/orgs/types';

interface Props {
  orgId: string;
  member: OrgMember;
  canRemove: boolean;
}

export function MemberRow({ orgId, member, canRemove }: Props) {
  const [pending, start] = useTransition();
  const displayName = member.full_name ?? member.email;

  return (
    <li className="group relative flex flex-col gap-4 rounded-2xl border border-zinc-900/10 bg-white p-5 transition-colors hover:bg-[#FAF7F1]">
      <div className="flex items-center gap-3">
        <Avatar url={member.avatar_url} name={displayName} size="lg" />
        <span className="inline-flex items-center rounded-md bg-zinc-900/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">
          {member.role}
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-zinc-950">{displayName}</p>
        <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {member.email}
        </p>
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
          aria-label={`Remove ${displayName}`}
          title="Remove member"
          className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-zinc-400 opacity-0 transition-all hover:bg-zinc-900/5 hover:text-zinc-700 group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40 [@media(hover:none)]:opacity-100"
        >
          {pending ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <CloseIcon className="h-4 w-4" />
          )}
        </button>
      ) : null}
    </li>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`animate-spin ${className}`}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
