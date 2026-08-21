'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import type { ActionResult } from '@/lib/actions/result';
import { createServerSupabaseClient } from '@/lib/db/server';
import { getServiceSupabaseClient } from '@/lib/db/service';
import { buildOrgAddedEmail } from '@/lib/email/orgAdded';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { publicOriginFromHeaders } from '@/lib/http/publicOrigin';
import { dispatchOrgAddedNotification, resolveActorDisplay } from '@/lib/notifications/dispatch';
import { createWorkshop, type CreateWorkshopResult } from '@/lib/workshops/service';

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=%2Fapp%2Forgs');
  return { supabase, user };
}

export type CreateOrgResult = CreateWorkshopResult;

export async function createOrgAction(formData: FormData): Promise<CreateOrgResult> {
  const { user } = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();

  const res = await createWorkshop({ name, slug, ownerId: user.id });
  if (!res.ok) return res;

  revalidatePath('/app/workshops');
  revalidatePath('/app/my-designs');
  return res;
}

/**
 * Success is itself two-fold (existing user added vs invite emailed) —
 * discriminated by `data.status`. `invite_pending` is a failure code carrying
 * the email so the dialog can echo it back.
 */
export type AddMemberResult =
  | ActionResult<
      | { status: 'added'; recipientDisplay: string; orgName: string }
      | { status: 'invited'; email: string; orgName: string },
      'invalid_input' | 'already_member' | 'forbidden' | 'invite_failed'
    >
  | { ok: false; code: 'invite_pending'; email: string };

export async function addOrgMemberAction(orgId: string, email: string): Promise<AddMemberResult> {
  const { supabase, user } = await requireUser();
  const trimmed = email.trim();
  if (trimmed.length === 0) return { ok: false, code: 'invalid_input' };

  // The caller must be an org admin/owner to add anyone. We hand-roll this
  // check up front so the unknown-email invite path doesn't leak the
  // existence of pending invites (or accept invites silently) for someone
  // who couldn't add a member in the first place.
  const { data: adminProbe, error: adminProbeError } = await supabase
    .from('org_memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('profile_id', user.id)
    .maybeSingle();
  if (adminProbeError) throw new Error(`Auth check failed: ${adminProbeError.message}`);
  if (!adminProbe || (adminProbe.role !== 'owner' && adminProbe.role !== 'admin')) {
    return { ok: false, code: 'forbidden' };
  }

  const service = getServiceSupabaseClient();

  // Resolve the org name + caller identity once — both the existing-user
  // notification and the admin-side confirmation toast want them.
  const [orgRes, actorRes] = await Promise.all([
    service.from('organisations').select('name').eq('id', orgId).maybeSingle(),
    service.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
  ]);
  const orgName = orgRes.data?.name ?? 'a workshop';
  const actorDisplay = resolveActorDisplay({
    fullName: actorRes.data?.full_name,
    email: actorRes.data?.email ?? user.email ?? null,
  });

  // citext column => case-insensitive match.
  // Service-role for the lookup: the user-scoped client cannot SELECT
  // profile rows of users they don't already share an org with, which makes
  // the add-by-email flow impossible without a privileged read here. Only
  // returns the matched profile id, email, and name — application-level safe.
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', trimmed)
    .maybeSingle();
  if (profileError) throw new Error(`Lookup failed: ${profileError.message}`);

  // Existing user → straight membership insert + in-app notification.
  if (profile) {
    const { count, error: countError } = await supabase
      .from('org_memberships')
      .select('profile_id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('profile_id', profile.id);
    if (countError) throw new Error(`Membership check failed: ${countError.message}`);
    if ((count ?? 0) > 0) return { ok: false, code: 'already_member' };

    const { error: insertError } = await supabase
      .from('org_memberships')
      .insert({ org_id: orgId, profile_id: profile.id, role: 'member' });
    if (insertError) {
      if (insertError.code === '42501') return { ok: false, code: 'forbidden' };
      if (insertError.code === '23505') return { ok: false, code: 'already_member' };
      throw new Error(`Add member failed: ${insertError.message}`);
    }

    const recipientDisplay = resolveActorDisplay({
      fullName: profile.full_name,
      email: profile.email,
    });

    await dispatchOrgAddedNotification({
      recipientProfileId: profile.id,
      orgId,
      orgName,
      actorProfileId: user.id,
      actorDisplay,
    });

    // Best-effort email alongside the bell notification — a send failure
    // (or unset RESEND_API_KEY) must never fail the membership add.
    // RESEND_WORKSHOP_FROM_ADDRESS gives workshop emails their own verified
    // sender; unset, the shared RESEND_FROM_ADDRESS (then default) applies.
    const origin = publicOriginFromHeaders(await headers());
    await sendTransactionalEmail({
      to: profile.email,
      from: process.env.RESEND_WORKSHOP_FROM_ADDRESS || undefined,
      ...buildOrgAddedEmail({
        recipientName: profile.full_name,
        actorDisplay,
        orgName,
        workshopUrl: `${origin}/app/workshops/${orgId}`,
      }),
    });

    revalidatePath(`/app/workshops/${orgId}`);
    return { ok: true, data: { status: 'added', recipientDisplay, orgName } };
  }

  // No profile → send an invite. Idempotent on the (org_id, email) unique
  // index (partial WHERE claimed_at is null) — surfacing the already-pending
  // case to the UI so we don't fire a duplicate magic link.
  const { error: inviteInsertError } = await service.from('org_invitations').insert({
    org_id: orgId,
    email: trimmed,
    invited_by: user.id,
  });
  if (inviteInsertError) {
    if (inviteInsertError.code === '23505') {
      return { ok: false, code: 'invite_pending', email: trimmed };
    }
    throw new Error(`Invite create failed: ${inviteInsertError.message}`);
  }

  // Resolve site origin the same way the sign-in actions do. We point at
  // /auth/confirm so the invite email's token_hash works even when the
  // invitee opens it in a different browser than the one the inviter is on
  // (which is always the case for cross-user invites). See app/auth/confirm.
  const origin = publicOriginFromHeaders(await headers());
  const redirectTo = `${origin}/auth/confirm?next=${encodeURIComponent(`/app/workshops/${orgId}`)}`;

  const inviteRes = await service.auth.admin.inviteUserByEmail(trimmed, { redirectTo });
  if (inviteRes.error) {
    // The auth API failed but we already wrote an org_invitations row. Best
    // effort: clean it up so a retry behaves like the first attempt.
    await service
      .from('org_invitations')
      .delete()
      .eq('org_id', orgId)
      .eq('email', trimmed)
      .is('claimed_at', null);
    return { ok: false, code: 'invite_failed', message: inviteRes.error.message };
  }

  revalidatePath(`/app/workshops/${orgId}`);
  return { ok: true, data: { status: 'invited', email: trimmed, orgName } };
}

export async function removeOrgMemberAction(orgId: string, profileId: string): Promise<void> {
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
  revalidatePath(`/app/workshops/${orgId}`);
  revalidatePath('/app/workshops');
  revalidatePath('/app/my-designs');
}

export type RenameOrgResult = ActionResult<null, 'invalid_input' | 'forbidden' | 'not_found'>;

export async function renameOrgAction(orgId: string, name: string): Promise<RenameOrgResult> {
  const { supabase } = await requireUser();
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    return { ok: false, code: 'invalid_input' };
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
    if (error.code === '42501') return { ok: false, code: 'forbidden' };
    throw new Error(`Rename failed: ${error.message}`);
  }
  if (!data || data.length === 0) {
    const { count } = await supabase
      .from('organisations')
      .select('id', { count: 'exact', head: true })
      .eq('id', orgId);
    return (count ?? 0) === 0 ? { ok: false, code: 'not_found' } : { ok: false, code: 'forbidden' };
  }

  revalidatePath('/app/workshops');
  revalidatePath(`/app/workshops/${orgId}`);
  revalidatePath('/app/my-designs');
  return { ok: true, data: null };
}

export type DeleteOrgResult = ActionResult<null, 'forbidden' | 'not_found'>;

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
    if (error.code === '42501') return { ok: false, code: 'forbidden' };
    throw new Error(`Delete failed: ${error.message}`);
  }
  if (!data || data.length === 0) {
    const { count } = await supabase
      .from('organisations')
      .select('id', { count: 'exact', head: true })
      .eq('id', orgId);
    return (count ?? 0) === 0 ? { ok: false, code: 'not_found' } : { ok: false, code: 'forbidden' };
  }

  revalidatePath('/app/workshops');
  revalidatePath('/app/my-designs');
  return { ok: true, data: null };
}
