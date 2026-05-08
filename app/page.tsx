import Link from 'next/link';

export default function HomePage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-6 px-6 py-16"
    >
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Phase 0 in build
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">BrickThink</h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        A virtual Serious Play platform. Build, narrate, and progress through the five etiquette
        stages with your distributed team.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/sign-in"
          className="inline-flex items-center justify-center rounded-md bg-brand px-5 py-2.5 font-medium text-brand-foreground transition-colors hover:opacity-90"
        >
          Sign in
        </Link>
        <Link
          href="/app"
          className="inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-2.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          Open the app
        </Link>
      </div>
    </main>
  );
}
