'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { sendMagicLink, type SignInState } from './actions';

const initialState: SignInState | null = null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="group inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition-all hover:bg-zinc-800 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-white/30 border-t-white"
          />
          Sending…
        </>
      ) : (
        <>
          Send sign-in link
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}

interface MagicLinkFormProps {
  next: string;
}

export function MagicLinkForm({ next }: MagicLinkFormProps) {
  const [state, formAction] = useActionState(sendMagicLink, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2.5" noValidate>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="text-[13px] font-medium text-zinc-800">
        Email address
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-zinc-400"
        >
          <MailIcon className="h-4 w-4" />
        </span>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@studio.example"
          className="w-full rounded-xl border border-zinc-900/10 bg-white py-3 pl-10 pr-3.5 text-[15px] text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-zinc-900/30 focus-visible:ring-2 focus-visible:ring-[#a8482a]/40"
        />
      </div>
      <p className="text-[12px] leading-snug text-zinc-500">
        We will email a one-time link. No password to remember.
      </p>
      <div className="mt-1.5">
        <SubmitButton />
      </div>
      {state ? (
        <p
          role={state.ok ? 'status' : 'alert'}
          className={`mt-1 inline-flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] ${
            state.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${
              state.ok ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function MailIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function ArrowRight({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
