'use client';

import { createBrowserClient } from '@supabase/ssr';

import { requireSupabasePublicEnv } from './env';
import type { Database } from './types.generated';

export type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

let cached: BrowserSupabaseClient | null = null;

export function getBrowserSupabaseClient(): BrowserSupabaseClient {
  if (cached) return cached;
  const env = requireSupabasePublicEnv();
  cached = createBrowserClient<Database>(env.url, env.anonKey);
  return cached;
}
