import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/db/types.generated';

export const ARTICLE_COVERS_BUCKET = 'article-covers';

export function getCoverPublicUrl(
  client: SupabaseClient<Database>,
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const { data } = client.storage.from(ARTICLE_COVERS_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) return null;
  // Cache-bust on every render so an overwritten cover refreshes without
  // waiting for the CDN. Matches the avatars convention.
  const sep = data.publicUrl.includes('?') ? '&' : '?';
  return `${data.publicUrl}${sep}v=${Date.now()}`;
}
