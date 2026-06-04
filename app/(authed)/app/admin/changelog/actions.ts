// app/(authed)/app/admin/changelog/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  CHANGELOG_BODY_MAX,
  CHANGELOG_TITLE_MAX,
  CHANGELOG_VERSION_MAX,
  isChangelogCategory,
} from '@/lib/changelog/constants';
import { isValidPublishedDateInput, publishedDateToInstant } from '@/lib/changelog/publishedDate';
import { sanitizeChangelogHtml } from '@/lib/changelog/sanitizeHtml';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { Database } from '@/lib/db/types.generated';

type Code =
  | 'forbidden'
  | 'unauthenticated'
  | 'not_found'
  | 'invalid_title'
  | 'invalid_category'
  | 'invalid_version'
  | 'invalid_body'
  | 'invalid_published_date'
  | 'unknown';

export type ChangelogActionResult = { ok: true; id: string } | { ok: false; code: Code };

interface ChangelogInput {
  id?: string;
  title: string;
  category: string;
  versionTag: string;
  bodyHtml: string;
  publishedDate: string;
}

async function requireAdmin(): Promise<
  { supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> } | ChangelogActionResult
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated' };
  const { data, error } = await supabase
    .from('profiles')
    .select('is_site_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data?.is_site_admin) return { ok: false, code: 'forbidden' };
  return { supabase };
}

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === 'string' ? v.trim() : '';
}

function readInput(formData: FormData): ChangelogInput {
  const id = formData.get('id');
  const bodyRaw = formData.get('bodyHtml');
  return {
    id: typeof id === 'string' && id ? id : undefined,
    title: field(formData, 'title'),
    category: field(formData, 'category'),
    versionTag: field(formData, 'versionTag'),
    // Sanitize on save so the stored value is clean and the length check below
    // runs against what we actually persist.
    bodyHtml: sanitizeChangelogHtml(typeof bodyRaw === 'string' ? bodyRaw : ''),
    publishedDate: field(formData, 'publishedDate'),
  };
}

function validate(input: ChangelogInput): Code | null {
  if (input.title.length === 0 || input.title.length > CHANGELOG_TITLE_MAX) return 'invalid_title';
  if (!isChangelogCategory(input.category)) return 'invalid_category';
  if (input.versionTag.length > CHANGELOG_VERSION_MAX) return 'invalid_version';
  if (input.bodyHtml.length > CHANGELOG_BODY_MAX) return 'invalid_body';
  if (!isValidPublishedDateInput(input.publishedDate)) return 'invalid_published_date';
  return null;
}

function revalidate() {
  revalidatePath('/app/admin/changelog');
  revalidatePath('/app/admin');
  revalidatePath('/changelog');
  // Footer version tag can change on any publish/date edit; revalidate the
  // home page which renders the marketing Footer directly.
  revalidatePath('/');
}

export async function createEntryAction(formData: FormData): Promise<ChangelogActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  const input = readInput(formData);
  const invalid = validate(input);
  if (invalid) return { ok: false, code: invalid };

  const res = await supabase
    .from('changelog_entries')
    .insert({
      title: input.title,
      category: input.category,
      version_tag: input.versionTag.length === 0 ? null : input.versionTag,
      body_html: input.bodyHtml,
      status: 'draft',
    })
    .select('id')
    .single();
  if (res.error) return { ok: false, code: 'unknown' };
  revalidate();
  redirect(`/app/admin/changelog/${res.data.id}`);
}

export async function updateEntryAction(formData: FormData): Promise<ChangelogActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  const input = readInput(formData);
  if (!input.id) return { ok: false, code: 'not_found' };
  const invalid = validate(input);
  if (invalid) return { ok: false, code: invalid };

  // Re-read status server-side: published_at is applied only to published rows,
  // and an empty date means "leave as-is" — never write null (that would break
  // the changelog_published_has_timestamp CHECK and wipe the date).
  const existing = await supabase
    .from('changelog_entries')
    .select('status')
    .eq('id', input.id)
    .maybeSingle();
  if (!existing.data) return { ok: false, code: 'not_found' };

  const updateFields: Database['public']['Tables']['changelog_entries']['Update'] = {
    title: input.title,
    category: input.category,
    version_tag: input.versionTag.length === 0 ? null : input.versionTag,
    body_html: input.bodyHtml,
  };
  if (input.publishedDate.length > 0 && existing.data.status === 'published') {
    updateFields.published_at = publishedDateToInstant(input.publishedDate);
  }

  const res = await supabase
    .from('changelog_entries')
    .update(updateFields)
    .eq('id', input.id)
    .select('id')
    .single();
  if (res.error) {
    if (res.error.code === 'PGRST116') return { ok: false, code: 'not_found' };
    return { ok: false, code: 'unknown' };
  }
  revalidate();
  return { ok: true, id: res.data.id };
}

export async function publishEntryAction(id: string): Promise<ChangelogActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  const res = await supabase
    .from('changelog_entries')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .single();
  if (res.error) {
    if (res.error.code === 'PGRST116') return { ok: false, code: 'not_found' };
    return { ok: false, code: 'unknown' };
  }
  revalidate();
  return { ok: true, id: res.data.id };
}

export async function unpublishEntryAction(id: string): Promise<ChangelogActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  // Keep published_at: status is the visibility gate (RLS reads status alone),
  // and preserving the timestamp means re-publishing doesn't lose history.
  const res = await supabase
    .from('changelog_entries')
    .update({ status: 'draft' })
    .eq('id', id)
    .select('id')
    .single();
  if (res.error) {
    if (res.error.code === 'PGRST116') return { ok: false, code: 'not_found' };
    return { ok: false, code: 'unknown' };
  }
  revalidate();
  return { ok: true, id: res.data.id };
}

export async function deleteEntryAction(id: string): Promise<ChangelogActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  const res = await supabase.from('changelog_entries').delete().eq('id', id);
  if (res.error) return { ok: false, code: 'unknown' };
  revalidate();
  redirect('/app/admin/changelog');
}
