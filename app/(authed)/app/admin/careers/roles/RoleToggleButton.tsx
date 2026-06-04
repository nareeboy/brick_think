'use client';

import { useState, useTransition } from 'react';

import { setRoleOpenAction } from './actions';

interface Props {
  id: string;
  isOpen: boolean;
}

export function RoleToggleButton({ id, isOpen }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          // Toggle has no redirect on success, so a silent failure would leave
          // the pill stale with no feedback — surface the error code.
          startTransition(async () => {
            const result = await setRoleOpenAction(id, !isOpen);
            if (!result.ok) setError(result.code);
          });
        }}
        className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
      >
        {pending ? 'Saving…' : isOpen ? 'Close role' : 'Reopen role'}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
