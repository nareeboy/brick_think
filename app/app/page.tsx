import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function AppHomePage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-3 max-w-prose text-muted-foreground">
        Authenticated dashboard placeholder. Sessions, prompts, and exports land in Phase 1.
      </p>
    </main>
  );
}
