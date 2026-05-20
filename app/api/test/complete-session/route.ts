// SECURITY: Mirrors seed-session.ts — three independent gates:
//   1. E2E_SESSIONS_ENABLED === '1'
//   2. Host header is localhost / 127.0.0.1
//   3. callerEmail matches @brick-think.test
// Flips a session's status to 'completed' so e2e specs can exercise
// post-session UI (Generate report button, etc.) without driving the full
// stage state machine.
//
// Why no NODE_ENV check: same reason as /api/test/sign-in — `next start`
// (which Playwright drives) forces production NODE_ENV. We rely on three
// independent gates, all of which must pass.
//
// If any gate fails, the route responds 404 with no body so its existence
// is not signalled to a probe.

import { NextResponse, type NextRequest } from 'next/server';

import { getServiceSupabaseClient } from '@/lib/db/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TEST_EMAIL_PATTERN = /^[a-z0-9._-]+@brick-think\.test$/i;
const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

function isAllowedHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isEnabled(request: NextRequest): boolean {
  if (process.env.E2E_SESSIONS_ENABLED !== '1') return false;
  return isAllowedHost(request.headers.get('host'));
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

interface CompleteBody {
  sessionId?: unknown;
  callerEmail?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isEnabled(request)) return notFound();

  let body: CompleteBody;
  try {
    body = (await request.json()) as CompleteBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const callerEmail =
    typeof body.callerEmail === 'string' ? body.callerEmail.trim().toLowerCase() : '';
  if (!TEST_EMAIL_PATTERN.test(callerEmail)) {
    return NextResponse.json({ error: 'email_not_allowed' }, { status: 400 });
  }
  if (!UUID_PATTERN.test(sessionId)) {
    return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 });
  }

  const admin = getServiceSupabaseClient();

  const { error: updateErr } = await admin
    .from('sessions')
    .update({ status: 'completed' })
    .eq('id', sessionId);
  if (updateErr) {
    return NextResponse.json(
      { error: 'update_failed', detail: updateErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
