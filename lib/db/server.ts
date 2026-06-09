import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getAuthCookieOptions } from './cookie-options';
import { requireSupabasePublicEnv } from './env';
import type { Database } from './types.generated';

export type ServerSupabaseClient = ReturnType<typeof createServerClient<Database>>;

export async function createServerSupabaseClient(): Promise<ServerSupabaseClient> {
  const env = requireSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookieOptions: getAuthCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        } catch {
          // Server Components cannot set cookies. Middleware refreshes the
          // session on each request, so silently ignore here.
        }
      },
    },
  });
}
