'use client';

import { useState, useTransition } from 'react';

import { DeleteConfirmDialog } from '@/components/app/DeleteConfirmDialog';

import { deleteArticleAction } from './actions';

interface Props {
  id: string;
  title: string;
}

export function DeleteArticleButton({ id, title }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete article: ${title}`}
        title="Delete"
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-700"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
          <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-7 0v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <DeleteConfirmDialog
          title="Delete article?"
          description={
            <>
              <strong>{title}</strong> will be removed permanently, along with its cover image.
              This can&apos;t be undone.
            </>
          }
          confirmLabel="Delete article"
          confirmPendingLabel="Deleting…"
          pending={pending}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            startTransition(async () => {
              await deleteArticleAction(id);
              // server action redirects on success; this only runs on failure
              setOpen(false);
            });
          }}
        />
      ) : null}
    </>
  );
}
