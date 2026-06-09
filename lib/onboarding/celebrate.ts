// A small, brand-coloured confetti burst for genuine onboarding milestones
// (the walkthrough finishing, the checklist reaching all-done) — NOT for every
// intermediate step, which would get tiresome fast.
//
// canvas-confetti is loaded lazily so it never lands in the SSR/initial bundle;
// it only touches `document` when fired, on the client. The burst is silent and
// brief, and is suppressed for `prefers-reduced-motion` users — both by an
// explicit media-query check here (so we don't even load the module) and by
// canvas-confetti's own `disableForReducedMotion` guard as a backstop.

// Brand palette: terracotta + its lighter tint + the sage accent.
const BRAND_COLORS = ['#a8482a', '#cf6e47', '#5f7d72', '#e7d3c5'];

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Fire a single celebratory confetti burst. No-ops on the server and for
 * reduced-motion users. Safe to call from event handlers and effects — failures
 * to load the module are swallowed so a missing celebration never breaks a flow.
 */
export async function celebrate(): Promise<void> {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;

  try {
    const { default: confetti } = await import('canvas-confetti');
    const shared = {
      colors: BRAND_COLORS,
      disableForReducedMotion: true,
      // Above the spotlight overlay (z-50) and modals so it isn't clipped.
      zIndex: 60,
      scalar: 0.9,
      ticks: 160,
    } as const;
    // A centre pop plus two side cannons reads as celebratory without being a
    // full-screen takeover.
    confetti({ ...shared, particleCount: 70, spread: 70, startVelocity: 38, origin: { y: 0.62 } });
    confetti({ ...shared, particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
    confetti({ ...shared, particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
  } catch {
    // canvas-confetti failed to load — a missing flourish is not worth surfacing.
  }
}
