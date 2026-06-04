// SECURITY: This route flips public.profiles.is_site_admin = true for a single
// auth user, via the service-role client, so Playwright E2E specs can exercise
// the /app/admin/* surface (changelog, careers inbox, etc.). It exists ONLY to
// support E2E tests against the local dev stack.
//
// Why no NODE_ENV check: same reasoning as /api/test/sign-in — `next start`
// (which Playwright drives) forces production NODE_ENV. We rely on the same
// three independent gates as the other test routes, ALL of which must pass:
//
//   1. E2E_AUTH_ENABLED === '1'              ← never set this on Railway
//   2. Host header is localhost / 127.0.0.1  ← Railway requests never match
//   3. The looked-up user's email matches @brick-think.test
//
// Gate 3 is the critical safety net — even if 1 and 2 were bypassed, the route
// refuses to promote any user whose email is outside the test domain. If any
// gate fails, the route responds 404 with no body so its existence is not
// signalled to a probe.

import { NextResponse, type NextRequest } from 'next/server';

import { getServiceSupabaseClient } from '@/lib/db/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TEST_EMAIL_PATTERN = /^[a-z0-9._-]+@brick-think\.test$/i;

function isAllowedHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(':')[0]?.toLowerCase() ?? '';
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isEnabled(request: NextRequest): boolean {
  if (process.env.E2E_AUTH_ENABLED !== '1') return false;
  return isAllowedHost(request.headers.get('host'));
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isEnabled(request)) return notFound();

  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!TEST_EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'email_not_allowed' }, { status: 403 });
  }

  const admin = getServiceSupabaseClient();

  // Resolve the auth user (and its profile id) by email. The profile row is
  // materialised by the on-auth-insert trigger, so it exists by the time the
  // sign-in fixture has run.
  const listRes = await admin.auth.admin.listUsers();
  if (listRes.error) {
    return NextResponse.json(
      { error: 'lookup_failed', detail: listRes.error.message },
      { status: 500 },
    );
  }
  const user = listRes.data.users.find((u) => (u.email ?? '').toLowerCase() === email);
  if (!user) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }
  const userId = user.id;

  const updateRes = await admin
    .from('profiles')
    .update({ is_site_admin: true })
    .eq('id', userId)
    .select('id')
    .single();

  if (updateRes.error || !updateRes.data) {
    return NextResponse.json(
      { error: 'promote_failed', detail: updateRes.error?.message ?? 'unknown' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, userId });
}
