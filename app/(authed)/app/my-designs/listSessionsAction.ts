'use server';

import { createServerSupabaseClient } from '@/lib/db/server';

export interface SessionOption {
  id: string;
  title: string;
}

export async function listOrgSessionsAction(orgId: string): Promise<SessionOption[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Failed to list sessions: ${error.message}`);
  return (data ?? []).map((r) => ({ id: r.id, title: r.title }));
}
