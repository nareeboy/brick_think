-- supabase/migrations/20260621090000_notification_kind_session_ended.sql
--
-- Adds 'session_ended' to the notifications.kind CHECK so endSessionAction can
-- notify org members when a facilitator stops a session (mirrors the
-- 'session_started' fan-out). Idempotent: drops + re-adds the constraint with
-- the full kind list, so a re-apply against an already-migrated DB is a no-op.

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (
    kind in (
      'org_added',
      'session_started',
      'participant_joined',
      'session_invitation_claimed',
      'session_ended'
    )
  );
