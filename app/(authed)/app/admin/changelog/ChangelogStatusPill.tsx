// app/(authed)/app/admin/changelog/ChangelogStatusPill.tsx
import type { ChangelogStatus } from '@/lib/changelog/types';

export function ChangelogStatusPill({ status }: { status: ChangelogStatus }) {
  const published = status === 'published';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
        published ? 'bg-green-500/10 text-green-700' : 'bg-zinc-500/10 text-zinc-600'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${published ? 'bg-green-600' : 'bg-zinc-500'}`} />
      {published ? 'Published' : 'Draft'}
    </span>
  );
}
