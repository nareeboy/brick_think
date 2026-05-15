import Link from 'next/link';

import type { SessionStatus } from '@/lib/sessions/types';

interface SessionRow {
  id: string;
  title: string;
  status: SessionStatus;
  updated_at: string;
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
        <li key={row.id}>
          <Link
            href={`/app/sessions/${row.id}`}
            data-testid={`session-card-${row.id}`}
            className="group flex h-full flex-col gap-2 rounded-2xl border border-zinc-900/10 bg-white p-5 transition-colors hover:border-zinc-900/20"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {row.status}
            </p>
            <h3 className="text-[18px] font-semibold tracking-tight text-zinc-950 group-hover:text-[#c0613d]">
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
