import Link from 'next/link';

import { Avatar } from '@/components/app/Avatar';
import { BrickGlyph } from '@/components/app/BrickGlyph';
import { HeaderInner } from '@/components/app/HeaderInner';
import { HeaderNav } from '@/components/app/HeaderNav';
import { NotificationsBell } from '@/components/notifications/NotificationsBell';

interface Props {
  userName: string;
  userEmail: string | null;
  userAvatarUrl: string | null;
}

export function GlobalHeader({ userName, userEmail, userAvatarUrl }: Props) {
  return (
    <header className="shrink-0 border-b border-zinc-900/5 bg-white">
      <HeaderInner>
        <div className="flex items-center gap-4">
          <Link
            href="/app/my-designs"
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

        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2 pr-2" data-testid="header-user-block">
            <Avatar url={userAvatarUrl} name={userName} size="sm" />
            <span className="hidden max-w-[140px] truncate text-[13px] text-zinc-800 sm:inline">
              {userName}
            </span>
          </div>
          <div aria-hidden="true" className="h-6 w-px bg-zinc-900/10" />
          <a
            href="https://github.com/nareeboy/brick_think/issues"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Help — opens GitHub Issues in a new tab"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
          >
            <HelpIcon />
          </a>
          <NotificationsBell />
          <Link
            href="/app/account"
            aria-label="Account settings"
            title={userEmail ?? userName}
            data-testid="account-link"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
          >
            <CogIcon />
          </Link>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              aria-label="Sign out"
              data-testid="sign-out-button"
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900"
            >
              <SignOutIcon />
            </button>
          </form>
        </div>
      </HeaderInner>
    </header>
  );
}

function HelpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
