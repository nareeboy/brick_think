-- supabase/migrations/20260804120000_scenarios_personal.sql
-- Personal scenarios: authoring no longer requires a workshop. A custom
-- scenario may have org_id NULL (private to its creator) or an org_id the
-- creator belongs to (shared with the workshop). Templates stay immutable.
--
-- SELECT also gains two branches:
--   * created_by = auth.uid()  — creators always see their own rows;
--   * picked-into-a-visible-session — when a facilitator picks a scenario
--     for a stage, everyone who can see that stage (org members and session
--     participants, via the RLS on public.stages) can read the prompt. The
--     subquery runs under the caller's RLS on stages, so visibility of the
--     stage IS the authorisation.
-- Idempotent.

create index if not exists stages_scenario_id_idx
  on public.stages (scenario_id) where scenario_id is not null;

drop policy if exists "Scenarios: read templates and own-org rows" on public.scenarios;
drop policy if exists "Scenarios: read templates, own, org, and session-picked rows"
  on public.scenarios;
create policy "Scenarios: read templates, own, org, and session-picked rows"
  on public.scenarios for select to authenticated
  using (
    is_template = true
    or created_by = auth.uid()
    or (org_id is not null and public.is_org_member(org_id))
    or id in (select scenario_id from public.stages where scenario_id is not null)
  );

drop policy if exists "Scenarios: members insert org rows" on public.scenarios;
drop policy if exists "Scenarios: users insert own rows" on public.scenarios;
create policy "Scenarios: users insert own rows"
  on public.scenarios for insert to authenticated
  with check (
    is_template = false
    and created_by = auth.uid()
    and (org_id is null or public.is_org_member(org_id))
  );

drop policy if exists "Scenarios: creator updates own rows" on public.scenarios;
create policy "Scenarios: creator updates own rows"
  on public.scenarios for update to authenticated
  using (created_by = auth.uid() and is_template = false)
  with check (
    is_template = false
    and created_by = auth.uid()
    and (org_id is null or public.is_org_member(org_id))
  );

-- DELETE policy from 20260804090000 is unchanged: creator-only, never a
-- template. Re-stated here for nothing — deliberately not touched.
