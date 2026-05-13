import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { requireSupabaseServiceEnv } from './env';
import type { Database } from './types.generated';

export type ServiceRoleSupabaseClient = SupabaseClient<Database>;

// The only place that uses SUPABASE_SERVICE_ROLE_KEY. Server-only.
// Audit-friendly: grep for this filename to find every elevated call site.
export function createServiceRoleSupabaseClient(): ServiceRoleSupabaseClient {
  const env = requireSupabaseServiceEnv();
  return createClient<Database>(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
