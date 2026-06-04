'use client';

import { useTransition } from 'react';

import { setRoleOpenAction } from './actions';

interface Props {
  id: string;
  isOpen: boolean;
}

export function RoleToggleButton({ id, isOpen }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await setRoleOpenAction(id, !isOpen);
        });
      }}
      className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
    >
      {pending ? 'Saving…' : isOpen ? 'Close role' : 'Reopen role'}
    </button>
  );
}
