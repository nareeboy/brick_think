// SECURITY: This route inserts a careers_roles row via the service-role client
// so Playwright E2E specs can seed an open role without touching the DB directly.
// It exists ONLY to support E2E tests against the local dev stack.
//
// Three independent gates — ALL must pass:
//   1. E2E_AUTH_ENABLED === '1'            ← never set this on Railway
//   2. Host header is localhost / 127.0.0.1 ← Railway requests never match
//   3. Slug must match the test-slug pattern ← belt-and-braces data guard
//
// If any gate fails the route returns 404 with no body. The inserted row is
// returned so the caller can clean up via DELETE after the test.

import { NextResponse, type NextRequest } from 'next/server';

import { getServiceSupabaseClient } from '@/lib/db/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Only slugs that look like our test slugs are accepted.
const TEST_SLUG_PATTERN = /^e2e-[a-z0-9-]+$/;

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

interface SeedBody {
  slug?: unknown;
  title?: unknown;
  location?: unknown;
  employmentType?: unknown;
  summary?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isEnabled(request)) return notFound();

  let body: SeedBody;
  try {
    body = (await request.json()) as SeedBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  if (!TEST_SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }

  const title =
    typeof body.title === 'string' && body.title.trim().length > 0
      ? body.title.trim().slice(0, 200)
      : 'E2E Test Engineer';

  const location =
    typeof body.location === 'string' ? body.location.trim().slice(0, 120) : 'Remote';

  const employmentType =
    typeof body.employmentType === 'string' ? body.employmentType.trim().slice(0, 80) : 'Full-time';

  const summary =
    typeof body.summary === 'string'
      ? body.summary.trim().slice(0, 400)
      : 'A test role seeded by the E2E suite.';

  const admin = getServiceSupabaseClient();

  // Upsert so re-runs of the same test slug don't fail on unique constraint.
  const res = await admin
    .from('careers_roles')
    .upsert(
      { slug, title, location, employment_type: employmentType, summary, is_open: true },
      { onConflict: 'slug' },
    )
    .select('id, slug, title')
    .single();

  if (res.error || !res.data) {
    return NextResponse.json(
      { error: 'insert_failed', detail: res.error?.message ?? 'unknown' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, role: res.data });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!isEnabled(request)) return notFound();

  let body: { slug?: unknown };
  try {
    body = (await request.json()) as { slug?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  if (!TEST_SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }

  const admin = getServiceSupabaseClient();
  const res = await admin.from('careers_roles').delete().eq('slug', slug);
  if (res.error) {
    return NextResponse.json(
      { error: 'delete_failed', detail: res.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
