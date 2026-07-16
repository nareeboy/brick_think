'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import {
  ErrorPageShell,
  PRIMARY_ACTION_CLASS,
  SECONDARY_ACTION_CLASS,
  TumbledBrickScene,
} from '@/components/marketing/ErrorPageShell';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPageShell
      kicker="Unexpected error"
      title="Something came apart."
      description="An unexpected error stopped this page from loading. It's on us — try again, and if it keeps happening, head back to home and give it a moment."
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
  );
}
