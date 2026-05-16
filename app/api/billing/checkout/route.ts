import { NextResponse, type NextRequest } from 'next/server';

import { createCheckoutSession } from '@/lib/billing/checkout';
import { isPurchaseableTier } from '@/lib/billing/plans';
import { isSupabaseConfigured } from '@/lib/db/env';
import { createServerSupabaseClient } from '@/lib/db/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function absoluteUrl(path: string): string {
  const base = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
  return new URL(path, base).toString();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'unconfigured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const orgId = typeof (body as { orgId?: unknown })?.orgId === 'string'
    ? (body as { orgId: string }).orgId
    : null;
  const tier = (body as { tier?: unknown })?.tier;
  if (!orgId || !isPurchaseableTier(tier)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // Only an owner may purchase / change the plan for an org.
  const orgRes = await supabase
    .from('organisations')
    .select('id, name, owner_id')
    .eq('id', orgId)
    .maybeSingle();
  if (orgRes.error) {
    return NextResponse.json({ error: orgRes.error.message }, { status: 500 });
  }
  const org = orgRes.data as { id: string; name: string; owner_id: string } | null;
  if (!org) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (org.owner_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const email = user.email;
  if (!email) return NextResponse.json({ error: 'no_email' }, { status: 400 });

  const url = await createCheckoutSession({
    orgId: org.id,
    orgName: org.name,
    tier,
    userEmail: email,
    successUrl: absoluteUrl('/app/account?billing=success'),
    cancelUrl: absoluteUrl('/app/account?billing=cancel'),
  });

  return NextResponse.json({ url });
}
