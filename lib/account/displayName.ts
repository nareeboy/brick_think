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

/** What the page banner renders for the signed-in user: eyebrow name + avatar photo. */
export interface BannerProfile {
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Loads the identity bits the page banner shows — display name for the eyebrow
 * and the avatar photo. A failed read degrades to the auth user's email (and
 * then to no name / initials-only avatar) instead of throwing — a decorative
 * header is never worth a 500.
 */
export async function loadBannerProfile(
  supabase: ServerSupabaseClient,
  user: { id: string; email?: string | null },
): Promise<BannerProfile> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle();
  return {
    displayName: resolveDisplayName(data, user.email),
    avatarUrl: data?.avatar_url ?? null,
  };
}
