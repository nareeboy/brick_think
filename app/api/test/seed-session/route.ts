// SECURITY: This route inserts sessions, stages, and (if missing) an
// organisation + membership for a known test user, all via the service-role
// client. It exists ONLY to support Playwright E2E tests against a local dev
// stack.
//
// Why no NODE_ENV check: Playwright runs against `pnpm start` (i.e. `next
// start`), which forces NODE_ENV = 'production' internally. Railway production
// and preview environments also run with NODE_ENV = 'production'. A
// NODE_ENV !== 'production' gate would either disable the route in our actual
// test harness (useless) or give a false sense of security in prod. Instead
// we rely on three independent gates, ALL of which must pass:
//
//   1. E2E_SESSIONS_ENABLED === '1'        ← never set this on Railway
//   2. Host header is localhost / 127.0.0.1     ← Railway requests never match
//   3. Request callerEmail matches @brick-think.test
//
// If a gate fails, the route responds 404 with no body so its existence is
// not signalled to a probe. Past-gate body errors (invalid JSON, bad email)
// respond 400 with a JSON error code — those are reachable only by callers
// already past the existence-hiding gates.
//
// If you find yourself needing to relax any of these, write a new dedicated
// route instead and re-apply equivalent defence-in-depth.

import { NextResponse, type NextRequest } from 'next/server';

import { getServiceSupabaseClient } from '@/lib/db/service';
import { STAGE_DEFAULT_DURATIONS_SECONDS } from '@/lib/sessions/stage-labels';
import type { StageType } from '@/lib/sessions/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TEST_EMAIL_PATTERN = /^[a-z0-9._-]+@brick-think\.test$/i;
const STAGE_ORDER: StageType[] = [
  'skill_building',
  'individual_model',
  'shared_model',
  'system_model',
  'guiding_principles',
];

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

interface SeedBody {
  callerEmail?: unknown;
  title?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isEnabled(request)) return notFound();

  let body: SeedBody;
  try {
    body = (await request.json()) as SeedBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const callerEmail =
    typeof body.callerEmail === 'string' ? body.callerEmail.trim().toLowerCase() : '';
  if (!TEST_EMAIL_PATTERN.test(callerEmail)) {
    return NextResponse.json({ error: 'email_not_allowed' }, { status: 400 });
  }
  const title =
    typeof body.title === 'string' && body.title.trim().length > 0
      ? body.title.trim().slice(0, 200)
      : `Test session ${Date.now()}`;

  const admin = getServiceSupabaseClient();

  // 1. Resolve the caller's profile by email. Must already exist (created by
  //    a prior /api/test/sign-in call); otherwise 404.
  const profileRes = await admin
    .from('profiles')
    .select('id')
    .eq('email', callerEmail)
    .maybeSingle();
  if (profileRes.error) {
    return NextResponse.json(
      { error: 'profile_lookup_failed', detail: profileRes.error.message },
      { status: 500 },
    );
  }
  const profile = profileRes.data;
  if (!profile) {
    return NextResponse.json(
      { error: 'profile_not_found', detail: 'sign in via /api/test/sign-in first' },
      { status: 404 },
    );
  }

  // 2. Ensure the caller is a member of at least one org. If they already
  //    are, reuse any existing membership; otherwise create a test org (the
  //    handle_new_organisation trigger inserts the owner membership row).
  const membershipRes = await admin
    .from('org_memberships')
    .select('org_id')
    .eq('profile_id', profile.id)
    .limit(1)
    .maybeSingle();
  if (membershipRes.error) {
    return NextResponse.json(
      { error: 'membership_lookup_failed', detail: membershipRes.error.message },
      { status: 500 },
    );
  }

  let orgId: string;
  if (membershipRes.data) {
    orgId = membershipRes.data.org_id;
  } else {
    const orgRes = await admin
      .from('organisations')
      .insert({
        name: 'Test org',
        slug: `test-org-${profile.id.slice(0, 8)}`,
        owner_id: profile.id,
      })
      .select('id')
      .single();
    if (orgRes.error || !orgRes.data) {
      return NextResponse.json(
        { error: 'org_create_failed', detail: orgRes.error?.message ?? 'unknown' },
        { status: 500 },
      );
    }
    orgId = orgRes.data.id;
    // Note: the handle_new_organisation trigger on public.organisations
    // auto-inserts the owner membership row on org insert, so we do not
    // insert into org_memberships manually here (that would be a duplicate).
  }

  // 3. Create the session. Generate a join_code up front so e2e specs that
  //    exercise the participant join flow can resolve a code without an
  //    extra round-trip. Production session creation goes through
  //    createSession (org-scoped, RLS); the join_code generator there is a
  //    DB function call, mirrored here.
  const joinCodeRes = await admin.rpc('generate_join_code');
  if (joinCodeRes.error || !joinCodeRes.data) {
    return NextResponse.json(
      { error: 'join_code_failed', detail: joinCodeRes.error?.message ?? 'unknown' },
      { status: 500 },
    );
  }
  const joinCode = joinCodeRes.data as string;
  const sessionRes = await admin
    .from('sessions')
    .insert({
      org_id: orgId,
      facilitator_id: profile.id,
      title,
      join_code: joinCode,
    })
    .select('id')
    .single();
  if (sessionRes.error || !sessionRes.data) {
    return NextResponse.json(
      { error: 'session_create_failed', detail: sessionRes.error?.message ?? 'unknown' },
      { status: 500 },
    );
  }
  const sessionId = sessionRes.data.id;

  // 4. Create the five canonical stages in enum order, position 0..4.
  const stageRows = STAGE_ORDER.map((stage_type, position) => ({
    session_id: sessionId,
    stage_type,
    position,
    duration_seconds: STAGE_DEFAULT_DURATIONS_SECONDS[stage_type],
  }));
  const stagesRes = await admin.from('stages').insert(stageRows).select('id, stage_type');
  if (stagesRes.error || !stagesRes.data) {
    return NextResponse.json(
      { error: 'stages_create_failed', detail: stagesRes.error?.message ?? 'unknown' },
      { status: 500 },
    );
  }

  const stageIds = Object.fromEntries(
    stagesRes.data.map((s) => [s.stage_type as StageType, s.id as string]),
  ) as Record<StageType, string>;

  return NextResponse.json({
    sessionId,
    orgId,
    joinCode,
    stageIds,
  });
}
