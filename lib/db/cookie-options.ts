import type { CookieOptionsWithName } from '@supabase/ssr';

// When BrickThink is embedded in a cross-site iframe (e.g. a WorkAdventure
// co-website), the browser only sends auth cookies if they are
// `SameSite=None; Secure`. `Secure` requires HTTPS — every deployed Railway
// environment (production, preview, staging, test) serves over HTTPS, but local
// `pnpm dev` runs on http://localhost where a `Secure` cookie would be silently
// dropped, breaking sign-in. So locally we fall back to `SameSite=Lax`
// (iframe embedding isn't needed during local development anyway).
//
// `isHttps` is parameterised so both branches stay unit-testable; the default
// derives it from NODE_ENV, which is the only signal that distinguishes the
// HTTP local dev server from every HTTPS deployment.
export function getAuthCookieOptions(
  isHttps: boolean = process.env.NODE_ENV === 'production',
): CookieOptionsWithName {
  return isHttps ? { sameSite: 'none', secure: true } : { sameSite: 'lax', secure: false };
}
