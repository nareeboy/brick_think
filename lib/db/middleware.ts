import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getAuthCookieOptions } from './cookie-options';
import { getSupabasePublicEnv } from './env';

const PROTECTED_PREFIXES = ['/app'];

// The join page (app/(public)/app/join/[code]) must stay reachable signed-out:
// it resolves the code first and only sends the visitor to /sign-in (with
// ?next=) itself when the code is valid, so anon visitors with a bad/expired
// code get the friendly code_not_found / session_completed states. The
// blanket /app guard below would bounce them to sign-in before the page runs
// — which is exactly what happened from 2026-05-21 (page moved under /app)
// until this exemption.
const PUBLIC_EXEMPT_PREFIXES = ['/app/join'];

function isProtected(pathname: string): boolean {
  if (
    PUBLIC_EXEMPT_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return false;
  }
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const env = getSupabasePublicEnv();

  if (!env) {
    if (isProtected(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      url.searchParams.set('next', request.nextUrl.pathname);
      url.searchParams.set('reason', 'unconfigured');
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookieOptions: getAuthCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
