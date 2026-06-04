import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { requireSupabasePublicEnv } from './env';
import type { Database } from './types.generated';

export type AnonServerSupabaseClient = SupabaseClient<Database>;

let cached: AnonServerSupabaseClient | null = null;

/**
 * A cookieless, anon-key Supabase client for PUBLIC reads in server components.
 *
 * Unlike `createServerSupabaseClient` — which reads request cookies and so opts
 * the whole route into dynamic rendering — this client carries no cookies, so
 * callers can stay statically rendered (and be refreshed via `revalidatePath`).
 * RLS still applies under the anon role, so use this ONLY for data the anon
 * role is permitted to read.
 */
export function getAnonServerSupabaseClient(): AnonServerSupabaseClient {
  if (cached) return cached;
  const env = requireSupabasePublicEnv();
  cached = createClient<Database>(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
