// components/banner/SiteBannerClient.tsx
'use client';

import { useEffect, useState } from 'react';

import { BannerIcon } from '@/components/banner/BannerIcon';
import { BANNER_TYPE_STYLES, type BannerType } from '@/lib/banner/constants';

const DISMISS_KEY = 'bt-banner-dismissed';

export function SiteBannerClient({
  type,
  message,
  version,
}: {
  type: BannerType;
  message: string;
  version: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  // After hydration, hide if this exact version was already dismissed. A new
  // save bumps `version`, so an edited banner re-appears.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === version) {
        setDismissed(true);
      }
    } catch {
      // localStorage unavailable (private mode / blocked) — keep showing.
    }
  }, [version]);

  if (dismissed) return null;

  const styles = BANNER_TYPE_STYLES[type];

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, version);
    } catch {
      // ignore — still hide for this view
    }
    setDismissed(true);
  }

  return (
    <div
      id="site-banner"
      data-banner-version={version}
      suppressHydrationWarning
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 border-b px-4 py-2.5 text-sm ${styles.container}`}
    >
      <BannerIcon type={type} className={`shrink-0 ${styles.icon}`} />
      <p className="min-w-0 flex-1">{message}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="shrink-0 cursor-pointer rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
