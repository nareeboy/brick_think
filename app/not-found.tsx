import type { Metadata } from 'next';
import Link from 'next/link';

import {
  ErrorPageShell,
  MissingBrickScene,
  PRIMARY_ACTION_CLASS,
  SECONDARY_ACTION_CLASS,
} from '@/components/marketing/ErrorPageShell';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <ErrorPageShell
      kicker="Error 404"
      title="This page hasn't been built."
      description="There's no page at this address — it may have been moved, renamed, or never existed. Head back to a solid base and start from there."
      scene={<MissingBrickScene />}
    >
      <Link href="/" className={PRIMARY_ACTION_CLASS}>
        Back to home
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <Link href="/help" className={SECONDARY_ACTION_CLASS}>
        Help &amp; FAQ
      </Link>
    </ErrorPageShell>
  );
}

function ArrowRight({ className = '' }: { className?: string }) {
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
