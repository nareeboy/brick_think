'use client';

import { openCookiePreferences } from '@/lib/consent/state';

export function ManageCookiesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => openCookiePreferences()}
      className={
        className ??
        'cursor-pointer text-[13px] text-zinc-600 transition-colors hover:text-zinc-900'
      }
    >
      Cookies
    </button>
  );
}
