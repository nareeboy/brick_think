import type { NextConfig } from 'next';

// Baseline Content-Security-Policy applied to every response. Intentionally
// narrow: only the directives that are pure additions and can't break the
// existing OAuth, Supabase, or Yjs flows. A fuller script-src/connect-src
// CSP would need per-request nonces via middleware, which is a follow-up.
const BASELINE_CSP = ["frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'"].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Server Actions cap request bodies at 1 MB by default, but the article
    // cover upload (uploadCoverImageAction) accepts images up to 2 MB
    // (ARTICLE_COVER_MAX_BYTES). A 1–2 MB cover — typical for photo JPGs — was
    // rejected by the Server Action runtime *before* the action ran, surfacing
    // as a 500 on the POST rather than the action's own `invalid_cover` result.
    // Lift the transport limit above the 2 MB cover cap, with headroom for
    // multipart/form-data overhead, so the validation cap is the real gate.
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: BASELINE_CSP },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      {
        source: '/share/:token',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/app/designs', destination: '/app/my-designs', permanent: true },
      { source: '/app/sessions', destination: '/app/workshops', permanent: true },
      { source: '/app/sessions/new', destination: '/app/workshops', permanent: true },
      { source: '/app/orgs', destination: '/app/workshops', permanent: true },
      { source: '/app/orgs/:path*', destination: '/app/workshops/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
