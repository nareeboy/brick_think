import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';
import { publicOriginFromHeaders } from '@/lib/http/publicOrigin';

export const dynamic = 'force-dynamic';

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
  const origin = publicOriginFromHeaders(request.headers);
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
