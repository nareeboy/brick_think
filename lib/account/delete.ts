import 'server-only';

import { getServiceSupabaseClient } from '@/lib/db/service';

export interface BlockingOrg {
  id: string;
  name: string;
  slug: string;
  reason: 'has_members';
}

export interface PreDeleteCheck {
  blockingOrgs: BlockingOrg[];
  soloEmptyOrgIds: string[];
  thumbnailPaths: string[];
}

interface OwnedOrgRow {
  id: string;
  name: string;
  slug: string;
}

/**
 * Inventory everything we'll need to do before deleting the auth user.
 *
 * - `blockingOrgs` — orgs the user owns that still have other members. UI
 *   surfaces these as "transfer first" before allowing the destructive action.
 * - `soloEmptyOrgIds` — orgs the user owns alone, safe to hard-delete as a
 *   pre-step (cascade clears memberships, sessions, designs, share-links).
 * - `thumbnailPaths` — `${userId}/...` keys to remove from storage manually,
 *   since storage.objects has no cascade.
 */
export async function preDeleteAccount(userId: string): Promise<PreDeleteCheck> {
  const supabase = getServiceSupabaseClient();

  const ownedRes = await supabase
    .from('organisations')
    .select('id, name, slug')
    .eq('owner_id', userId);
  if (ownedRes.error) throw new Error(`Failed to load owned orgs: ${ownedRes.error.message}`);
  const ownedOrgs = (ownedRes.data ?? []) as OwnedOrgRow[];

  const blockingOrgs: BlockingOrg[] = [];
  const soloEmptyOrgIds: string[] = [];

  if (ownedOrgs.length > 0) {
    const orgIds = ownedOrgs.map((o) => o.id);

    const memberCountsRes = await supabase
      .from('org_memberships')
      .select('org_id')
      .in('org_id', orgIds)
      .neq('profile_id', userId);
    if (memberCountsRes.error) {
      throw new Error(`Failed to count other members: ${memberCountsRes.error.message}`);
    }
    const otherMembersByOrg = new Map<string, number>();
    for (const row of (memberCountsRes.data ?? []) as { org_id: string }[]) {
      otherMembersByOrg.set(row.org_id, (otherMembersByOrg.get(row.org_id) ?? 0) + 1);
    }

    for (const org of ownedOrgs) {
      const otherMembers = otherMembersByOrg.get(org.id) ?? 0;
      if (otherMembers > 0) {
        blockingOrgs.push({ ...org, reason: 'has_members' });
        continue;
      }
      soloEmptyOrgIds.push(org.id);
    }
  }

  const thumbnailPaths = await listOwnedThumbnailPaths(userId);

  return { blockingOrgs, soloEmptyOrgIds, thumbnailPaths };
}

async function listOwnedThumbnailPaths(userId: string): Promise<string[]> {
  const supabase = getServiceSupabaseClient();
  // We follow the bucket convention `${userId}/...` (see supabase/CLAUDE.md).
  // Listing with the userId prefix gives us every blob owned by this user.
  const { data, error } = await supabase.storage.from('model-thumbnails').list(userId, {
    limit: 1000,
  });
  if (error) {
    // Storage list errors are non-fatal — log and continue; orphaned blobs are
    // cheap and a follow-up sweep can clean them up. Better than blocking the
    // GDPR-shaped path because of a transient storage failure.
    console.warn('thumbnail list failed during preDeleteAccount', { userId, error });
    return [];
  }
  return (data ?? [])
    .map((entry) => entry.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .map((name) => `${userId}/${name}`);
}

/**
 * Execute the delete. Caller is responsible for refusing if
 * `preDeleteAccount` returned any `blockingOrgs`.
 */
export async function performAccountDelete(
  userId: string,
  plan: PreDeleteCheck,
): Promise<void> {
  const supabase = getServiceSupabaseClient();

  if (plan.thumbnailPaths.length > 0) {
    const cleanup = await supabase.storage
      .from('model-thumbnails')
      .remove(plan.thumbnailPaths);
    if (cleanup.error) {
      console.warn('thumbnail cleanup failed during account delete', {
        userId,
        error: cleanup.error,
      });
    }
  }

  // Remove the avatar object if one exists. Idempotent — missing-object is a
  // silent no-op from storage.remove. Mirrors the thumbnail sweep above.
  const avatarCleanup = await supabase.storage
    .from('avatars')
    .remove([`${userId}/avatar.png`]);
  if (avatarCleanup.error) {
    console.warn('avatar cleanup failed during account delete', {
      userId,
      error: avatarCleanup.error,
    });
  }

  for (const orgId of plan.soloEmptyOrgIds) {
    const del = await supabase.from('organisations').delete().eq('id', orgId);
    if (del.error) {
      throw new Error(`Failed to delete sole-owner org ${orgId}: ${del.error.message}`);
    }
  }

  const authDel = await supabase.auth.admin.deleteUser(userId);
  if (authDel.error) {
    throw new Error(`Failed to delete auth user: ${authDel.error.message}`);
  }

  console.warn('account_deleted', {
    userId,
    removedOrgs: plan.soloEmptyOrgIds.length,
    blocked: plan.blockingOrgs.length,
  });
}
