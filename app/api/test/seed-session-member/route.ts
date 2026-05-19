// SECURITY: Mirrors seed-session.ts — three independent gates:
//   1. E2E_SESSIONS_ENABLED === '1'
//   2. Host header is localhost / 127.0.0.1
//   3. callerEmail matches @brick-think.test
// Adds a second test user to the session's org so e2e specs can simulate
// facilitator + participant flows.
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

interface SeedMemberBody {
  sessionId?: unknown;
  callerEmail?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isEnabled(request)) return notFound();

  let body: SeedMemberBody;
  try {
    body = (await request.json()) as SeedMemberBody;
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

  // Look up the session's org_id (and validate it exists).
  const { data: session, error: sessionErr } = await admin
    .from('sessions')
    .select('org_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionErr || !session) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
  }

  // Mint a fresh test user (auto-confirmed, no password needed).
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const newEmail = `e2e-participant-${suffix}@brick-think.test`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: newEmail,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    return NextResponse.json(
      { error: 'create_user_failed', detail: createErr?.message ?? 'unknown' },
      { status: 500 },
    );
  }
  const userId = created.user.id;

  // Add the new user as a member of the session's org.
  // Table name confirmed from lib/testing/supabase-test-client.ts addOrgMember.
  const { error: memberErr } = await admin
    .from('org_memberships')
    .insert({ org_id: session.org_id, profile_id: userId, role: 'member' });
  if (memberErr) {
    // Roll back the newly created user so failures don't leak test fixtures.
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: 'add_member_failed', detail: memberErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ email: newEmail, userId });
}
