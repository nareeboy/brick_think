import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';

export const dynamic = 'force-dynamic';

// Token-hash confirmation route — the cross-browser-resilient counterpart to
// /auth/callback. Email templates point here with ?token_hash=…&type=…&next=…
// so the link works even when opened in a different browser context (in-app
// webview from a mail client, phone after desktop signup, etc.). PKCE only
// stays on /auth/callback for OAuth, where the browser context never changes.
//
// Background: supabase/CLAUDE.md "Magic-link PKCE: localhost vs 127.0.0.1
// host pinning" documents the failure mode this route avoids.

const ALLOWED_TYPES = new Set([
  'email',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
  'signup',
]);

function publicOrigin(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/')) return '/app/my-designs';
  return value;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = safeNext(url.searchParams.get('next'));
  const origin = publicOrigin(request);

  if (!tokenHash || !type || !ALLOWED_TYPES.has(type)) {
    const failure = new URL('/sign-in', origin);
    failure.searchParams.set('error_code', 'link_malformed');
    return NextResponse.redirect(failure);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    // The Supabase SDK's union doesn't expose every server-accepted string;
    // we've already constrained it via ALLOWED_TYPES above.
    type: type as Parameters<typeof supabase.auth.verifyOtp>[0]['type'],
  });

  if (error) {
    const failure = new URL('/sign-in', origin);
    const code =
      error.code === 'otp_expired' || /expired/i.test(error.message)
        ? 'link_expired'
        : 'link_invalid';
    failure.searchParams.set('error_code', code);
    return NextResponse.redirect(failure);
  }

  return NextResponse.redirect(new URL(next, origin));
}
