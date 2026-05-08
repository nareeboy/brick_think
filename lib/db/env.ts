function read(name: string): string | undefined {
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
  const url = read('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = read('NEXT_PUBLIC_SUPABASE_ANON_KEY');
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
  const serviceRoleKey = read('SUPABASE_SERVICE_ROLE_KEY');
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
