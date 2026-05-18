// SECURITY: This route deletes a Supabase auth user (and cascades downstream
// rows via the public.profiles FK). It exists ONLY to let the Playwright
// `signedInPage` fixture clean up the user it created during the test, so
// `auth.users` doesn't accumulate `e2e-*@brick-think.test` rows.
//
// Why no NODE_ENV check: same reason as /api/test/sign-in — `next start`
// (which Playwright drives) forces production NODE_ENV. We rely on the same
// three independent gates as sign-in, ALL of which must pass:
//
//   1. E2E_AUTH_ENABLED === '1'         ← never set this on Railway
//   2. Host header is localhost / 127.0.0.1
//   3. The looked-up user's email matches @brick-think.test
//
// Gate 3 is the critical safety net — even if 1 and 2 were bypassed, the
// route refuses to delete any user whose email is outside the test domain.
// If any gate fails, the route responds 404 with no body.

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
  if (process.env.E2E_AUTH_ENABLED !== '1') return false;
  return isAllowedHost(request.headers.get('host'));
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isEnabled(request)) return notFound();

  let body: { userId?: unknown };
  try {
    body = (await request.json()) as { userId?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!UUID_PATTERN.test(userId)) {
    return NextResponse.json({ error: 'invalid_user_id' }, { status: 400 });
  }

  const admin = getServiceSupabaseClient();

  const userRes = await admin.auth.admin.getUserById(userId);
  if (userRes.error || !userRes.data?.user) {
    return NextResponse.json({ ok: true, deleted: false });
  }
  const email = userRes.data.user.email ?? '';
  if (!TEST_EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'email_not_allowed' }, { status: 403 });
  }

  // Pre-clear model_versions authored by this user. The FK
  // model_versions.created_by → profiles(id) is NO ACTION, and PG can
  // check it before the parallel models.owner_profile_id CASCADE has
  // deleted the same-user versions transitively — blocking the profile
  // delete when a test exercises "save a version". Safe to delete here
  // because gate 3 above already restricted us to the test domain.
  const delVersions = await admin.from('model_versions').delete().eq('created_by', userId);
  if (delVersions.error) {
    return NextResponse.json(
      { error: 'pre_delete_versions_failed', detail: delVersions.error.message },
      { status: 500 },
    );
  }

  const delRes = await admin.auth.admin.deleteUser(userId);
  if (delRes.error) {
    return NextResponse.json(
      { error: 'delete_failed', detail: delRes.error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, deleted: true });
}
