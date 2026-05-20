import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getServiceSupabaseClient } from '@/lib/db/service';
import { createServerSupabaseClient } from '@/lib/db/server';
import { redeemJoinCodeAction } from '@/app/(authed)/app/sessions/join-actions';

export const metadata: Metadata = {
  title: 'Join session',
};

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

interface SessionLookup {
  id: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed' | 'archived';
  title: string;
  facilitator_full_name: string | null;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  const service = getServiceSupabaseClient();

  const { data: rows } = await service.rpc('lookup_session_by_code', { p_code: code });
  const session = (Array.isArray(rows) ? rows[0] : rows) as SessionLookup | null;

  if (!session) return <NotAvailable reason="code_not_found" code={code} />;
  if (session.status === 'completed') {
    return <NotAvailable reason="session_completed" sessionTitle={session.title} />;
  }

  const userSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/app/join/${code}`)}`);
  }

  const result = await redeemJoinCodeAction(code);
  if (result.ok) redirect(`/app/sessions/${result.sessionId}`);

  return <NotAvailable reason={result.code} sessionTitle={session.title} />;
}

function NotAvailable({
  reason,
  code,
  sessionTitle,
}: {
  reason: 'unauthenticated' | 'code_not_found' | 'session_completed' | 'removed_by_facilitator';
  code?: string;
  sessionTitle?: string;
}) {
  const headlines: Record<typeof reason, string> = {
    unauthenticated: 'Please sign in to join',
    code_not_found: "We couldn't find that session",
    session_completed: 'This session has wrapped',
    removed_by_facilitator: 'The facilitator has removed you from this session',
  };
  const bodies: Record<typeof reason, string> = {
    unauthenticated: 'Sign in and try the link again.',
    code_not_found: code
      ? `The code "${code}" doesn't match an active session. Check it with the facilitator and try again.`
      : 'Check the code with the facilitator and try again.',
    session_completed: sessionTitle
      ? `"${sessionTitle}" has ended. Ask the facilitator for the report when it's ready.`
      : 'The session has ended.',
    removed_by_facilitator: 'If this looks like a mistake, ask the facilitator to restore you and they\'ll send a new invite.',
  };
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{headlines[reason]}</h1>
      <p className="text-muted-foreground">{bodies[reason]}</p>
      <Link href="/app/my-designs" className="self-start text-sm underline">
        Go to my designs
      </Link>
    </main>
  );
}
