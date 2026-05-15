-- supabase/migrations/20260515000000_nav_restructure.sql
-- Nav-restructure cleanup: drop active_org_id from profiles and migrate any
-- existing org-standalone designs into a per-org "General" session attached
-- to the canonical first stage.
-- Companion spec: docs/superpowers/specs/2026-05-15-nav-restructure-org-first-design.md

-- 1. Reattach org-standalone designs.
--    The models_context_exclusive CHECK in 20260514120000_session_designs.sql
--    forbids (session_id IS NOT NULL AND org_id IS NOT NULL), so we clear
--    org_id when promoting a model into a session. Stage_id is set to the
--    new session's canonical first stage (skill_building, position 0) —
--    matches the eager stage creation in app/(authed)/app/sessions/actions.ts
--    and the CANONICAL_STAGE_TYPES list in lib/sessions/types.ts.
with affected_orgs as (
  select distinct m.org_id, o.owner_id
    from public.models m
    join public.organisations o on o.id = m.org_id
   where m.org_id is not null
     and m.session_id is null
     and m.deleted_at is null
), inserted_sessions as (
  insert into public.sessions (org_id, facilitator_id, title, status)
  select org_id, owner_id, 'General', 'draft' from affected_orgs
  returning id, org_id
), inserted_stages as (
  insert into public.stages (session_id, stage_type, position)
  select s.id, st.stage_type, st.position
    from inserted_sessions s
    cross join (values
      ('skill_building'::stage_type, 0),
      ('individual_model'::stage_type, 1),
      ('shared_model'::stage_type, 2),
      ('system_model'::stage_type, 3),
      ('guiding_principles'::stage_type, 4)
    ) as st(stage_type, position)
  returning id, session_id, position
)
update public.models m
   set session_id = i.id,
       stage_id  = st.id,
       org_id    = null
  from inserted_sessions i
  join inserted_stages   st on st.session_id = i.id and st.position = 0
 where m.org_id = i.org_id
   and m.session_id is null
   and m.deleted_at is null;

-- 2. Rewrite the on-membership-removed trigger function to stop writing
--    profiles.active_org_id. Functions are not validated at column-drop time
--    in PG (lazy plpgsql parsing), but the trigger fires on any cleanup of
--    org_memberships rows (including the integration test teardown path via
--    organisations.id -> org_memberships.org_id ON DELETE CASCADE), so leaving
--    the old body in place would break every subsequent test run after this
--    migration. Drop the active_org_id write; keep the model-revert behaviour.
create or replace function public.handle_org_membership_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.models
     set org_id = null
   where org_id = old.org_id
     and owner_profile_id = old.profile_id;

  return old;
end;
$$;

-- 3. Drop the dead column. IF EXISTS is required because a remote may have
--    already had this applied out-of-band (per the CLAUDE.md idempotency rule).
alter table public.profiles drop column if exists active_org_id;

-- Rollback (commented; for reference only):
--   alter table public.profiles
--     add column active_org_id uuid
--       references public.organisations(id) on delete set null;
--   create or replace function public.handle_org_membership_removed()
--   returns trigger language plpgsql security definer set search_path = public
--   as $$
--   begin
--     update public.models
--        set org_id = null
--      where org_id = old.org_id
--        and owner_profile_id = old.profile_id;
--     update public.profiles
--        set active_org_id = null
--      where id = old.profile_id
--        and active_org_id = old.org_id;
--     return old;
--   end;
--   $$;
--   -- Reattaching is non-reversible — the original org-standalone state is lost
--   -- once designs are moved into sessions. Re-run the soft-delete trash for
--   -- the synthetic "General" sessions if a rollback is genuinely needed.
