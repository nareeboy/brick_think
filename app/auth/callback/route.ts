import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';

export const dynamic = 'force-dynamic';

// Railway's proxy sets `host` to the internal port-bound address
// (e.g. `localhost:8080`) and exposes the public hostname via
// `x-forwarded-host`. NextRequest.url uses `host`, so deriving the
// redirect origin from `request.url` produces `https://localhost:8080`.
function publicOrigin(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const errorDescription = url.searchParams.get('error_description');
  const next = url.searchParams.get('next') ?? '/app/my-designs';

  const safeNext = next.startsWith('/') ? next : '/app/my-designs';
  const origin = publicOrigin(request);
  const redirectUrl = new URL(safeNext, origin);

  if (errorDescription) {
    const failure = new URL('/sign-in', origin);
    failure.searchParams.set('error', errorDescription);
    return NextResponse.redirect(failure);
  }

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in', origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failure = new URL('/sign-in', origin);
    failure.searchParams.set('error', error.message);
    return NextResponse.redirect(failure);
  }

  return NextResponse.redirect(redirectUrl);
}
