import type { Metadata, Viewport } from 'next';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteBanner } from '@/components/banner/SiteBanner';
import { CookieConsent } from '@/components/consent/CookieConsent';
import { JsonLd } from '@/components/seo/JsonLd';
import { siteGraph } from '@/lib/seo/jsonLd';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo/site';
import './globals.css';

const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_GB',
    url: SITE_URL,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c10' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body>
        <JsonLd data={siteGraph()} />
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <SiteBanner />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
