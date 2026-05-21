import type { NextConfig } from 'next';

// Baseline Content-Security-Policy applied to every response. Intentionally
// narrow: only the directives that are pure additions and can't break the
// existing OAuth, Supabase, or Yjs flows. A fuller script-src/connect-src
// CSP would need per-request nonces via middleware, which is a follow-up.
const BASELINE_CSP = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
      { source: '/app/sessions', destination: '/app/orgs', permanent: true },
      { source: '/app/sessions/new', destination: '/app/orgs', permanent: true },
    ];
  },
};

export default nextConfig;
