-- can_edit_room: grant the session facilitator edit access to every room
-- ----------------------------------------------------------------------------
-- Bug: a session facilitator who is not a direct (or transitive) member of a
-- room could not live-collaborate on that room's canvas. The facilitator owns
-- each room's `models` row but ownership does not gate edit access — membership
-- does, via can_edit_room()'s recursive walk over stage_room_members /
-- stage_room_sources. Facilitators are typically NOT enrolled as room members
-- (they partition *other* people into rooms), so can_edit_room returned false
-- for them. That flag is the single gate both the design page (liveMode via
-- lib/yjs/canPlaceLive.ts) and the Yjs worker (WS upgrade in worker/src/auth.ts)
-- consult, so the facilitator dropped to read-only and the worker rejected
-- their WS upgrade with 403 "not a room member" — no live updates in any room.
--
-- Fix: the facilitator of the session that owns the model can edit any room in
-- that session, regardless of room membership. This keeps the recursive
-- transitive-membership path intact for everyone else and adds the facilitator
-- as an additional OR branch. The model's session is resolved off
-- models.session_id; the branch only fires for room-backed models (room_id
-- is not null), matching the existing behaviour for non-room canvases.
create or replace function public.can_edit_room(
  p_profile_id uuid,
  p_model_id uuid
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with recursive
    target as (
      select m.room_id, m.session_id
      from public.models m
      where m.id = p_model_id
        and m.room_id is not null
    ),
    ancestors as (
      select room_id as id from target
      union
      select s.source_room_id
      from ancestors a
      join public.stage_room_sources s on s.room_id = a.id
    )
  select
    -- The session facilitator orchestrates all rooms in their session and can
    -- live-edit every one, even when not enrolled as a room member.
    exists (
      select 1
      from target t
      join public.sessions s on s.id = t.session_id
      where s.facilitator_id = p_profile_id
    )
    -- Everyone else: recursive transitive room membership.
    or exists (
      select 1
      from ancestors a
      join public.stage_room_members mem on mem.room_id = a.id
      where mem.profile_id = p_profile_id
    );
$$;

-- Preserve the cumulative ACL: service_role (worker / server actions) plus
-- authenticated. `authenticated` was granted execute in
-- 20260520230000_can_edit_room_grant_authenticated.sql so the brick_reactions
-- / brick_comments RLS policies can invoke can_edit_room(auth.uid(), …)
-- directly under the caller's role. `create or replace function` keeps prior
-- grants, but we re-assert them here so this migration is self-describing and
-- does NOT silently revoke the authenticated grant.
revoke execute on function public.can_edit_room(uuid, uuid) from public, anon;
grant  execute on function public.can_edit_room(uuid, uuid) to service_role, authenticated;

comment on function public.can_edit_room(uuid, uuid) is
  'Worker- and server-callable. True iff profile is the session facilitator for the model, or a transitive room member for the room linked to the model. service_role only.';
