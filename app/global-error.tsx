'use client';

import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { useEffect } from 'react';

import {
  ErrorPageShell,
  PRIMARY_ACTION_CLASS,
  SECONDARY_ACTION_CLASS,
  TumbledBrickScene,
} from '@/components/marketing/ErrorPageShell';
import './globals.css';

// Rendered only when the root layout itself throws, replacing it entirely —
// so this file re-declares <html>/<body> and re-instantiates the fonts.

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

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
    >
      <body>
        <ErrorPageShell
          kicker="Unexpected error"
          title="Something came apart."
          description="An unexpected error stopped BrickThink from loading. It's on us — try again, and if it keeps happening, give it a moment before reloading."
          scene={<TumbledBrickScene />}
          footnote={error.digest ? <>Reference: {error.digest}</> : undefined}
        >
          <button type="button" onClick={reset} className={PRIMARY_ACTION_CLASS}>
            Try again
          </button>
          <Link href="/" className={SECONDARY_ACTION_CLASS}>
            Back to home
          </Link>
        </ErrorPageShell>
      </body>
    </html>
  );
}
