import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';
import { publicOriginFromHeaders } from '@/lib/http/publicOrigin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', publicOriginFromHeaders(request.headers)), {
    status: 303,
  });
}
