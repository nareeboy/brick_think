import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

import { MagicLinkForm } from './MagicLinkForm';
import { signInWithGoogle } from './actions';

export const metadata: Metadata = {
  title: 'Sign in',
};

interface SignInPageProps {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}

function safeNext(next: string | undefined): string {
  if (!next) return '/app';
  return next.startsWith('/') ? next : '/app';
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const errorMessage = params.error;
  const unconfigured = params.reason === 'unconfigured' || !isSupabaseConfigured();

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect(next);
  }

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-16"
    >
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          BrickThink
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Send yourself a sign-in link, or continue with Google.
        </p>
      </header>

      {errorMessage ? (
        <p
          role="alert"
          data-testid="auth-error"
          className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {errorMessage}
        </p>
      ) : null}

      {unconfigured ? (
        <p
          role="status"
          data-testid="auth-unconfigured"
          className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
        >
          Supabase is not configured for this environment yet. Sign-in stays disabled until the
          required env vars are set.
        </p>
      ) : null}

      <section aria-labelledby="magic-link-heading" className="flex flex-col gap-3">
        <h2 id="magic-link-heading" className="text-base font-semibold">
          Email magic link
        </h2>
        <MagicLinkForm next={next} />
      </section>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span aria-hidden className="h-px flex-1 bg-border" />
        OR
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      <section aria-labelledby="google-heading" className="flex flex-col gap-3">
        <h2 id="google-heading" className="text-base font-semibold">
          Single sign-on
        </h2>
        <form action={signInWithGoogle} className="flex flex-col gap-2">
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            data-testid="google-sign-in"
            disabled={unconfigured}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleGlyph />
            Continue with Google
          </button>
        </form>
      </section>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.49h4.84c-.21 1.13-.84 2.08-1.79 2.72v2.27h2.9c1.7-1.56 2.69-3.87 2.69-6.64z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.46-.81 5.95-2.18l-2.9-2.27c-.8.54-1.83.86-3.05.86-2.35 0-4.34-1.59-5.05-3.71H.95v2.34A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.95 10.7A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.96H.95A8.997 8.997 0 0 0 0 9c0 1.45.35 2.83.95 4.04l3-2.34z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.81 11.43 0 9 0A8.997 8.997 0 0 0 .95 4.96l3 2.34C4.66 5.18 6.65 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
