// Use direct dot notation for NEXT_PUBLIC_* vars so Next.js/webpack's
// DefinePlugin can statically inline them at build time. Dynamic bracket
// notation (process.env[name]) is not analysable by the bundler and results
// in an empty object in the browser polyfill, breaking client-side Supabase.
function readServer(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

export interface SupabaseServiceEnv extends SupabasePublicEnv {
  serviceRoleKey: string;
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  // Dot notation is required here so that webpack inlines these values into
  // the client bundle at build time.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function requireSupabasePublicEnv(): SupabasePublicEnv {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      'Missing Supabase public environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return env;
}

export function requireSupabaseServiceEnv(): SupabaseServiceEnv {
  const base = requireSupabasePublicEnv();
  const serviceRoleKey = readServer('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY env. Server-side only, never expose to the client.',
    );
  }
  return { ...base, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicEnv() !== null;
}
