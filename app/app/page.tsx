import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function AppHomePage() {
  if (!isSupabaseConfigured()) {
    redirect('/sign-in?reason=unconfigured&next=%2Fapp');
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in?next=%2Fapp');
  }

  return (
    <main id="main" className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Hello, <span data-testid="current-user-email">{user.email}</span>
          </h1>
          <p className="mt-2 max-w-prose text-muted-foreground">
            Authenticated session live. Sessions, prompts, and exports land in Phase 1.
          </p>
        </div>
        <SignOutButton />
      </header>

      <section
        aria-labelledby="account-heading"
        className="rounded-lg border border-border bg-background p-4"
      >
        <h2 id="account-heading" className="text-base font-semibold">
          Your account
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="text-muted-foreground">User ID</dt>
          <dd className="font-mono text-xs">{user.id}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-muted-foreground">Provider</dt>
          <dd>{user.app_metadata.provider ?? 'email'}</dd>
          <dt className="text-muted-foreground">Last sign in</dt>
          <dd>
            {user.last_sign_in_at
              ? new Date(user.last_sign_in_at).toLocaleString('en-GB')
              : 'Just now'}
          </dd>
        </dl>
      </section>
    </main>
  );
}
