import Link from 'next/link';

import { stageLabel } from '@/lib/sessions/stage-labels';
import type { SessionContext } from '@/lib/sessions/types';

export function BuilderBreadcrumb({ sessionContext }: { sessionContext: SessionContext }) {
  return (
    <div
      className="flex flex-wrap items-baseline gap-1.5 text-[12px] text-zinc-600"
      data-testid="builder-breadcrumb"
    >
      <Link
        href={`/app/sessions/${sessionContext.sessionId}`}
        className="font-medium text-zinc-700 underline-offset-2 hover:underline"
      >
        {sessionContext.sessionTitle}
      </Link>
      <span aria-hidden="true" className="text-zinc-400">
        ›
      </span>
      <span>{stageLabel(sessionContext.stageType)}</span>
    </div>
  );
}
