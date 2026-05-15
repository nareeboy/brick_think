'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
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
  const { user } = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();

  if (name.length < 1 || name.length > 80) {
    return { kind: 'invalid_input', field: 'name' };
  }
  if (!isValidSlug(slug)) {
    return { kind: 'invalid_input', field: 'slug' };
  }

  // Service-role insert: the application-level invariant (owner_id = user.id) is
  // enforced by this action (the owner is always the authenticated caller).
  // We use service-role here because the user-scoped client hits an RLS check
  // that fails inconsistently on freshly-created profiles in some Supabase
  // setups, even when owner_id matches auth.uid(). The owner-membership trigger
  // on organisations runs in either case.
  const service = getServiceSupabaseClient();
  const { data, error } = await service
    .from('organisations')
    .insert({ name, slug, owner_id: user.id })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') return { kind: 'slug_taken' };
    throw new Error(`Failed to create organisation: ${error.message}`);
  }
  if (!data) throw new Error('Failed to create organisation: no id returned');

  revalidatePath('/app/orgs');
  revalidatePath('/app/my-designs');
  return { kind: 'ok', orgId: data.id };
}

export type AddMemberResult =
  | { kind: 'ok' }
  | { kind: 'invalid_input' }
  | { kind: 'unknown_email' }
  | { kind: 'already_member' }
  | { kind: 'forbidden' };

export async function addOrgMemberAction(
  orgId: string,
  email: string,
): Promise<AddMemberResult> {
  const { supabase } = await requireUser();
  const trimmed = email.trim();
  if (trimmed.length === 0) return { kind: 'invalid_input' };

  // citext column => case-insensitive match.
  // Use service-role for the lookup: the user-scoped client cannot SELECT
  // profile rows of users they don't already share an org with, which makes
  // the add-by-email flow impossible without a privileged read here. Only
  // returns the matched profile id (no other PII) — application-level safe.
  const service = getServiceSupabaseClient();
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('id')
    .eq('email', trimmed)
    .maybeSingle();
  if (profileError) throw new Error(`Lookup failed: ${profileError.message}`);
  if (!profile) return { kind: 'unknown_email' };

  // Eagerly check for an existing membership to surface a clear UI error
  // before hitting the unique constraint. The 23505 fallback on insert
  // handles the race between two simultaneous adds.
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
  revalidatePath('/app/my-designs');
}

export type RenameOrgResult =
  | { kind: 'ok' }
  | { kind: 'invalid_input' }
  | { kind: 'forbidden' }
  | { kind: 'not_found' };

export async function renameOrgAction(
  orgId: string,
  name: string,
): Promise<RenameOrgResult> {
  const { supabase } = await requireUser();
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    return { kind: 'invalid_input' };
  }

  // RLS restricts UPDATE to admins/owners. A row only comes back from
  // `.select()` if the policy passed AND the row existed — distinguish via a
  // follow-up existence probe so the UI can show the right message.
  const { data, error } = await supabase
    .from('organisations')
    .update({ name: trimmed })
    .eq('id', orgId)
    .select('id');
  if (error) {
    if (error.code === '42501') return { kind: 'forbidden' };
    throw new Error(`Rename failed: ${error.message}`);
  }
  if (!data || data.length === 0) {
    const { count } = await supabase
      .from('organisations')
      .select('id', { count: 'exact', head: true })
      .eq('id', orgId);
    return (count ?? 0) === 0 ? { kind: 'not_found' } : { kind: 'forbidden' };
  }

  revalidatePath('/app/orgs');
  revalidatePath(`/app/orgs/${orgId}`);
  revalidatePath('/app/my-designs');
  return { kind: 'ok' };
}

export type DeleteOrgResult =
  | { kind: 'ok' }
  | { kind: 'forbidden' }
  | { kind: 'not_found' };

export async function deleteOrgAction(orgId: string): Promise<DeleteOrgResult> {
  const { supabase } = await requireUser();

  // RLS restricts DELETE to the owner. As with rename, .select() lets us tell
  // forbidden (RLS dropped the row) from not_found (gone already).
  // Cascade-deletes memberships, sessions, stages, models, per-org settings;
  // sets designs.org_id to null via FK.
  const { data, error } = await supabase
    .from('organisations')
    .delete()
    .eq('id', orgId)
    .select('id');
  if (error) {
    if (error.code === '42501') return { kind: 'forbidden' };
    throw new Error(`Delete failed: ${error.message}`);
  }
  if (!data || data.length === 0) {
    const { count } = await supabase
      .from('organisations')
      .select('id', { count: 'exact', head: true })
      .eq('id', orgId);
    return (count ?? 0) === 0 ? { kind: 'not_found' } : { kind: 'forbidden' };
  }

  revalidatePath('/app/orgs');
  revalidatePath('/app/my-designs');
  return { kind: 'ok' };
}
