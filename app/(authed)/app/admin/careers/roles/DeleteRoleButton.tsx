'use client';

import { useTransition } from 'react';

import { deleteRoleAction } from './actions';

interface Props {
  id: string;
}

export function DeleteRoleButton({ id }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await deleteRoleAction(id);
        });
      }}
      className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
