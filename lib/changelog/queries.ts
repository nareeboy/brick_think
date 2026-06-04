// lib/changelog/queries.ts
import 'server-only';

import { createServerSupabaseClient } from '@/lib/db/server';

import { isChangelogCategory, type ChangelogCategory } from './constants';
import type { AdminChangelogEntry, ChangelogListItem, PublicChangelogEntry } from './types';

function asCategory(value: string): ChangelogCategory {
  // DB CHECK guarantees this, but narrow defensively so the public type is honest.
  return isChangelogCategory(value) ? value : 'feature';
}

const ADMIN_COLS = 'id, title, category, version_tag, status, published_at, updated_at';
const ADMIN_DETAIL_COLS = `${ADMIN_COLS}, body_html`;
const PUBLIC_COLS = 'id, title, body_html, category, version_tag, published_at';

// Public: published entries, newest-first by published_at. RLS already hides
// drafts from anon/non-admin callers; the status filter keeps an admin's own
// drafts off the public page too.
export async function listPublishedEntries(): Promise<PublicChangelogEntry[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('changelog_entries')
    .select(PUBLIC_COLS)
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error || !data) return [];
  return data
    .filter((r) => r.published_at !== null)
    .map((r) => ({
      id: r.id,
      title: r.title,
      bodyHtml: r.body_html,
      category: asCategory(r.category),
      versionTag: r.version_tag,
      publishedAt: r.published_at as string,
    }));
}

// Footer indicator: the version_tag of the newest published entry, or null if
// there are no published entries or the newest one has no tag.
//
// The Footer is an async server component rendered into otherwise-static pages
// (e.g. /contact). During build-time static generation the Supabase env vars
// (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) may be absent, in
// which case createServerSupabaseClient() throws and crashes prerendering.
// Swallow any failure and fall back to null — the footer simply omits the tag.
export async function getLatestPublishedVersionTag(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('changelog_entries')
      .select('version_tag, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const tag = data.version_tag?.trim();
    return tag ? tag : null;
  } catch {
    return null;
  }
}

export async function listEntriesForAdmin(): Promise<ChangelogListItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('changelog_entries')
    .select(ADMIN_COLS)
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    category: asCategory(r.category),
    versionTag: r.version_tag,
    status: r.status as ChangelogListItem['status'],
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
  }));
}

export async function getEntryForAdmin(id: string): Promise<AdminChangelogEntry | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('changelog_entries')
    .select(ADMIN_DETAIL_COLS)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    bodyHtml: data.body_html,
    category: asCategory(data.category),
    versionTag: data.version_tag,
    status: data.status as ChangelogListItem['status'],
    publishedAt: data.published_at,
    updatedAt: data.updated_at,
  };
}
