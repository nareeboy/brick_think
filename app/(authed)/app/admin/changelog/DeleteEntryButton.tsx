// app/(authed)/app/admin/changelog/DeleteEntryButton.tsx
'use client';

import { useTransition } from 'react';

import { deleteEntryAction } from './actions';

export function DeleteEntryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await deleteEntryAction(id);
        });
      }}
      className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
