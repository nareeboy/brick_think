-- 20260520230000_can_edit_room_grant_authenticated.sql
--
-- `public.can_edit_room` was originally granted to service_role only because
-- its sole callers were the Yjs worker (auth.ts) and the design [id] page
-- (server-side RPC). Spec C added per-brick reactions and comments whose
-- RLS policies invoke `can_edit_room(auth.uid(), model_id)` directly from
-- the authenticated user's session — those calls fail with EXECUTE-denied
-- and every reaction / comment write 403s.
--
-- The function is `security definer` with `set search_path = public, pg_temp`
-- and is read-only — safe to expose to authenticated. Service-role-only
-- entry is retained semantically by the policies that wrap it (writes still
-- require auth.uid() = profile_id in addition to the membership walk).

grant execute on function public.can_edit_room(uuid, uuid) to authenticated;
