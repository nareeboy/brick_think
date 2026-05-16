'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import {
  performAccountDelete,
  preDeleteAccount,
  type BlockingOrg,
} from '@/lib/account/delete';
import { createServerSupabaseClient } from '@/lib/db/server';

const MAX_NAME_LENGTH = 80;

export type UpdateProfileResult =
  | { kind: 'ok'; fullName: string | null }
  | { kind: 'invalid_input'; reason: string };

export async function updateProfileAction(rawName: string): Promise<UpdateProfileResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount');

  const trimmed = String(rawName ?? '').trim();
  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      kind: 'invalid_input',
      reason: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    };
  }

  // Empty string clears the field — store null so the header falls back to
  // the email (matching the existing precedence in app/(authed)/app/layout.tsx).
  const next = trimmed.length === 0 ? null : trimmed;

  const res = await supabase
    .from('profiles')
    .update({ full_name: next })
    .eq('id', user.id);
  if (res.error) throw new Error(`Failed to update profile: ${res.error.message}`);

  revalidatePath('/app/account');
  // The header reads full_name in the (authed) layout — bust those paths too.
  revalidatePath('/app/my-designs');
  revalidatePath('/app/orgs');
  return { kind: 'ok', fullName: next };
}

const ALLOWED_AVATAR_MIME = 'image/png' as const;
const MAX_AVATAR_BYTES = 100 * 1024; // 100 KB ceiling for the cropped PNG.

export type UpdateAvatarResult =
  | { kind: 'ok'; url: string }
  | { kind: 'error'; reason: string };

export async function updateAvatarAction(
  formData: FormData,
): Promise<UpdateAvatarResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount');

  const raw = formData.get('avatar');
  if (!(raw instanceof Blob)) {
    return { kind: 'error', reason: 'invalid_image' };
  }
  if (raw.type !== ALLOWED_AVATAR_MIME) {
    return { kind: 'error', reason: 'invalid_image' };
  }
  if (raw.size === 0 || raw.size > MAX_AVATAR_BYTES) {
    return { kind: 'error', reason: 'invalid_image' };
  }

  const path = `${user.id}/avatar.png`;
  const upload = await supabase.storage.from('avatars').upload(path, raw, {
    upsert: true,
    contentType: ALLOWED_AVATAR_MIME,
    cacheControl: '0',
  });
  if (upload.error) {
    return { kind: 'error', reason: `upload_failed:${upload.error.message}` };
  }

  const publicUrlRes = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${publicUrlRes.data.publicUrl}?v=${Date.now()}`;

  const res = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', user.id);
  if (res.error) {
    return { kind: 'error', reason: `profile_update_failed:${res.error.message}` };
  }

  revalidatePath('/app/account');
  revalidatePath('/app/my-designs');
  revalidatePath('/app/orgs');
  return { kind: 'ok', url };
}

export type RemoveAvatarResult =
  | { kind: 'ok' }
  | { kind: 'error'; reason: string };

export async function removeAvatarAction(): Promise<RemoveAvatarResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount');

  const path = `${user.id}/avatar.png`;
  // Idempotent: missing-object is a silent no-op from storage.remove. We
  // ignore its error rather than failing the whole action.
  await supabase.storage.from('avatars').remove([path]);

  const res = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id);
  if (res.error) {
    return { kind: 'error', reason: `profile_update_failed:${res.error.message}` };
  }

  revalidatePath('/app/account');
  revalidatePath('/app/my-designs');
  revalidatePath('/app/orgs');
  return { kind: 'ok' };
}

export type DeleteAccountResult =
  | { kind: 'ok' }
  | { kind: 'invalid_input'; reason: string }
  | { kind: 'blocked'; reasons: BlockingOrg[] };

export async function deleteAccountAction(
  confirmEmail: string,
): Promise<DeleteAccountResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Faccount');

  const expectedEmail = user.email ?? '';
  if (!expectedEmail) {
    return { kind: 'invalid_input', reason: 'Your account has no email on record.' };
  }
  if (confirmEmail.trim().toLowerCase() !== expectedEmail.toLowerCase()) {
    return {
      kind: 'invalid_input',
      reason: `Type ${expectedEmail} to confirm.`,
    };
  }

  const plan = await preDeleteAccount(user.id);
  if (plan.blockingOrgs.length > 0) {
    return { kind: 'blocked', reasons: plan.blockingOrgs };
  }

  await performAccountDelete(user.id, plan);
  await supabase.auth.signOut();
  redirect('/sign-in?reason=account_deleted');
}
