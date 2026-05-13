'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { isValidSlug } from '@/lib/orgs/slug';

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Forgs');
  return { supabase, user };
}

export type CreateOrgResult =
  | { kind: 'ok'; orgId: string }
  | { kind: 'invalid_input'; field: 'name' | 'slug' }
  | { kind: 'slug_taken' };

export async function createOrgAction(formData: FormData): Promise<CreateOrgResult> {
  const { supabase, user } = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();

  if (name.length < 1 || name.length > 80) {
    return { kind: 'invalid_input', field: 'name' };
  }
  if (!isValidSlug(slug)) {
    return { kind: 'invalid_input', field: 'slug' };
  }

  const { data, error } = await supabase
    .from('organisations')
    .insert({ name, slug, owner_id: user.id })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') return { kind: 'slug_taken' };
    throw new Error(`Failed to create organisation: ${error.message}`);
  }
  if (!data) throw new Error('Failed to create organisation: no id returned');

  // Make the new org the user's active context immediately.
  const profileUpdate = await supabase
    .from('profiles')
    .update({ active_org_id: data.id })
    .eq('id', user.id);
  if (profileUpdate.error) {
    throw new Error(`Org created but switching context failed: ${profileUpdate.error.message}`);
  }

  revalidatePath('/app/orgs');
  revalidatePath('/app/designs');
  return { kind: 'ok', orgId: data.id };
}

export type AddMemberResult =
  | { kind: 'ok' }
  | { kind: 'unknown_email' }
  | { kind: 'already_member' }
  | { kind: 'forbidden' };

export async function addOrgMemberAction(
  orgId: string,
  email: string,
): Promise<AddMemberResult> {
  const { supabase } = await requireUser();
  const trimmed = email.trim();
  if (trimmed.length === 0) return { kind: 'unknown_email' };

  // citext column => case-insensitive match.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', trimmed)
    .maybeSingle();
  if (profileError) throw new Error(`Lookup failed: ${profileError.message}`);
  if (!profile) return { kind: 'unknown_email' };

  // Pre-check membership for a clean error path. The unique PK would
  // raise 23505 anyway; this gives the form a friendlier message.
  const { count, error: countError } = await supabase
    .from('org_memberships')
    .select('profile_id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('profile_id', profile.id);
  if (countError) throw new Error(`Membership check failed: ${countError.message}`);
  if ((count ?? 0) > 0) return { kind: 'already_member' };

  const { error: insertError } = await supabase
    .from('org_memberships')
    .insert({ org_id: orgId, profile_id: profile.id, role: 'member' });
  if (insertError) {
    if (insertError.code === '42501') return { kind: 'forbidden' };
    if (insertError.code === '23505') return { kind: 'already_member' };
    throw new Error(`Add member failed: ${insertError.message}`);
  }

  revalidatePath(`/app/orgs/${orgId}`);
  return { kind: 'ok' };
}

export async function removeOrgMemberAction(
  orgId: string,
  profileId: string,
): Promise<void> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from('org_memberships')
    .delete()
    .eq('org_id', orgId)
    .eq('profile_id', profileId)
    .select('profile_id');
  if (error) throw new Error(`Remove member failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error('Member not found or you lack permission to remove them');
  }
  revalidatePath(`/app/orgs/${orgId}`);
  revalidatePath('/app/orgs');
  revalidatePath('/app/designs');
}

export async function setActiveContextAction(
  orgId: string | null,
): Promise<void> {
  const { supabase, user } = await requireUser();

  if (orgId !== null) {
    // Defence-in-depth: confirm the user is actually a member.
    const { count, error } = await supabase
      .from('org_memberships')
      .select('profile_id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('profile_id', user.id);
    if (error) throw new Error(`Membership check failed: ${error.message}`);
    if ((count ?? 0) === 0) {
      throw new Error('You are not a member of that organisation');
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ active_org_id: orgId })
    .eq('id', user.id);
  if (error) throw new Error(`Failed to set active context: ${error.message}`);

  revalidatePath('/app/designs');
  revalidatePath('/app/orgs');
}
