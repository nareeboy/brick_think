export type NotificationKind =
  | 'org_added'
  | 'session_started'
  | 'participant_joined'
  | 'session_invitation_claimed';

export interface NotificationRow {
  id: string;
  recipient_profile_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link_url: string | null;
  actor_profile_id: string | null;
  org_id: string | null;
  session_id: string | null;
  read_at: string | null;
  created_at: string;
}
