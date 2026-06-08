import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ManageCookiesButton } from '@/components/consent/ManageCookiesButton';
import { BetaListBadge } from '@/components/marketing/BetaListBadge';
import { LaunchIgniterBadge } from '@/components/marketing/LaunchIgniterBadge';
import { NickLaunchesBadge } from '@/components/marketing/NickLaunchesBadge';
import { PeerlistBadge } from '@/components/marketing/PeerlistBadge';
import { ProductHuntBadge } from '@/components/marketing/ProductHuntBadge';
import { SaasHubBadge } from '@/components/marketing/SaasHubBadge';
import { SourceForgeBadge } from '@/components/marketing/SourceForgeBadge';
import { StartupFameBadge } from '@/components/marketing/StartupFameBadge';
import { SourceForgeDownloadButton } from '@/components/marketing/SourceForgeDownloadButton';
import { TinyLaunchBadge } from '@/components/marketing/TinyLaunchBadge';
import { UneedBadge } from '@/components/marketing/UneedBadge';
import { getLatestPublishedVersionTag } from '@/lib/changelog/queries';

export const GITHUB_URL = 'https://github.com/nareeboy/brick_think';
export const LINKEDIN_URL = 'https://www.linkedin.com/company/brickthink';
export const TWITTER_URL = 'https://x.com/brick_think';
export const INSTAGRAM_URL = 'https://www.instagram.com/brick_think/';
export const TIKTOK_URL = 'https://www.tiktok.com/@brickthink';
export const SLACK_URL =
  'https://join.slack.com/t/brickthink/shared_invite/zt-3zy9dg1hi-ZVZCdIlfSS_6OYLrQj2R0w';
export const LEGO_SERIOUS_PLAY_URL = 'https://www.lego.com/en-ch/themes/serious-play';
export const LSP_DACH_COMMUNITY_URL = 'https://seriousplay.community/dach/';

const NAV_LINKS = [
  { href: '/what-is-lsp', label: 'What is LSP?' },
  { href: '/articles', label: 'Articles' },
  { href: '/about', label: 'About' },
  { href: '/help', label: 'Help' },
  { href: '/contact', label: 'Contact' },
];

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <NavBar />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}

export function NavBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-900/5 bg-[#FAF7F1]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-zinc-900">
          <BrickGlyph />
          <span className="text-[15px] font-semibold tracking-tight">BrickThink</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/sign-in"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

// Site-wide "Featured on" wall sitting above the footer columns. A logo strip
// for every place BrickThink has launched / been featured. Add new badges to
// the centred row — it wraps cleanly as the list grows.
function FeaturedOnBand() {
  return (
    <div className="border-b border-zinc-900/10">
      <div className="mx-auto max-w-7xl px-6 py-10 md:py-12">
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Featured on
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          <ProductHuntBadge />
          <StartupFameBadge />
          <LaunchIgniterBadge />
          <UneedBadge />
          <TinyLaunchBadge />
          <SourceForgeBadge imgClassName="h-[calc(var(--spacing)*21)] w-auto" />
          <SourceForgeDownloadButton />
          <a
            href={LSP_DACH_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-md transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0613d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F1]"
          >
            <Image
              src="/dach-logo.png"
              alt="LEGO® SERIOUS PLAY® Community DACH"
              width={596}
              height={216}
              className="h-14 w-auto object-contain"
            />
            <span className="sr-only">— visit the LEGO® SERIOUS PLAY® Community DACH website</span>
          </a>
          <PeerlistBadge />
          <SaasHubBadge />
          <NickLaunchesBadge />
          <BetaListBadge />
        </div>
      </div>
    </div>
  );
}

export async function Footer() {
  const versionTag = await getLatestPublishedVersionTag();
  return (
    <footer className="border-t border-zinc-900/10">
      <FeaturedOnBand />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Link href="/" className="flex items-center gap-2 text-zinc-900">
            <BrickGlyph />
            <span className="text-[15px] font-semibold tracking-tight">BrickThink</span>
          </Link>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-zinc-600">
            A remote-native platform for the five-stage LEGO® SERIOUS PLAY® methodology. Built on
            Next.js, Supabase and Claude.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="BrickThink on GitHub"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-900/10 bg-white/60 text-zinc-700 transition-colors hover:border-zinc-900/20 hover:bg-white hover:text-zinc-950"
            >
              <GitHubGlyph className="h-4 w-4" />
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="BrickThink on LinkedIn"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-900/10 bg-white/60 text-zinc-700 transition-colors hover:border-zinc-900/20 hover:bg-white hover:text-zinc-950"
            >
              <LinkedInGlyph className="h-4 w-4" />
            </a>
            <a
              href={TWITTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="BrickThink on X"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-900/10 bg-white/60 text-zinc-700 transition-colors hover:border-zinc-900/20 hover:bg-white hover:text-zinc-950"
            >
              <XGlyph className="h-4 w-4" />
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="BrickThink on Instagram"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-900/10 bg-white/60 text-zinc-700 transition-colors hover:border-zinc-900/20 hover:bg-white hover:text-zinc-950"
            >
              <InstagramGlyph className="h-4 w-4" />
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="BrickThink on TikTok"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-900/10 bg-white/60 text-zinc-700 transition-colors hover:border-zinc-900/20 hover:bg-white hover:text-zinc-950"
            >
              <TikTokGlyph className="h-4 w-4" />
            </a>
            <a
              href={SLACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join the BrickThink community on Slack"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-900/10 bg-white/60 text-zinc-700 transition-colors hover:border-zinc-900/20 hover:bg-white hover:text-zinc-950"
            >
              <SlackGlyph className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="md:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Product</p>
          <ul className="mt-3 space-y-2 text-[13px] text-zinc-700">
            <li>
              <Link href="/what-is-lsp" className="hover:text-zinc-950">
                What is LSP?
              </Link>
            </li>
            <li>
              <Link href="/#methodology" className="hover:text-zinc-950">
                Methodology
              </Link>
            </li>
            <li>
              <Link href="/#features" className="hover:text-zinc-950">
                Features
              </Link>
            </li>
            <li>
              <Link href="/#open-source" className="hover:text-zinc-950">
                Open source
              </Link>
            </li>
            <li>
              <a
                href={LEGO_SERIOUS_PLAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-950"
              >
                Buy the Pieces
              </a>
            </li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Company</p>
          <ul className="mt-3 space-y-2 text-[13px] text-zinc-700">
            <li>
              <Link href="/about" className="hover:text-zinc-950">
                About
              </Link>
            </li>
            <li>
              <Link href="/careers" className="hover:text-zinc-950">
                Careers
              </Link>
            </li>
            <li>
              <Link href="/changelog" className="hover:text-zinc-950">
                Changelog
              </Link>
            </li>
            <li>
              <Link href="/roadmap" className="hover:text-zinc-950">
                Roadmap
              </Link>
            </li>
            <li>
              <Link href="/help" className="hover:text-zinc-950">
                Help &amp; FAQ
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-zinc-950">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Status</p>
          <Link
            href="/roadmap"
            className="mt-3 inline-flex items-center gap-2 text-[13px] text-zinc-700 hover:text-zinc-950"
          >
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Phase 1 — Feedback
          </Link>
          <p className="mt-2 text-[13px] text-zinc-600">
            WCAG 2.2 AA. GDPR-aligned. EU data residency. Always free.
          </p>
        </div>
      </div>
      <div className="border-t border-zinc-900/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-6 py-5 text-[12px] text-zinc-500 md:flex-row md:items-center">
          <div className="max-w-3xl space-y-1">
            <p>
              © BrickThink. The LEGO® SERIOUS PLAY® methodology is referenced under CC BY-SA 3.0.
            </p>
            <p>
              LEGO®, SERIOUS PLAY®, IMAGINOPEDIA, the Minifigure and the Brick and Knob
              configurations are trademarks of the LEGO Group, which does not sponsor, authorize or
              endorse this product.
            </p>
          </div>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link href="/terms" className="hover:text-zinc-800">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-zinc-800">
              Privacy
            </Link>
            <ManageCookiesButton className="cursor-pointer text-[12px] text-zinc-500 transition-colors hover:text-zinc-800" />
            {versionTag ? (
              <span className="text-[12px] text-zinc-500">
                {'— '}
                <Link href="/changelog" className="text-zinc-500 hover:text-zinc-800">
                  {versionTag}
                </Link>
              </span>
            ) : null}
          </nav>
        </div>
      </div>
    </footer>
  );
}

export function BrickGlyph() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#c0613d] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),0_2px_0_rgba(255,255,255,0.4)_inset]">
      <span className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-black/20" />
      <span className="absolute right-1/4 top-1.5 h-1.5 w-1.5 translate-x-1/2 rounded-full bg-black/20" />
    </span>
  );
}

export function ArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function GitHubGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.236 1.839 1.236 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.103.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z"
      />
    </svg>
  );
}

export function LinkedInGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function XGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function InstagramGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

export function TikTokGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export function SlackGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

export function ArrowUpRight({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

const CTA_BRICKS: { src: string; left: string; top: string; width: string; ratio: number }[] = [
  {
    src: '/bricks/flat-3-orange-medium-left.png',
    left: '4%',
    top: '12%',
    width: '46%',
    ratio: 1268 / 902,
  },
  {
    src: '/bricks/block-navy-medium-left.png',
    left: '70%',
    top: '22%',
    width: '22%',
    ratio: 1059 / 918,
  },
  {
    src: '/bricks/block-yellow-medium.png',
    left: '36%',
    top: '44%',
    width: '24%',
    ratio: 1051 / 913,
  },
  {
    src: '/bricks/block-green-medium-left.png',
    left: '8%',
    top: '68%',
    width: '26%',
    ratio: 1059 / 917,
  },
  {
    src: '/bricks/flat-1-black-large-left.png',
    left: '50%',
    top: '70%',
    width: '42%',
    ratio: 1760 / 1112,
  },
];

export function CtaBricks() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {CTA_BRICKS.map((b) => (
        <span
          key={b.src}
          className="absolute drop-shadow-[0_8px_14px_rgba(60,30,15,0.2)]"
          style={{
            left: b.left,
            top: b.top,
            width: b.width,
            aspectRatio: b.ratio,
            backgroundImage: `url(${b.src})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
      ))}
    </div>
  );
}

export function PlusGlyph({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
