import type { NextConfig } from 'next';

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
