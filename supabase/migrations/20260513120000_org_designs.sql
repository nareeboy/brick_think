-- supabase/migrations/20260513120000_org_designs.sql
-- Org-wide designs (stream 1 of the persistent-designs roadmap).
-- Adds active-org context to profiles, org visibility to models,
-- widens the active-SELECT policy on models to include org-shared rows,
-- and installs a trigger that reverts shared designs to personal when
-- their owner leaves the org.
-- Companion spec: docs/superpowers/specs/2026-05-13-org-wide-designs-design.md

-- 1. Active-org context on profile (null = Personal).
alter table public.profiles
  add column active_org_id uuid
    references public.organisations(id) on delete set null;

-- 2. Org visibility on models (null = personal).
alter table public.models
  add column org_id uuid
    references public.organisations(id) on delete set null;

create index models_org_idx
  on public.models(org_id, updated_at desc)
  where org_id is not null;

-- 3. Widen the active-SELECT policy installed by the soft-delete migration
--    so org members can read shared rows. UPDATE / INSERT / DELETE stay
--    owner-only — those policies are not touched here.
drop policy "Models: owner can read active" on public.models;

create policy "Models: owner or shared org member can read active"
  on public.models for select to authenticated
  using (
    deleted_at is null
    and (
      owner_profile_id = auth.uid()
      or (org_id is not null and public.is_org_member(org_id))
    )
  );

-- 4. Trigger on org_memberships deletion. A single source of truth for
--    "I left" and "admin removed me": both paths emit a DELETE row, and
--    we (a) revert any models the leaving user shared to this org back
--    to personal, and (b) drop their active_org_id back to Personal if
--    it pointed at the org they just left.
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

  update public.profiles
     set active_org_id = null
   where id = old.profile_id
     and active_org_id = old.org_id;

  return old;
end;
$$;

create trigger on_org_membership_removed
after delete on public.org_memberships
for each row execute function public.handle_org_membership_removed();

-- Rollback (commented; for reference only):
--   drop trigger if exists on_org_membership_removed on public.org_memberships;
--   drop function if exists public.handle_org_membership_removed();
--   drop policy "Models: owner or shared org member can read active" on public.models;
--   create policy "Models: owner can read active"
--     on public.models for select to authenticated
--     using (owner_profile_id = auth.uid() and deleted_at is null);
--   drop index if exists models_org_idx;
--   alter table public.models drop column if exists org_id;
--   alter table public.profiles drop column if exists active_org_id;
