-- can_edit_rooms: array-arg batch variant of can_edit_room
-- ----------------------------------------------------------------------------
-- Tech-debt Tier 2 ("hot-path N+1"): the session detail page computed
-- myRoomIdByStageId by calling can_edit_room once per room model —
-- ~20 serialized round-trips per page render at workshop scale.
--
-- can_edit_rooms(p_profile_id, p_model_ids) answers the same question for a
-- whole batch in one call: it returns the subset of p_model_ids whose room
-- the profile can edit. Semantics per model id are identical to
-- can_edit_room (which stays untouched for the worker + RLS policies):
--   * the facilitator of the model's session can edit every room in it;
--   * everyone else needs transitive room membership via the recursive
--     stage_room_sources walk.
-- Unknown ids, deleted models and non-room models simply don't come back.
create or replace function public.can_edit_rooms(
  p_profile_id uuid,
  p_model_ids uuid[]
)
returns setof uuid
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with recursive
    targets as (
      select m.id as model_id, m.room_id, m.session_id
      from public.models m
      where m.id = any (p_model_ids)
        and m.room_id is not null
    ),
    ancestors as (
      select t.model_id, t.room_id as id
      from targets t
      union
      select a.model_id, s.source_room_id
      from ancestors a
      join public.stage_room_sources s on s.room_id = a.id
    )
  select t.model_id
  from targets t
  where exists (
      select 1
      from public.sessions s
      where s.id = t.session_id
        and s.facilitator_id = p_profile_id
    )
    or exists (
      select 1
      from ancestors a
      join public.stage_room_members mem on mem.room_id = a.id
      where a.model_id = t.model_id
        and mem.profile_id = p_profile_id
    );
$$;

-- Same ACL as can_edit_room: server-side callers plus authenticated (so RLS
-- policies or authed RPCs could consult it), never anon.
revoke execute on function public.can_edit_rooms(uuid, uuid[]) from public, anon;
grant  execute on function public.can_edit_rooms(uuid, uuid[]) to service_role, authenticated;

comment on function public.can_edit_rooms(uuid, uuid[]) is
  'Batch variant of can_edit_room: returns the subset of p_model_ids whose room p_profile_id can edit (facilitator of the session, or transitive room member).';
