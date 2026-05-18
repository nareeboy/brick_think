// SECURITY: This route signs in any user that matches the test-email pattern,
// no password required. It exists ONLY to support Playwright E2E tests against
// a local dev stack.
//
// Why no NODE_ENV check: Playwright runs against `pnpm start` (i.e. `next
// start`), which forces NODE_ENV = 'production' internally. Railway production
// and preview environments also run with NODE_ENV = 'production'. A
// NODE_ENV !== 'production' gate would either disable the route in our actual
// test harness (useless) or give a false sense of security in prod. Instead
// we rely on three independent gates, ALL of which must pass:
//
//   1. E2E_AUTH_ENABLED === '1'         ← never set this on Railway
//   2. Host header is localhost / 127.0.0.1   ← Railway requests never match
//   3. Request email matches @brick-think.test
//
// If any gate fails, the route responds 404 with no body so its existence is
// not signalled to a probe.
//
// If you find yourself needing to relax any of these, write a new dedicated
// route instead and re-apply equivalent defence-in-depth.

import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';
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
    return NextResponse.json({ error: 'email_not_allowed' }, { status: 400 });
  }

  const admin = getServiceSupabaseClient();

  // Ensure the auth user exists. createUser is idempotent in effect: if a
  // user already exists with this email, it errors and we fall through to
  // listUsers to find the existing id.
  const createRes = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (createRes.error && !/already|exists|registered/i.test(createRes.error.message)) {
    return NextResponse.json(
      { error: 'create_user_failed', detail: createRes.error.message },
      { status: 500 },
    );
  }

  // Trigger from public.profiles on auth.users insert materialises the
  // profile row, which is what models.owner_profile_id references.

  // Generate a magic-link's hashed_token and immediately exchange it for a
  // session via the SSR client. The verifyOtp call writes the auth cookies
  // through createServerSupabaseClient's cookie adapter onto the outgoing
  // response.
  const linkRes = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkRes.error || !linkRes.data?.properties?.hashed_token) {
    return NextResponse.json(
      { error: 'generate_link_failed', detail: linkRes.error?.message ?? 'no token' },
      { status: 500 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const verifyRes = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: linkRes.data.properties.hashed_token,
  });
  if (verifyRes.error || !verifyRes.data.session) {
    return NextResponse.json(
      { error: 'verify_failed', detail: verifyRes.error?.message ?? 'no session' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    userId: verifyRes.data.user?.id ?? null,
    email,
  });
}
