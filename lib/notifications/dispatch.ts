import 'server-only';

import { getServiceSupabaseClient } from '@/lib/db/service';

export { resolveActorDisplay } from './actorDisplay';

export type NotificationKind = 'org_added' | 'session_started';

interface DispatchOrgAddedArgs {
  recipientProfileId: string;
  orgId: string;
  orgName: string;
  actorProfileId: string | null;
  actorDisplay: string;
}

/**
 * Insert a single `org_added` notification row for the recipient. Idempotent
 * at the call-site: callers gate this on a successful org_memberships insert
 * (the membership upsert is the actual "added" event; this is the user-
 * facing side-effect).
 */
export async function dispatchOrgAddedNotification(args: DispatchOrgAddedArgs): Promise<void> {
  const svc = getServiceSupabaseClient();
  const { error } = await svc.from('notifications').insert({
    recipient_profile_id: args.recipientProfileId,
    kind: 'org_added',
    title: `${args.actorDisplay} added you to ${args.orgName}`,
    body: null,
    link_url: `/app/orgs/${args.orgId}`,
    actor_profile_id: args.actorProfileId,
    org_id: args.orgId,
  });
  if (error) {
    console.error('dispatchOrgAddedNotification failed', error);
  }
}

interface DispatchSessionStartedArgs {
  sessionId: string;
  orgId: string;
  facilitatorProfileId: string;
  facilitatorDisplay: string;
}

/**
 * Insert one `session_started` notification per org member (excluding the
 * facilitator). Called from startStageAction the first time a draft/scheduled
 * session flips to live. A single batched insert keeps it to one network
 * round-trip even on large orgs.
 */
export async function dispatchSessionStartedNotifications(
  args: DispatchSessionStartedArgs,
): Promise<void> {
  const svc = getServiceSupabaseClient();

  const membersRes = await svc
    .from('org_memberships')
    .select('profile_id')
    .eq('org_id', args.orgId);
  if (membersRes.error) {
    console.error('dispatchSessionStartedNotifications members fetch failed', membersRes.error);
    return;
  }

  const recipients = (membersRes.data ?? [])
    .map((r) => r.profile_id as string)
    .filter((id) => id !== args.facilitatorProfileId);

  if (recipients.length === 0) return;

  const rows = recipients.map((profileId) => ({
    recipient_profile_id: profileId,
    kind: 'session_started' as const,
    title: `${args.facilitatorDisplay} started a session`,
    body: 'Join in — the first stage is now active.',
    link_url: `/app/sessions/${args.sessionId}`,
    actor_profile_id: args.facilitatorProfileId,
    org_id: args.orgId,
    session_id: args.sessionId,
  }));

  const { error } = await svc.from('notifications').insert(rows);
  if (error) {
    console.error('dispatchSessionStartedNotifications insert failed', error);
  }
}
