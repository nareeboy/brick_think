import Link from 'next/link';

import { BrickGlyph } from '@/components/app/BrickGlyph';
import { ContextSwitcher } from '@/components/app/ContextSwitcher';
import { HeaderInner } from '@/components/app/HeaderInner';
import { HeaderNav } from '@/components/app/HeaderNav';
import type { OrgSummary } from '@/lib/orgs/types';

interface Props {
  orgs: OrgSummary[];
  activeOrgId: string | null;
  userName: string;
  userEmail: string | null;
}

export function GlobalHeader({ orgs, activeOrgId, userName, userEmail }: Props) {
  return (
    <header className="shrink-0 border-b border-zinc-900/5 bg-white">
      <HeaderInner>
        <div className="flex items-center gap-4">
          <Link
            href="/app/designs"
            aria-label="BrickThink — go to my designs"
            className="inline-flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-zinc-900/5"
          >
            <BrickGlyph />
            <span className="hidden text-[15px] font-semibold tracking-tight text-zinc-900 sm:inline">
              BrickThink
            </span>
          </Link>
          <HeaderNav />
        </div>

        <div className="flex items-center gap-2">
          <ContextSwitcher orgs={orgs} activeOrgId={activeOrgId} />
          <div className="mx-1 hidden h-6 w-px bg-zinc-900/10 md:block" aria-hidden="true" />
          <span
            className="hidden max-w-[280px] truncate text-[13px] font-medium text-zinc-700 md:inline"
            title={userEmail ?? userName}
            data-testid="current-user-name"
          >
            {userName}
          </span>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              data-testid="sign-out-button"
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-900/10 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
            >
              <SignOutIcon />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </HeaderInner>
    </header>
  );
}

function SignOutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M10 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
