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

// Map raw Supabase errors to UI-friendly codes that /sign-in renders into
// contextual help. The most common in-the-wild case is the PKCE verifier
// going missing because the email link was opened in a different browser
// context (in-app webview from a mail client, different device, etc.) —
// surface a recognisable code so the sign-in page can show resend guidance
// instead of leaking "PKCE code verifier not found in storage" raw.
function classifyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('code verifier') || m.includes('pkce')) return 'pkce_verifier_missing';
  if (m.includes('expired')) return 'link_expired';
  if (m.includes('rate limit')) return 'rate_limited';
  return 'link_invalid';
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
    failure.searchParams.set('error_code', classifyError(errorDescription));
    return NextResponse.redirect(failure);
  }

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in', origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failure = new URL('/sign-in', origin);
    failure.searchParams.set('error_code', classifyError(error.message));
    return NextResponse.redirect(failure);
  }

  return NextResponse.redirect(redirectUrl);
}
