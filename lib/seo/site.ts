// Single source of truth for site-wide SEO constants. metadataBase in the
// root layout and every absolute URL emitted in JSON-LD derive from SITE_URL.
export const SITE_URL = 'https://www.brickthink.io';
export const SITE_NAME = 'BrickThink';
export const SITE_DESCRIPTION =
  'A virtual way to allow your teams to remotely conduct LEGO® SERIOUS PLAY®.';

// Public profiles, used as Organization.sameAs in structured data. Kept in
// sync with the footer links in components/marketing/MarketingChrome.tsx.
export const SITE_SAME_AS = [
  'https://github.com/nareeboy/brick_think',
  'https://www.linkedin.com/company/brickthink',
  'https://x.com/brick_think',
  'https://www.instagram.com/brick_think/',
  'https://www.tiktok.com/@brickthink',
];

/** Resolve a site-relative path to an absolute URL for crawlers / JSON-LD. */
export function absoluteUrl(path: string): string {
  if (path === '/' || path === '') return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
