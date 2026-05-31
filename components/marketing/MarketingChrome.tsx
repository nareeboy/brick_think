import Link from 'next/link';
import type { ReactNode } from 'react';

import { ManageCookiesButton } from '@/components/consent/ManageCookiesButton';

export const GITHUB_URL = 'https://github.com/nareeboy/brick_think';

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

export function Footer() {
  return (
    <footer className="border-t border-zinc-900/10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Link href="/" className="flex items-center gap-2 text-zinc-900">
            <BrickGlyph />
            <span className="text-[15px] font-semibold tracking-tight">BrickThink</span>
          </Link>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-zinc-600">
            A remote-native platform for the five-stage Serious Play methodology. Built on Next.js,
            Supabase and Claude.
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="BrickThink on GitHub"
            className="mt-5 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-900/10 bg-white/60 text-zinc-700 transition-colors hover:border-zinc-900/20 hover:bg-white hover:text-zinc-950"
          >
            <GitHubGlyph className="h-4 w-4" />
          </a>
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
              <Link href="/roadmap" className="hover:text-zinc-950">
                Roadmap
              </Link>
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
              <Link href="/help" className="hover:text-zinc-950">
                Help &amp; FAQ
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-zinc-950">
                Contact
              </Link>
            </li>
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-zinc-950"
              >
                <GitHubGlyph className="h-3.5 w-3.5" />
                GitHub
              </a>
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
            <p>© BrickThink. The Serious Play methodology is referenced under CC BY-SA 3.0.</p>
            <p>
              LEGO, SERIOUS PLAY, IMAGINOPEDIA, the Minifigure and the Brick and Knob configurations
              are trademarks of the LEGO Group, which does not sponsor, authorize or endorse this
              product.
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
  { src: '/bricks/flat-3-orange-medium-left.png', left: '4%', top: '12%', width: '46%', ratio: 1268 / 902 },
  { src: '/bricks/block-navy-medium-left.png', left: '70%', top: '22%', width: '22%', ratio: 1059 / 918 },
  { src: '/bricks/block-yellow-medium.png', left: '36%', top: '44%', width: '24%', ratio: 1051 / 913 },
  { src: '/bricks/block-green-medium-left.png', left: '8%', top: '68%', width: '26%', ratio: 1059 / 917 },
  { src: '/bricks/flat-1-black-large-left.png', left: '50%', top: '70%', width: '42%', ratio: 1760 / 1112 },
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
