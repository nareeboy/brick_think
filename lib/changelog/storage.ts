// lib/changelog/storage.ts
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/db/types.generated';

export const CHANGELOG_BANNERS_BUCKET = 'changelog-banners';

export function getBannerPublicUrl(
  client: SupabaseClient<Database>,
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const { data } = client.storage.from(CHANGELOG_BANNERS_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) return null;
  // Cache-bust on every render so an overwritten banner refreshes without
  // waiting for the CDN. Matches the article-covers / avatars convention.
  const sep = data.publicUrl.includes('?') ? '&' : '?';
  return `${data.publicUrl}${sep}v=${Date.now()}`;
}
