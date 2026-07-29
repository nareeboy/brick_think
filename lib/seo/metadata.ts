import type { Metadata } from 'next';

import { SITE_NAME, SITE_TITLE } from './site';

/**
 * Site-wide social card. Next merges route metadata shallowly, so a page-level
 * `openGraph` block replaces the root layout's — including the image injected
 * by the app/opengraph-image.png file convention. Every page that sets its own
 * openGraph/twitter must therefore carry the image explicitly.
 */
export const SITE_OG_IMAGE = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: SITE_TITLE,
};

interface PageMetadataInput {
  /** Document <title>; the root template appends " · BrickThink". */
  title: string;
  /**
   * Render the title exactly as given, bypassing the root " · BrickThink"
   * template. Use for SEO-tuned titles that already carry the brand (or
   * deliberately omit it) and must stay within the ~60-character SERP limit.
   */
  absoluteTitle?: boolean;
  description: string;
  /** Site-relative canonical path, e.g. "/about" or "/" for the home page. */
  path: string;
}

/**
 * Build per-page Metadata for a static marketing page: title, description,
 * canonical URL, and Open Graph / Twitter cards (including the site-wide
 * social image — see SITE_OG_IMAGE). OG/Twitter titles carry the
 * " · BrickThink" suffix (the root title template only applies to the
 * document <title>, not OG tags).
 */
export function pageMetadata({
  title,
  absoluteTitle,
  description,
  path,
}: PageMetadataInput): Metadata {
  const canonical = path === '/' ? '/' : path.replace(/\/+$/, '');
  const socialTitle = absoluteTitle || title === SITE_NAME ? title : `${title} · ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_GB',
      images: [SITE_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [SITE_OG_IMAGE],
    },
  };
}
