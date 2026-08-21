import type { ServerSupabaseClient } from '@/lib/db/server';

/** The two `profiles` columns the display-name chain reads. */
export interface ProfileNameRow {
  full_name: string | null;
  email: string | null;
}

/**
 * The name we show for a signed-in user. `profiles.full_name` is the display
 * name they set on /app/account; with that still blank we fall back to their
 * email address rather than inventing a placeholder, so the label always
 * points at a real account. Returns null only when nothing identifies them.
 */
export function resolveDisplayName(
  profile: ProfileNameRow | null | undefined,
  fallbackEmail?: string | null,
): string | null {
  return profile?.full_name?.trim() || profile?.email?.trim() || fallbackEmail?.trim() || null;
}

/**
 * Loads the display name for pages that only need it for the banner eyebrow.
 * A failed read degrades to the auth user's email (and then to no name at all)
 * instead of throwing — a decorative label is never worth a 500.
 */
export async function loadDisplayName(
  supabase: ServerSupabaseClient,
  user: { id: string; email?: string | null },
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();
  return resolveDisplayName(data, user.email);
}
