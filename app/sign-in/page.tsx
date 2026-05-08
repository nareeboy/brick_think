import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function SignInPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted-foreground">
        Sign-in goes live in step 4. Magic link and Google OAuth will be supported.
      </p>
    </main>
  );
}
