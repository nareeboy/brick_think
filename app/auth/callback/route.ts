import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const errorDescription = url.searchParams.get('error_description');
  const next = url.searchParams.get('next') ?? '/app';

  const safeNext = next.startsWith('/') ? next : '/app';
  const redirectUrl = new URL(safeNext, url.origin);

  if (errorDescription) {
    const failure = new URL('/sign-in', url.origin);
    failure.searchParams.set('error', errorDescription);
    return NextResponse.redirect(failure);
  }

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in', url.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failure = new URL('/sign-in', url.origin);
    failure.searchParams.set('error', error.message);
    return NextResponse.redirect(failure);
  }

  return NextResponse.redirect(redirectUrl);
}
