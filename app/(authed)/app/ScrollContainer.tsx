'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * The single scroll surface for the authed app. It lives in the persistent
 * layout, so it survives client-side navigations between authed routes — which
 * means it also *keeps* its scroll offset across them. Next.js' built-in
 * scroll-to-top on navigation only acts on the document/window, and here the
 * document is pinned at `h-[100dvh]` while this inner element is the real
 * scroller, so Next never resets it.
 *
 * The visible symptom: navigating into a page from a scrolled-down route (e.g.
 * a long list) lands you mid-page, with the `PageBanner` at the top scrolled
 * out of view. Resetting to the top on every pathname change fixes it for every
 * authed page. `usePathname()` excludes the query string, so same-route filter
 * changes (My Designs `?filter=`, onboarding `?onboarding=`) don't trigger a
 * jarring reset.
 */
export function ScrollContainer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = 0;
    el.scrollLeft = 0;
  }, [pathname]);

  return (
    <div
      ref={ref}
      data-testid="authed-scroll"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
    >
      {children}
    </div>
  );
}
