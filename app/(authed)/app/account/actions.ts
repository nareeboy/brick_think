'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { performAccountDelete, preDeleteAccount, type BlockingOrg } from '@/lib/account/delete';
import type { ActionResult } from '@/lib/actions/result';
import { createServerSupabaseClient } from '@/lib/db/server';
import { isPng } from '@/lib/images/validatePng';
import { type A11yPreferences } from '@/lib/a11y/preferences';
import { toJson } from '@/lib/db/json';

const MAX_NAME_LENGTH = 80;

export type UpdateProfileResult = ActionResult<{ fullName: string | null }, 'invalid_input'>;

export async function updateProfileAction(rawName: string): Promise<UpdateProfileResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount');

  const trimmed = String(rawName ?? '').trim();
  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      code: 'invalid_input',
      message: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    };
  }

  // Empty string clears the field — store null so the header falls back to
  // the email (matching the existing precedence in app/(authed)/app/layout.tsx).
  const next = trimmed.length === 0 ? null : trimmed;

  const res = await supabase.from('profiles').update({ full_name: next }).eq('id', user.id);
  if (res.error) throw new Error(`Failed to update profile: ${res.error.message}`);

  revalidatePath('/app/account');
  // The header reads full_name in the (authed) layout — bust those paths too.
  revalidatePath('/app/my-designs');
  revalidatePath('/app/workshops');
  return { ok: true, data: { fullName: next } };
}

const ALLOWED_AVATAR_MIME = 'image/png' as const;
// 512 KB ceiling. A 256x256 PNG of a typical photo is 80-200 KB; a
// pathological random-noise 256x256 RGBA PNG tops out around 260 KB. 512 KB
// has headroom without unbounding the upload surface.
const MAX_AVATAR_BYTES = 512 * 1024;

export type UpdateAvatarResult = ActionResult<
  { url: string },
  'invalid_image' | 'upload_failed' | 'profile_update_failed'
>;

export async function updateAvatarAction(formData: FormData): Promise<UpdateAvatarResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount');

  const raw = formData.get('avatar');
  if (!(raw instanceof Blob)) {
    console.warn('avatar rejected: not a Blob', { type: typeof raw });
    return { ok: false, code: 'invalid_image' };
  }
  if (raw.type !== ALLOWED_AVATAR_MIME) {
    console.warn('avatar rejected: wrong MIME', { mime: raw.type, size: raw.size });
    return { ok: false, code: 'invalid_image' };
  }
  if (raw.size === 0 || raw.size > MAX_AVATAR_BYTES) {
    console.warn('avatar rejected: size out of range', { size: raw.size, max: MAX_AVATAR_BYTES });
    return { ok: false, code: 'invalid_image' };
  }
  if (!(await isPng(raw))) {
    console.warn('avatar rejected: PNG magic-byte check failed', {
      mime: raw.type,
      size: raw.size,
    });
    return { ok: false, code: 'invalid_image' };
  }

  const path = `${user.id}/avatar.png`;
  const upload = await supabase.storage.from('avatars').upload(path, raw, {
    upsert: true,
    contentType: ALLOWED_AVATAR_MIME,
    cacheControl: '0',
  });
  if (upload.error) {
    return { ok: false, code: 'upload_failed', message: upload.error.message };
  }

  const publicUrlRes = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${publicUrlRes.data.publicUrl}?v=${Date.now()}`;

  const res = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
  if (res.error) {
    return { ok: false, code: 'profile_update_failed', message: res.error.message };
  }

  revalidatePath('/app/account');
  revalidatePath('/app/my-designs');
  revalidatePath('/app/workshops');
  return { ok: true, data: { url } };
}

export type RemoveAvatarResult = ActionResult<null, 'profile_update_failed'>;

export async function removeAvatarAction(): Promise<RemoveAvatarResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount');

  const path = `${user.id}/avatar.png`;
  // Idempotent on "not found" — log other errors so they surface in Railway
  // logs without failing the user-facing flow. The DB null still wins.
  const removeResult = await supabase.storage.from('avatars').remove([path]);
  if (removeResult.error && !/not found/i.test(removeResult.error.message)) {
    console.error('avatar storage removal failed (continuing):', removeResult.error.message);
  }

  const res = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
  if (res.error) {
    return { ok: false, code: 'profile_update_failed', message: res.error.message };
  }

  revalidatePath('/app/account');
  revalidatePath('/app/my-designs');
  revalidatePath('/app/workshops');
  return { ok: true, data: null };
}

export type UpdateA11yPreferencesResult = ActionResult<null, 'unauthenticated' | 'save_failed'>;

export async function updateA11yPreferencesAction(
  formData: FormData,
): Promise<UpdateA11yPreferencesResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: 'unauthenticated', message: 'Not signed in.' };

  // Form submits checkbox value as 'on' when checked, absent when not.
  const colourblindMode = formData.get('colourblindMode') === 'on';
  const next: A11yPreferences = { colourblindMode };

  const { error } = await supabase
    .from('profiles')
    .update({ a11y_preferences: toJson(next) })
    .eq('id', user.id);
  if (error) return { ok: false, code: 'save_failed', message: error.message };

  // Pages that read the preference need to revalidate.
  revalidatePath('/app/account');
  revalidatePath('/app/designs', 'layout');

  return { ok: true, data: null };
}

export type DeleteAccountResult =
  | ActionResult<null, 'invalid_input'>
  | { ok: false; code: 'blocked'; reasons: BlockingOrg[] };

export async function deleteAccountAction(confirmEmail: string): Promise<DeleteAccountResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount');

  const expectedEmail = user.email ?? '';
  if (!expectedEmail) {
    return { ok: false, code: 'invalid_input', message: 'Your account has no email on record.' };
  }
  if (confirmEmail.trim().toLowerCase() !== expectedEmail.toLowerCase()) {
    return {
      ok: false,
      code: 'invalid_input',
      message: `Type ${expectedEmail} to confirm.`,
    };
  }

  const plan = await preDeleteAccount(user.id);
  if (plan.blockingOrgs.length > 0) {
    return { ok: false, code: 'blocked', reasons: plan.blockingOrgs };
  }

  await performAccountDelete(user.id, plan);
  await supabase.auth.signOut();
  redirect('/sign-in?reason=account_deleted');
}
