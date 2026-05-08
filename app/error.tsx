'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground">
        An unexpected error occurred. You can try again, or head back to the home page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="self-center rounded-md bg-brand px-5 py-2.5 font-medium text-brand-foreground transition-colors hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
