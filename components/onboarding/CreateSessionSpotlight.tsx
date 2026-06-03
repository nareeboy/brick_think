'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useLayoutEffect, useState } from 'react';

const TARGET_SELECTOR = '[data-tour-id="create-session-button"]';
const ONBOARDING_PARAM = 'onboarding';
const ONBOARDING_VALUE = 'create-session';

/**
 * A single-target spotlight that dims the screen and cuts out the "Create
 * session" button, reusing the SVG-mask technique from SpotlightTour. Triggered
 * by the onboarding checklist's step 2: its link carries
 * `?onboarding=create-session`, so clicking it from the org page (same-page
 * client nav) or from elsewhere (navigate to the user's first org) both land
 * here with the param set.
 *
 * Unlike the tour, the highlighted button stays clickable — the overlay is
 * pointer-events-none and only the tooltip captures clicks — so the user can
 * click straight through to open the new-session dialog (z-40, above this
 * z-30 overlay).
 */
export function CreateSessionSpotlight() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const bodyId = useId();
  const maskId = useId();

  const requested = searchParams.get(ONBOARDING_PARAM) === ONBOARDING_VALUE;
  const [dismissed, setDismissed] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const active = requested && !dismissed;

  const dismiss = useCallback(
    (stripParam: boolean) => {
      setDismissed(true);
      setRect(null);
      if (stripParam) {
        const next = new URLSearchParams(searchParams);
        next.delete(ONBOARDING_PARAM);
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }
    },
    [pathname, router, searchParams],
  );

  // Reset the dismissed latch whenever a fresh request comes in (e.g. the user
  // clicks the checklist step again after dismissing once).
  useEffect(() => {
    if (requested) setDismissed(false);
  }, [requested]);

  // Measure the target, tracking resize/scroll. Scrolls the button into view on
  // first activation so the cut-out is never off-screen.
  useLayoutEffect(() => {
    if (!active) return;
    const el = document.querySelector(TARGET_SELECTOR);
    if (!el) {
      // Target not on this page — nothing to highlight.
      dismiss(true);
      return;
    }
    // Nudge into view only if needed (block:'nearest' won't scroll a visible
    // element). The button lives in the page header so it's usually visible.
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    // Track the target every frame rather than only on scroll/resize: the
    // FacilitatorChecklist mounts after hydration and pushes the header down,
    // a layout shift that fires no scroll/resize event. The rAF loop keeps the
    // cut-out glued to the button through hydration, mount, and scroll. We only
    // setRect when the box actually moves, so it settles to a no-op quickly.
    let rafId = 0;
    let lastKey = '';
    const tick = () => {
      const r = el.getBoundingClientRect();
      const key = `${r.left},${r.top},${r.width},${r.height}`;
      if (key !== lastKey) {
        lastKey = key;
        setRect(r);
      }
      rafId = requestAnimationFrame(tick);
    };
    tick();

    // Clicking the highlighted button proceeds — hide the overlay so the
    // dialog is unobstructed. Don't strip the param here: a soft nav could
    // race the button's own click handler that opens the dialog.
    const onTargetClick = () => setDismissed(true);
    el.addEventListener('click', onTargetClick);
    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('click', onTargetClick);
    };
  }, [active, dismiss]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, dismiss]);

  if (!active || !rect) return null;

  const padding = 8;
  const x = rect.left - padding;
  const y = rect.top - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  // Tooltip sits below the button by default, flipping above if it would clip
  // the bottom of the viewport. Right-aligned to the button so it reads as
  // attached to a header-right action.
  const TOOLTIP_W = 300;
  const GAP = 14;
  const viewportH = window.innerHeight;
  let tooltipTop = rect.bottom + GAP;
  if (tooltipTop + 160 > viewportH) tooltipTop = Math.max(16, rect.top - 160 - GAP);
  let tooltipLeft = rect.right - TOOLTIP_W;
  if (tooltipLeft < 16) tooltipLeft = 16;

  return (
    <div data-testid="create-session-spotlight" className="pointer-events-none fixed inset-0 z-30">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full motion-safe:transition-opacity"
        width="100%"
        height="100%"
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} rx="10" fill="black" />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.55)"
          mask={`url(#${maskId})`}
        />
      </svg>
      <div
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        style={{ left: tooltipLeft, top: tooltipTop, width: TOOLTIP_W }}
        className="pointer-events-auto absolute rounded-2xl bg-white p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Get started
        </p>
        <h2 id={titleId} className="mt-1 text-[16px] font-semibold tracking-tight text-zinc-950">
          Create your first session
        </h2>
        <p id={bodyId} className="mt-2 text-[13px] leading-relaxed text-zinc-700">
          Click <span className="font-semibold text-zinc-900">Create session</span> to set up a
          working meeting inside this organisation.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => dismiss(true)}
            data-testid="create-session-spotlight-skip"
            className="cursor-pointer text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
