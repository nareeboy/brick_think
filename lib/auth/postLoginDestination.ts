import 'server-only';

import type { ServerSupabaseClient } from '@/lib/db/server';
import { adminPanelEnabled } from '@/lib/premium/server';

export const DEFAULT_POST_LOGIN_PATH = '/app/my-designs';

/**
 * Where a freshly signed-in user should land. Site admins are routed to the
 * admin dashboard instead of My designs — but only when the destination is the
 * generic default: an explicit next (deep link, invite, recovery) always wins.
 * The sign-in page bakes the default into its links, so "next === default"
 * is the signal for "no deliberate destination", not a missing param.
 * Gated on the premium seam: the open-core stub has no /app/admin routes,
 * so the redirect must stay dead there.
 */
export async function resolvePostLoginDestination(
  supabase: ServerSupabaseClient,
  next: string,
): Promise<string> {
  if (next !== DEFAULT_POST_LOGIN_PATH || !adminPanelEnabled) return next;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return next;

  const { data } = await supabase
    .from('profiles')
    .select('is_site_admin')
    .eq('id', user.id)
    .maybeSingle();

  return data?.is_site_admin === true ? '/app/admin' : next;
}
