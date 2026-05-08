import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join session',
};

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Join a session</h1>
      <p className="text-muted-foreground">
        Session code:{' '}
        <code className="rounded bg-muted px-2 py-1 font-mono text-foreground">{code}</code>
      </p>
      <p className="text-muted-foreground">The participant join flow ships in Phase 1.</p>
    </main>
  );
}
