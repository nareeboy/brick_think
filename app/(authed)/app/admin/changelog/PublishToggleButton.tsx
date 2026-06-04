// app/(authed)/app/admin/changelog/PublishToggleButton.tsx
'use client';

import { useTransition } from 'react';

import { publishEntryAction, unpublishEntryAction } from './actions';
import type { ChangelogStatus } from '@/lib/changelog/types';

export function PublishToggleButton({ id, status }: { id: string; status: ChangelogStatus }) {
  const [pending, startTransition] = useTransition();
  const published = status === 'published';
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await (published ? unpublishEntryAction(id) : publishEntryAction(id));
        });
      }}
      className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-900/5 disabled:opacity-60"
    >
      {pending ? 'Saving…' : published ? 'Unpublish' : 'Publish'}
    </button>
  );
}
