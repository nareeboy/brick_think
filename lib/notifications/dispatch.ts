import 'server-only';

import { getServiceSupabaseClient } from '@/lib/db/service';
import { resolveActorDisplay } from './actorDisplay';

export { resolveActorDisplay };

export type NotificationKind =
  | 'org_added'
  | 'session_started'
  | 'participant_joined'
  | 'session_invitation_claimed'
  | 'session_ended';

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
    link_url: `/app/workshops/${args.orgId}`,
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

interface DispatchSessionEndedArgs {
  sessionId: string;
  orgId: string;
  facilitatorProfileId: string;
  facilitatorDisplay: string;
}

/**
 * Insert one `session_ended` notification per org member (excluding the
 * facilitator) when the facilitator stops a session. Mirrors
 * dispatchSessionStartedNotifications — a single batched insert keeps it to one
 * round-trip. Called from endSessionAction, which is idempotent on
 * already-completed sessions, so this fires at most once per session end.
 */
export async function dispatchSessionEndedNotifications(
  args: DispatchSessionEndedArgs,
): Promise<void> {
  const svc = getServiceSupabaseClient();

  const membersRes = await svc
    .from('org_memberships')
    .select('profile_id')
    .eq('org_id', args.orgId);
  if (membersRes.error) {
    console.error('dispatchSessionEndedNotifications members fetch failed', membersRes.error);
    return;
  }

  const recipients = (membersRes.data ?? [])
    .map((r) => r.profile_id as string)
    .filter((id) => id !== args.facilitatorProfileId);

  if (recipients.length === 0) return;

  const rows = recipients.map((profileId) => ({
    recipient_profile_id: profileId,
    kind: 'session_ended' as const,
    title: `${args.facilitatorDisplay} ended the session`,
    body: 'This session is now complete.',
    link_url: `/app/sessions/${args.sessionId}`,
    actor_profile_id: args.facilitatorProfileId,
    org_id: args.orgId,
    session_id: args.sessionId,
  }));

  const { error } = await svc.from('notifications').insert(rows);
  if (error) {
    console.error('dispatchSessionEndedNotifications insert failed', error);
  }
}

interface DispatchParticipantJoinedArgs {
  sessionId: string;
  sessionTitle: string;
  facilitatorId: string;
  joinerProfileId: string;
  joinerFullName: string | null;
  joinerEmail: string | null;
}

/**
 * Insert a single `participant_joined` notification for the facilitator when
 * a participant successfully joins their session via join code. Idempotent at
 * the call-site: callers gate this on a successful session_participants
 * insert (the insert is the actual "joined" event; this is the notification
 * side-effect).
 *
 * Uses resolveActorDisplay internally with 'A new participant' as the
 * fallback for participants with no usable display name.
 */
export async function dispatchParticipantJoinedNotification(
  args: DispatchParticipantJoinedArgs,
): Promise<void> {
  const joinerDisplay = resolveActorDisplay({
    fullName: args.joinerFullName,
    email: args.joinerEmail,
    fallback: 'A new participant',
  });

  const svc = getServiceSupabaseClient();
  const { error } = await svc.from('notifications').insert({
    recipient_profile_id: args.facilitatorId,
    kind: 'participant_joined',
    title: `${joinerDisplay} joined ${args.sessionTitle}`,
    link_url: `/app/sessions/${args.sessionId}`,
    actor_profile_id: args.joinerProfileId,
    session_id: args.sessionId,
  });
  if (error) {
    console.error('dispatchParticipantJoinedNotification failed', error);
  }
}
