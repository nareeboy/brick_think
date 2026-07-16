import type { Metadata } from 'next';

import { SITE_NAME } from './site';

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
 * canonical URL, and Open Graph / Twitter cards. The default OG image is
 * supplied site-wide by app/opengraph-image.png, so we only set the textual
 * fields here. OG/Twitter titles carry the " · BrickThink" suffix (the root
 * title template only applies to the document <title>, not OG tags).
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
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
    },
  };
}
