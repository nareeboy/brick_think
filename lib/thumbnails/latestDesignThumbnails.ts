import type { ServerSupabaseClient } from '@/lib/db/server';

/**
 * Latest-design thumbnails for workshop and session cards.
 *
 * The workshops list and the sessions grid used to hotlink an external
 * placeholder image service (picsum.photos) for card art; when that service
 * went down, every card rendered a broken image. These helpers replace that
 * dependency with the real thumbnail pipeline: each card shows the most
 * recently updated design (model) inside it, served as a Supabase Storage
 * signed URL from the `model-thumbnails` bucket — the same mechanism the
 * my-designs grid uses. Cards with no thumbnailed design get no entry in the
 * returned map; callers render the dot-grid placeholder instead.
 *
 * RLS makes the reads safe: `models` SELECT and the bucket's SELECT policy
 * both extend to org-mates of session-scoped designs (see migration
 * 20260514130000_thumbnails_org_session_read.sql), so a member sees the same
 * art on the card as they would inside the session.
 *
 * Failures degrade to an empty map on purpose — thumbnails are decorative,
 * and a storage hiccup must not 500 the workshops page.
 */

/** Defensive cap: newest-first, so truncation only ever costs placeholder
 *  fallbacks on pathologically design-heavy accounts. */
const MODEL_SCAN_LIMIT = 1000;

const SIGNED_URL_TTL_SECONDS = 60 * 60;

interface ThumbRow {
  session_id: string | null;
  thumbnail_path: string | null;
  thumbnail_updated_at: string | null;
}

/**
 * Newest thumbnailed model per key, where `keyOf` maps a row's session to the
 * caller's grouping (the session itself, or its parent org).
 */
async function latestByKey(
  supabase: ServerSupabaseClient,
  sessionIds: string[],
  keyOf: (sessionId: string) => string | undefined,
): Promise<Map<string, string>> {
  if (sessionIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('models')
    .select('session_id, thumbnail_path, thumbnail_updated_at')
    .in('session_id', sessionIds)
    .is('deleted_at', null)
    .not('thumbnail_path', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(MODEL_SCAN_LIMIT);
  if (error) {
    console.error('latest design thumbnail lookup failed', error);
    return new Map();
  }

  // Rows arrive newest-first; the first row seen per key wins.
  const pathByKey = new Map<string, { path: string; updatedAt: string | null }>();
  for (const row of (data ?? []) as ThumbRow[]) {
    if (!row.session_id || !row.thumbnail_path) continue;
    const key = keyOf(row.session_id);
    if (!key || pathByKey.has(key)) continue;
    pathByKey.set(key, { path: row.thumbnail_path, updatedAt: row.thumbnail_updated_at });
  }
  if (pathByKey.size === 0) return new Map();

  const paths = Array.from(pathByKey.values(), (v) => v.path);
  const signed = await supabase.storage
    .from('model-thumbnails')
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (signed.error) {
    console.error('thumbnail signing failed', signed.error);
    return new Map();
  }
  const urlByPath = new Map<string, string>();
  for (const s of signed.data ?? []) {
    if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  const result = new Map<string, string>();
  for (const [key, { path, updatedAt }] of pathByKey) {
    const base = urlByPath.get(path);
    if (!base) continue;
    // Cache-buster mirrors my-designs: regenerated thumbnails change the URL
    // even while an older signed URL is still cached.
    result.set(key, `${base}&v=${encodeURIComponent(updatedAt ?? '')}`);
  }
  return result;
}

/**
 * Map of session id → signed URL of the newest design thumbnail in that
 * session. Sessions with no thumbnailed design are absent.
 */
export async function latestThumbnailUrlBySession(input: {
  supabase: ServerSupabaseClient;
  sessionIds: string[];
}): Promise<Map<string, string>> {
  return latestByKey(input.supabase, input.sessionIds, (id) => id);
}

/**
 * Map of org id → signed URL of the newest design thumbnail across all of
 * that org's sessions. Orgs with no thumbnailed design are absent.
 */
export async function latestThumbnailUrlByOrg(input: {
  supabase: ServerSupabaseClient;
  orgIds: string[];
}): Promise<Map<string, string>> {
  const { supabase, orgIds } = input;
  if (orgIds.length === 0) return new Map();

  const { data, error } = await supabase.from('sessions').select('id, org_id').in('org_id', orgIds);
  if (error) {
    console.error('org session lookup for thumbnails failed', error);
    return new Map();
  }

  const orgBySession = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; org_id: string }[]) {
    orgBySession.set(row.id, row.org_id);
  }

  return latestByKey(supabase, Array.from(orgBySession.keys()), (sessionId) =>
    orgBySession.get(sessionId),
  );
}
