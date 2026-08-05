-- supabase/migrations/20260804090000_scenarios_authoring.sql
-- Custom scenario authoring (PRD §5.3 Phase 2). Org-scoped rows authored by
-- any org member; creator-only edit/delete. Templates stay immutable — no
-- write policy matches is_template = true. Idempotent.

alter table public.scenarios
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists scenarios_created_by_idx
  on public.scenarios (created_by) where created_by is not null;

drop policy if exists "Scenarios: members insert org rows" on public.scenarios;
create policy "Scenarios: members insert org rows"
  on public.scenarios for insert to authenticated
  with check (
    is_template = false
    and org_id is not null
    and public.is_org_member(org_id)
    and created_by = auth.uid()
  );

drop policy if exists "Scenarios: creator updates own rows" on public.scenarios;
create policy "Scenarios: creator updates own rows"
  on public.scenarios for update to authenticated
  using (created_by = auth.uid() and is_template = false)
  with check (
    is_template = false
    and org_id is not null
    and public.is_org_member(org_id)
    and created_by = auth.uid()
  );

drop policy if exists "Scenarios: creator deletes own rows" on public.scenarios;
create policy "Scenarios: creator deletes own rows"
  on public.scenarios for delete to authenticated
  using (created_by = auth.uid() and is_template = false);
