import Link from 'next/link';

import { DotGridPlaceholder } from '@/components/app/DotGridPlaceholder';
import type { SessionStatus } from '@/lib/sessions/types';

interface SessionRow {
  id: string;
  title: string;
  status: SessionStatus;
  updated_at: string;
  /** Signed URL of the newest design thumbnail in this session, if any. */
  thumbnail_url: string | null;
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  if (sessions.length === 0) {
    return (
      <div
        data-testid="sessions-empty-state"
        className="rounded-2xl border border-dashed border-zinc-900/10 bg-white p-10 text-center"
      >
        <p className="text-[14px] text-zinc-600">
          No sessions yet. Use the form above to create one.
        </p>
      </div>
    );
  }

  return (
    <ul
      data-testid="sessions-list"
      className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
    >
      {sessions.map((row) => (
        <li key={row.id} data-scroll-target="">
          <Link
            href={`/app/sessions/${row.id}`}
            data-testid={`session-card-${row.id}`}
            className="group flex h-full flex-col gap-2 rounded-2xl border border-zinc-900/10 bg-white p-4 transition-colors hover:border-zinc-900/20"
          >
            <div
              data-testid={`session-thumb-${row.id}`}
              className="relative mb-1 aspect-[4/3] overflow-hidden rounded-xl border border-zinc-900/5 bg-[#FBF7F1]"
            >
              {row.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase signed URLs bypass next/image
                <img
                  src={row.thumbnail_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : (
                <DotGridPlaceholder />
              )}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {row.status}
            </p>
            <h3 className="text-[18px] font-semibold tracking-tight text-zinc-950 group-hover:text-[#a8482a]">
              {row.title}
            </h3>
            <p className="mt-auto text-[12px] text-zinc-500">
              Updated {formatRelative(row.updated_at)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
