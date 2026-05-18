import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';

export const dynamic = 'force-dynamic';

function publicOrigin(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', publicOrigin(request)), { status: 303 });
}
