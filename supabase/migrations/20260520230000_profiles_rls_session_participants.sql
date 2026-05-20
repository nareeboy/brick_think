-- 20260520230000_profiles_rls_session_participants.sql
--
-- After Spec A, participants who join a session via code are NOT org
-- members. The pre-existing "Profiles: read fellow org members" SELECT
-- policy only resolves rows for callers who share an org_memberships row
-- with the target profile — so the facilitator's roster modal couldn't
-- render their full_name / email / avatar_url, and other participants
-- couldn't render each other's display names (used by SpotlightBanner
-- and RosterList).
--
-- This migration extends the SELECT policy with two OR-branches so the
-- two visibility scenarios required by the join flow work without
-- granting blanket cross-tenant reads:
--
--   1. Caller can see a profile if they share at least one active
--      session_participants membership with the target.
--   2. Caller can see a profile if they are the facilitator of a session
--      this user is in (covers the roster modal — facilitator sees every
--      active participant of their session).
--
-- Implementation is idempotent: drop the policy if it exists, recreate it
-- with the wider USING clause. The "Profiles: read own" and
-- "Profiles: update own" policies are untouched.
--
-- The two new branches are wrapped in a SECURITY DEFINER plpgsql helper
-- (public.can_see_profile_via_session) because session_participants
-- itself carries an RLS policy that only lets a user see their OWN
-- (session_id, profile_id) row. A naive subquery in the policy body
-- would inherit the caller's RLS context — sp_target would always be
-- empty — and the new branches would silently never match. The helper
-- runs as the policy owner (postgres) and is search_path-locked.
--
-- Same pattern as is_org_member / is_session_participant elsewhere in
-- the schema — LANGUAGE plpgsql (not sql) so Postgres doesn't inline
-- it into the surrounding query and defeat SECURITY DEFINER. See
-- 20260514000000_org_helpers_plpgsql.sql for the precedent and the
-- inliner gotcha explanation.

create or replace function public.can_see_profile_via_session(p_profile_id uuid)
returns boolean
language plpgsql
stable security definer
set search_path = public, pg_temp
as $$
begin
  -- Caller and target share at least one active session participation.
  -- Covers two-participants-in-same-session reads (SpotlightBanner
  -- resolving the spotlight target's display name, etc.).
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
  -- the RosterList facilitator surface — the facilitator can see every
  -- active participant of their session even when they don't share an
  -- org with that participant).
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

  return false;
end;
$$;

-- auth.uid()-based helper — safe to expose to authenticated. service_role
-- and postgres get it by default.
grant execute on function public.can_see_profile_via_session(uuid) to authenticated;

drop policy if exists "Profiles: read fellow org members" on public.profiles;
create policy "Profiles: read fellow org members"
on public.profiles for select to authenticated
using (
  exists (
    -- Existing branch: shared org membership.
    select 1
    from public.org_memberships m1
    join public.org_memberships m2 on m1.org_id = m2.org_id
    where m1.profile_id = auth.uid()
      and m2.profile_id = profiles.id
  )
  or public.can_see_profile_via_session(profiles.id)
);
