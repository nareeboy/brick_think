import 'server-only';

import { createServerSupabaseClient } from '@/lib/db/server';

export async function isCallerSiteAdmin(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('is_site_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return false;
  return data.is_site_admin === true;
}
