// app/(authed)/app/admin/banner/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

import { BANNER_MESSAGE_MAX, isBannerType } from '@/lib/banner/constants';
import { createServerSupabaseClient } from '@/lib/db/server';

type Code = 'forbidden' | 'unauthenticated' | 'invalid_type' | 'invalid_message' | 'unknown';

export type BannerActionResult = { ok: true } | { ok: false; code: Code };

async function requireAdmin(): Promise<
  | { supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; userId: string }
  | BannerActionResult
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

export async function saveBannerAction(formData: FormData): Promise<BannerActionResult> {
  const guard = await requireAdmin();
  if ('ok' in guard) return guard;
  const { supabase, userId } = guard;

  const isActive = formData.get('isActive') === 'true';
  const typeRaw = formData.get('type');
  const type = typeof typeRaw === 'string' ? typeRaw : '';
  const messageRaw = formData.get('message');
  const message = typeof messageRaw === 'string' ? messageRaw.trim() : '';

  if (!isBannerType(type)) return { ok: false, code: 'invalid_type' };
  if (message.length > BANNER_MESSAGE_MAX) return { ok: false, code: 'invalid_message' };

  // updated_at is bumped by the trigger; updating always changes the dismissal
  // version so an edited banner re-shows for everyone.
  const res = await supabase
    .from('site_banner')
    .update({ is_active: isActive, type, message, updated_by: userId })
    .eq('id', true);
  if (res.error) return { ok: false, code: 'unknown' };

  // Site-wide: revalidate every route under the root layout, plus the editor.
  revalidatePath('/', 'layout');
  revalidatePath('/app/admin/banner');
  return { ok: true };
}
