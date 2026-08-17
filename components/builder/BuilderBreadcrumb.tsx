import Link from 'next/link';

import type { SessionContext } from '@/lib/sessions/types';

export function BuilderBreadcrumb({ sessionContext }: { sessionContext: SessionContext }) {
  return (
    <Link
      href={`/app/sessions/${sessionContext.sessionId}`}
      className="inline-flex items-center gap-1 self-start text-[13px] font-bold text-zinc-900 underline-offset-2 hover:underline"
      data-testid="builder-breadcrumb"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      Back to session
    </Link>
  );
}
