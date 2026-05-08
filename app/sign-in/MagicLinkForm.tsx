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
      className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2.5 font-medium text-brand-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Sending...' : 'Send sign-in link'}
    </button>
  );
}

interface MagicLinkFormProps {
  next: string;
}

export function MagicLinkForm({ next }: MagicLinkFormProps) {
  const [state, formAction] = useActionState(sendMagicLink, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="email" className="text-sm font-medium">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        className="rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring"
      />
      <SubmitButton />
      {state ? (
        <p
          role={state.ok ? 'status' : 'alert'}
          className={`text-sm ${state.ok ? 'text-success' : 'text-danger'}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
