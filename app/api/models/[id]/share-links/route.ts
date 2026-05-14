import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/db/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('model_share_links')
    .select('id, token, created_at, expires_at')
    .eq('model_id', id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ links: data ?? [] });
}
