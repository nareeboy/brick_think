// app/(authed)/app/admin/changelog/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  CHANGELOG_BANNER_MAX_BYTES,
  CHANGELOG_BODY_MAX,
  CHANGELOG_TITLE_MAX,
  CHANGELOG_VERSION_MAX,
  isChangelogCategory,
} from '@/lib/changelog/constants';
import { isValidPublishedDateInput, publishedDateToInstant } from '@/lib/changelog/publishedDate';
import { sanitizeChangelogHtml } from '@/lib/changelog/sanitizeHtml';
import { CHANGELOG_BANNERS_BUCKET } from '@/lib/changelog/storage';
import { createServerSupabaseClient } from '@/lib/db/server';
import type { Database } from '@/lib/db/types.generated';
import { isJpeg } from '@/lib/images/validateJpeg';
import { isPng } from '@/lib/images/validatePng';

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
  | { supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; userId: string }
  | ChangelogActionResult
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
  return { supabase, userId: user.id };
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
      // A draft may carry a date (the CHECK only requires PUBLISHED rows to have
      // one). Storing it now means publish can honor the admin's chosen date.
      published_at:
        input.publishedDate.length > 0 ? publishedDateToInstant(input.publishedDate) : null,
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

  const updateFields: Database['public']['Tables']['changelog_entries']['Update'] = {
    title: input.title,
    category: input.category,
    version_tag: input.versionTag.length === 0 ? null : input.versionTag,
    body_html: input.bodyHtml,
  };
  // A date can be set or changed on ANY entry (draft or published). An empty
  // input means "leave as-is" — we never write null, which would break the
  // changelog_published_has_timestamp CHECK on a published row and silently
  // wipe the date on a draft.
  if (input.publishedDate.length > 0) {
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
  // Honor a date the admin already set in the editor; only stamp "now" when the
  // entry has no date yet. Either way the published row ends up with a non-null
  // published_at, satisfying the changelog_published_has_timestamp CHECK.
  const existing = await supabase
    .from('changelog_entries')
    .select('published_at')
    .eq('id', id)
    .maybeSingle();
  if (!existing.data) return { ok: false, code: 'not_found' };
  const publishedAt = existing.data.published_at ?? new Date().toISOString();
  const res = await supabase
    .from('changelog_entries')
    .update({ status: 'published', published_at: publishedAt })
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
  // Capture the banner path first so we can sweep Storage after the row is gone
  // (deleting the row does not cascade to storage.objects).
  const existing = await supabase
    .from('changelog_entries')
    .select('banner_image_path')
    .eq('id', id)
    .maybeSingle();
  const res = await supabase.from('changelog_entries').delete().eq('id', id);
  if (res.error) return { ok: false, code: 'unknown' };
  if (existing.data?.banner_image_path) {
    await supabase.storage.from(CHANGELOG_BANNERS_BUCKET).remove([existing.data.banner_image_path]);
  }
  revalidate();
  redirect('/app/admin/changelog');
}

// Banner image upload/remove. Separate result shape (message-carrying) because
// the BannerImageField surfaces failures inline, mirroring the articles
// CoverImageField contract.
export type ChangelogBannerResult = { ok: true } | { ok: false; message: string };

export async function uploadBannerImageAction(formData: FormData): Promise<ChangelogBannerResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return { ok: false, message: 'You do not have permission to do that.' };
  const { supabase, userId } = guard;

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { ok: false, message: 'This entry no longer exists.' };
  const file = formData.get('banner');
  if (!(file instanceof Blob)) return { ok: false, message: 'No file received.' };

  // MIME is the cheap first check; the magic-byte sniff is the real gate —
  // Content-Type is client-set and an `image/png` header on an SVG-with-script
  // is the classic stored-XSS trap.
  let extension: 'png' | 'jpg';
  let contentType: 'image/png' | 'image/jpeg';
  if (file.type === 'image/png') {
    if (!(await isPng(file))) return { ok: false, message: 'Banner must be a valid PNG or JPG.' };
    extension = 'png';
    contentType = 'image/png';
  } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    if (!(await isJpeg(file))) return { ok: false, message: 'Banner must be a valid PNG or JPG.' };
    extension = 'jpg';
    contentType = 'image/jpeg';
  } else {
    return { ok: false, message: 'Banner must be a PNG or JPG.' };
  }

  if (file.size === 0 || file.size > CHANGELOG_BANNER_MAX_BYTES) {
    return { ok: false, message: 'Banner must be ≤ 2 MB.' };
  }

  // Verify the entry exists (and capture the prior path) through the user-scoped
  // client before writing bytes — Storage RLS only checks the path's user-folder.
  const existing = await supabase
    .from('changelog_entries')
    .select('banner_image_path')
    .eq('id', id)
    .maybeSingle();
  if (!existing.data) return { ok: false, message: 'This entry no longer exists.' };

  const path = `${userId}/${id}.${extension}`;
  const uploadRes = await supabase.storage
    .from(CHANGELOG_BANNERS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '0', contentType });
  if (uploadRes.error) return { ok: false, message: uploadRes.error.message };

  // If the previous banner lived at a different extension, sweep it so the
  // bucket keeps at most one object per entry.
  const previousPath = existing.data.banner_image_path;
  if (previousPath && previousPath !== path) {
    await supabase.storage.from(CHANGELOG_BANNERS_BUCKET).remove([previousPath]);
  }

  const update = await supabase
    .from('changelog_entries')
    .update({ banner_image_path: path })
    .eq('id', id);
  if (update.error) return { ok: false, message: update.error.message };

  revalidate();
  return { ok: true };
}

export async function removeBannerImageAction(id: string): Promise<ChangelogBannerResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return { ok: false, message: 'You do not have permission to do that.' };
  const { supabase } = guard;

  const existing = await supabase
    .from('changelog_entries')
    .select('banner_image_path')
    .eq('id', id)
    .maybeSingle();
  if (!existing.data) return { ok: false, message: 'This entry no longer exists.' };

  if (existing.data.banner_image_path) {
    await supabase.storage.from(CHANGELOG_BANNERS_BUCKET).remove([existing.data.banner_image_path]);
  }

  const update = await supabase
    .from('changelog_entries')
    .update({ banner_image_path: null })
    .eq('id', id);
  if (update.error) return { ok: false, message: update.error.message };

  revalidate();
  return { ok: true };
}
