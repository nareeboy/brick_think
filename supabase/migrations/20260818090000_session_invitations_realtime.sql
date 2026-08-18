-- Realtime for session_invitations — RosterPendingInvitesList subscribes to
-- postgres_changes on this table (filter `session_id=eq.…`) to refresh the
-- pending-invites list after cancel/claim, but the table was never added to
-- the supabase_realtime publication (unlike session_participants in
-- 20260520200000_session_join_and_roster.sql), so no event ever reached the
-- client: a successful cancel left the row on screen and the next click
-- surfaced `invitation_not_found`.
--
-- REPLICA IDENTITY FULL is required as well: DELETE payloads otherwise carry
-- only the primary key, so the `session_id` filter can never match and
-- Realtime drops the event.

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'session_invitations'
  ) then
    execute 'alter publication supabase_realtime add table public.session_invitations';
  end if;
end $$;

alter table public.session_invitations replica identity full;
