// lib/careers/queries.ts
import 'server-only';

import { createServerSupabaseClient } from '@/lib/db/server';
import type { PublicRole, RoleListItem } from './types';

const LIST_COLS = 'id, slug, title, location, employment_type, summary, is_open, created_at';
const DETAIL_COLS = `${LIST_COLS}, description_html`;

export async function listOpenRoles(): Promise<RoleListItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('careers_roles')
    .select(LIST_COLS)
    .eq('is_open', true)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    location: r.location,
    employmentType: r.employment_type,
    summary: r.summary,
    isOpen: r.is_open,
    createdAt: r.created_at,
  }));
}

export async function getOpenRoleBySlug(slug: string): Promise<PublicRole | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('careers_roles')
    .select(DETAIL_COLS)
    .eq('slug', slug)
    .eq('is_open', true)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    location: data.location,
    employmentType: data.employment_type,
    summary: data.summary,
    isOpen: data.is_open,
    createdAt: data.created_at,
    descriptionHtml: data.description_html,
  };
}
