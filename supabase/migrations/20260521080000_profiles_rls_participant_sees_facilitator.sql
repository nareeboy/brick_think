-- 20260521080000_profiles_rls_participant_sees_facilitator.sql
--
-- Extends can_see_profile_via_session with a third branch: a participant
-- can read the facilitator's profile of a session they're in.
--
-- Originally added in 20260520240000 with two branches (participants
-- seeing each other, facilitator seeing participants). The reverse
-- direction (participant → facilitator) was missing — which makes
-- SpotlightBanner silently bail for non-target viewers (it can't fetch
-- the facilitator's name to render `<Name> is showing <Name>'s canvas`).
--
-- All three branches end up symmetric: any party of an active session
-- (facilitator or participant) can read any other party's profile.

create or replace function public.can_see_profile_via_session(p_profile_id uuid)
returns boolean
language plpgsql
stable security definer
set search_path = public, pg_temp
as $$
begin
  -- Caller and target share at least one active session participation.
  -- Covers two-participants-in-same-session reads.
  if exists (
    select 1
    from public.session_participants sp_caller
    join public.session_participants sp_target
      on sp_target.session_id = sp_caller.session_id
    where sp_caller.profile_id = auth.uid()
      and sp_caller.removed_at is null
      and sp_target.profile_id = p_profile_id
      and sp_target.removed_at is null
  ) then
    return true;
  end if;

  -- Caller is the facilitator of a session this profile is in (covers
  -- the RosterList facilitator surface).
  if exists (
    select 1
    from public.session_participants sp
    join public.sessions s on s.id = sp.session_id
    where s.facilitator_id = auth.uid()
      and sp.profile_id = p_profile_id
      and sp.removed_at is null
  ) then
    return true;
  end if;

  -- Caller is a participant of a session whose facilitator is the target.
  -- Covers SpotlightBanner / any participant-side affordance that needs
  -- to render the facilitator's display name (e.g. "{Facilitator} is
  -- showing X's canvas"). Without this, the banner silently hides for
  -- non-org participants because their profile lookup of the facilitator
  -- returns zero rows.
  if exists (
    select 1
    from public.session_participants sp
    join public.sessions s on s.id = sp.session_id
    where sp.profile_id = auth.uid()
      and sp.removed_at is null
      and s.facilitator_id = p_profile_id
  ) then
    return true;
  end if;

  return false;
end;
$$;

revoke execute on function public.can_see_profile_via_session(uuid) from public, anon, authenticated;
grant execute on function public.can_see_profile_via_session(uuid) to authenticated;
