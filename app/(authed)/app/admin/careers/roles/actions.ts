'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  ROLE_DESCRIPTION_MAX,
  ROLE_EMPLOYMENT_TYPE_MAX,
  ROLE_LOCATION_MAX,
  ROLE_SUMMARY_MAX,
  ROLE_TITLE_MAX,
} from '@/lib/careers/constants';
import { sanitizeRoleHtml } from '@/lib/careers/sanitizeHtml';
import { isValidSlug, slugify } from '@/lib/careers/slug';
import { createServerSupabaseClient } from '@/lib/db/server';

type Code =
  | 'forbidden'
  | 'unauthenticated'
  | 'not_found'
  | 'invalid_title'
  | 'invalid_slug'
  | 'invalid_summary'
  | 'invalid_location'
  | 'invalid_employment_type'
  | 'invalid_description'
  | 'slug_taken'
  | 'unknown';

export type RoleActionResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; code: Code; message?: string };

interface RoleInput {
  id?: string;
  title: string;
  slug: string;
  location: string;
  employmentType: string;
  summary: string;
  descriptionHtml: string;
}

async function requireAdmin(): Promise<
  { supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> } | RoleActionResult
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

function readInput(formData: FormData): RoleInput {
  const id = formData.get('id');
  const title = field(formData, 'title');
  let slug = field(formData, 'slug');
  if (!slug && title) slug = slugify(title);
  const bodyRaw = formData.get('descriptionHtml');
  return {
    id: typeof id === 'string' && id ? id : undefined,
    title,
    slug,
    location: field(formData, 'location'),
    employmentType: field(formData, 'employmentType'),
    summary: field(formData, 'summary'),
    // Sanitize the WYSIWYG HTML here so the stored value is always clean and
    // the length check below runs against what we actually persist.
    descriptionHtml: sanitizeRoleHtml(typeof bodyRaw === 'string' ? bodyRaw : ''),
  };
}

function validate(input: RoleInput): Code | null {
  if (input.title.length === 0 || input.title.length > ROLE_TITLE_MAX) return 'invalid_title';
  if (!isValidSlug(input.slug)) return 'invalid_slug';
  if (input.summary.length > ROLE_SUMMARY_MAX) return 'invalid_summary';
  if (input.location.length > ROLE_LOCATION_MAX) return 'invalid_location';
  if (input.employmentType.length > ROLE_EMPLOYMENT_TYPE_MAX) return 'invalid_employment_type';
  if (input.descriptionHtml.length > ROLE_DESCRIPTION_MAX) return 'invalid_description';
  return null;
}

function revalidate(slug?: string) {
  revalidatePath('/app/admin/careers/roles');
  revalidatePath('/careers');
  if (slug) revalidatePath(`/careers/${slug}`);
}

export async function createRoleAction(formData: FormData): Promise<RoleActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  const input = readInput(formData);
  const invalid = validate(input);
  if (invalid) return { ok: false, code: invalid };

  const res = await supabase
    .from('careers_roles')
    .insert({
      title: input.title,
      slug: input.slug,
      location: input.location,
      employment_type: input.employmentType,
      summary: input.summary,
      description_html: input.descriptionHtml,
      is_open: true,
    })
    .select('id, slug')
    .single();
  if (res.error) {
    if (res.error.code === '23505') return { ok: false, code: 'slug_taken' };
    return { ok: false, code: 'unknown', message: res.error.message };
  }
  revalidate(res.data.slug);
  redirect(`/app/admin/careers/roles/${res.data.id}`);
}

export async function updateRoleAction(formData: FormData): Promise<RoleActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  const input = readInput(formData);
  if (!input.id) return { ok: false, code: 'not_found' };
  const invalid = validate(input);
  if (invalid) return { ok: false, code: invalid };

  const res = await supabase
    .from('careers_roles')
    .update({
      title: input.title,
      slug: input.slug,
      location: input.location,
      employment_type: input.employmentType,
      summary: input.summary,
      description_html: input.descriptionHtml,
    })
    .eq('id', input.id)
    .select('id, slug')
    .single();
  if (res.error) {
    if (res.error.code === '23505') return { ok: false, code: 'slug_taken' };
    if (res.error.code === 'PGRST116') return { ok: false, code: 'not_found' };
    return { ok: false, code: 'unknown', message: res.error.message };
  }
  revalidate(res.data.slug);
  return { ok: true, id: res.data.id, slug: res.data.slug };
}

export async function setRoleOpenAction(id: string, isOpen: boolean): Promise<RoleActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  const res = await supabase
    .from('careers_roles')
    .update({ is_open: isOpen })
    .eq('id', id)
    .select('id, slug')
    .single();
  if (res.error) {
    if (res.error.code === 'PGRST116') return { ok: false, code: 'not_found' };
    return { ok: false, code: 'unknown', message: res.error.message };
  }
  revalidate(res.data.slug);
  return { ok: true, id: res.data.id, slug: res.data.slug };
}

export async function deleteRoleAction(id: string): Promise<RoleActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase } = guard;
  const res = await supabase
    .from('careers_roles')
    .delete()
    .eq('id', id)
    .select('slug')
    .maybeSingle();
  if (res.error) return { ok: false, code: 'unknown', message: res.error.message };
  revalidate(res.data?.slug ?? undefined);
  redirect('/app/admin/careers/roles');
}
