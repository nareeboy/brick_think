import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { requireSupabaseServiceEnv } from './env';

// Loose typing until `pnpm db:types` regenerates lib/db/types.generated.ts.
// The placeholder Database type collapses table inserts to never under
// strict checks, so we deliberately do not pass a Database generic here.
// Phase 4 reinstates strict row typing once the schema is mature.
export type ServiceSupabaseClient = SupabaseClient;

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
  cached = createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
