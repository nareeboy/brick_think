// lib/banner/queries.ts
import 'server-only';

import { createServerSupabaseClient } from '@/lib/db/server';

import { isBannerType, type BannerType } from './constants';
import type { AdminSiteBanner, SiteBanner } from './types';

function asType(value: string): BannerType {
  // The DB CHECK guarantees this; narrow defensively so the type stays honest.
  return isBannerType(value) ? value : 'info';
}

// Public read for every page. RLS hides the row entirely when inactive for
// non-admins; we also null out for admins (they shouldn't see an inactive
// banner on the public surface) and for empty messages. Any read error returns
// null so a banner outage can never break page render.
export async function getActiveBanner(): Promise<SiteBanner | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('site_banner')
    .select('is_active, type, message, updated_at')
    .eq('id', true)
    .maybeSingle();
  if (error || !data || !data.is_active) return null;
  const message = (data.message ?? '').trim();
  if (message.length === 0) return null;
  return { type: asType(data.type), message, version: data.updated_at };
}

// Admin editor read — returns the row regardless of active state. Called only
// inside the admin-gated /app/admin/banner subtree.
export async function getBannerForAdmin(): Promise<AdminSiteBanner> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('site_banner')
    .select('is_active, type, message, updated_at')
    .eq('id', true)
    .maybeSingle();
  if (!data) {
    return { isActive: false, type: 'info', message: '', version: '' };
  }
  return {
    isActive: data.is_active,
    type: asType(data.type),
    message: data.message ?? '',
    version: data.updated_at,
  };
}
