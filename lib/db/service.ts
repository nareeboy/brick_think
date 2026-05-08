import 'server-only';
import { createClient } from '@supabase/supabase-js';

import { requireSupabaseServiceEnv } from './env';
import type { Database } from './types.generated';

export type ServiceSupabaseClient = ReturnType<typeof createClient<Database>>;

let cached: ServiceSupabaseClient | null = null;

/**
 * A service-role Supabase client. Bypasses RLS. Use only in server actions,
 * route handlers, and worker code that must perform privileged writes
 * (Stripe webhook, AI ingestion, export jobs). Never import from a client
 * component; the `server-only` import enforces that at build time.
 */
export function getServiceSupabaseClient(): ServiceSupabaseClient {
  if (cached) return cached;
  const env = requireSupabaseServiceEnv();
  cached = createClient<Database>(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
