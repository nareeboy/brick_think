// Pure helpers for building the app's frame-related security headers. Kept
// framework-free so next.config.ts and the unit tests can share one source of
// truth without booting Next.
//
// Background: by default BrickThink forbids all framing (anti-clickjacking) via
// `frame-ancestors 'none'` + `X-Frame-Options: DENY`. To be embeddable as a
// WorkAdventure co-website, specific embedder origins must be allow-listed.
// The allow-list is supplied at runtime through the FRAME_ANCESTORS env var so
// each environment can decide who may frame it without a code change. When the
// var is unset, the hardened default (deny all) is preserved.

/**
 * Parse the raw FRAME_ANCESTORS env value into a list of CSP source
 * expressions. Accepts whitespace- and/or comma-separated origins, e.g.
 * `"https://*.workadventu.re https://workadventu.re"` or `"*"`.
 */
export function parseFrameAncestors(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Build the Content-Security-Policy header value. The frame-ancestors directive
 * is derived from the configured embedder origins: when none are configured,
 * framing is denied (`'none'`); otherwise `'self'` plus each configured origin
 * is allowed. `base-uri` and `object-src` are always locked down.
 */
export function buildCsp(frameAncestorsEnv: string | undefined | null): string {
  const ancestors = parseFrameAncestors(frameAncestorsEnv);
  const frameAncestors =
    ancestors.length > 0
      ? `frame-ancestors 'self' ${ancestors.join(' ')}`
      : "frame-ancestors 'none'";
  return [frameAncestors, "base-uri 'self'", "object-src 'none'"].join('; ');
}

/**
 * Whether the legacy `X-Frame-Options` header should still be emitted. It can
 * only express deny-all / same-origin, so once any cross-origin embedder is
 * allow-listed it must be dropped — otherwise its DENY value would override the
 * intent of `frame-ancestors` in older browsers. Returns true (keep DENY) only
 * when no embedder is configured.
 */
export function shouldSendXFrameOptionsDeny(frameAncestorsEnv: string | undefined | null): boolean {
  return parseFrameAncestors(frameAncestorsEnv).length === 0;
}
