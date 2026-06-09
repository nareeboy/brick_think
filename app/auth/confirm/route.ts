import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';
import { publicOriginFromHeaders } from '@/lib/http/publicOrigin';

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

function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/')) return '/app/my-designs';
  return value;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));
  const origin = publicOriginFromHeaders(request.headers);

  // Fallback for the built-in {{ .ConfirmationURL }} template: if a Supabase
  // project (or a local stack started before the custom token-hash templates
  // were applied) still emits a /auth/v1/verify link, GoTrue redirects here
  // with ?code=… and no token_hash. Hand it to /auth/callback, which owns the
  // PKCE code-exchange path, instead of bouncing to link_malformed.
  if (!tokenHash && code) {
    const callback = new URL('/auth/callback', origin);
    callback.searchParams.set('code', code);
    callback.searchParams.set('next', next);
    return NextResponse.redirect(callback);
  }

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
