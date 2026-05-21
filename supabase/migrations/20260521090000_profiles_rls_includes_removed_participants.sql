-- 20260521090000_profiles_rls_includes_removed_participants.sql
--
-- Drop the `sp.removed_at IS NULL` clauses from can_see_profile_via_session.
--
-- Symptom: the facilitator's RosterRemovedList fetches the kicked-participant
-- row from `session_participants`, then does a follow-up `profiles` select
-- to hydrate the name + email. That second select returns zero rows because
-- the helper required the participant to be active — so the row dropped out
-- of the UI (`.filter(row => row.email)`) and the Removed section showed 0
-- even though the kick row was present.
--
-- The facilitator needs to see kicked participants' profile data to operate
-- the Restore UI; an active participant looking at historical artefacts
-- (comments, reactions) from a since-kicked author should also see their
-- name, not "Removed user". Dropping the active filter on all three
-- branches keeps the helper symmetric and unblocks both surfaces.

create or replace function public.can_see_profile_via_session(p_profile_id uuid)
returns boolean
language plpgsql
stable security definer
set search_path = public, pg_temp
as $$
begin
  -- Caller and target are both in the same session, regardless of active /
  -- removed state. A kicked participant has no UI access (sticky kick) so
  -- the "kicked viewer" half of this branch is unreachable in practice;
  -- the "active viewer reading a kicked author's artefact" half is the
  -- target case.
  if exists (
    select 1
    from public.session_participants sp_caller
    join public.session_participants sp_target
      on sp_target.session_id = sp_caller.session_id
    where sp_caller.profile_id = auth.uid()
      and sp_target.profile_id = p_profile_id
  ) then
    return true;
  end if;

  -- Caller is the facilitator of a session this profile is in (active OR
  -- removed). Unblocks the RosterRemovedList + Restore UI.
  if exists (
    select 1
    from public.session_participants sp
    join public.sessions s on s.id = sp.session_id
    where s.facilitator_id = auth.uid()
      and sp.profile_id = p_profile_id
  ) then
    return true;
  end if;

  -- Caller is a participant of a session whose facilitator is the target.
  -- SpotlightBanner / any participant-side affordance needs the facilitator
  -- name. A kicked caller has no UI access (sticky kick), so we don't need
  -- to gate this branch on the caller's active status either.
  if exists (
    select 1
    from public.session_participants sp
    join public.sessions s on s.id = sp.session_id
    where sp.profile_id = auth.uid()
      and s.facilitator_id = p_profile_id
  ) then
    return true;
  end if;

  return false;
end;
$$;

revoke execute on function public.can_see_profile_via_session(uuid) from public, anon, authenticated;
grant execute on function public.can_see_profile_via_session(uuid) to authenticated;
