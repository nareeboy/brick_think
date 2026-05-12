'use client';

import { useTransition } from 'react';

import { createModelAction } from './actions';

export function NewDesignButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => createModelAction())}
      disabled={pending}
      className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#c0613d] px-4 text-[14px] font-semibold text-white shadow-[0_12px_24px_-12px_rgba(192,97,61,0.6)] transition-colors hover:bg-[#cf6e47] disabled:cursor-progress disabled:opacity-60"
    >
      {pending ? 'Creating…' : 'New design'}
    </button>
  );
}
