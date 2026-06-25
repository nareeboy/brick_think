import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // /app/* is the authed product (also noindex'd at the layout level);
        // /share/* are unguessable session links; /api/* is non-content.
        disallow: ['/app/', '/share/', '/api/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
