import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">Check the address or head back to the home page.</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-brand px-5 py-2.5 font-medium text-brand-foreground transition-colors hover:opacity-90"
      >
        Back to home
      </Link>
    </main>
  );
}
