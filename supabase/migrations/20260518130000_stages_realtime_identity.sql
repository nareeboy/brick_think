-- supabase/migrations/20260518130000_stages_realtime_identity.sql
-- Supabase Realtime postgres_changes requires REPLICA IDENTITY FULL on tables
-- that use RLS-based filter delivery. Without it, the WAL only includes the
-- primary key in the OLD record for UPDATEs, which prevents Realtime from
-- evaluating the row-level filter and potentially blocks event delivery.
-- See: https://supabase.com/docs/guides/realtime/postgres-changes#replication-full
-- Idempotent: ALTER TABLE ... REPLICA IDENTITY is always safe to re-run.

alter table public.stages replica identity full;
alter table public.sessions replica identity full;
