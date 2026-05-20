-- supabase/migrations/20260519140000_scenarios.sql
-- Phase-1 scenario library (PRD §9.2). Seeded read-only canonical exercises;
-- `is_template = true ⇒ org_id IS NULL`. Future phases will add INSERT
-- policies for org-scoped custom authoring (PRD §5.3 Phase 2).
-- Idempotent — re-running via `pnpm db:reset` is a no-op past the first apply.

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  stage_type public.stage_type not null,
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  duration_minutes integer not null,
  is_template boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.scenarios
  drop constraint if exists scenarios_title_len_chk;
alter table public.scenarios
  add constraint scenarios_title_len_chk check (char_length(title) between 1 and 120);

alter table public.scenarios
  drop constraint if exists scenarios_body_len_chk;
alter table public.scenarios
  add constraint scenarios_body_len_chk check (char_length(body) between 1 and 4000);

alter table public.scenarios
  drop constraint if exists scenarios_duration_range_chk;
alter table public.scenarios
  add constraint scenarios_duration_range_chk check (duration_minutes between 1 and 240);

-- Templates are global: is_template ⇒ org_id IS NULL.
alter table public.scenarios
  drop constraint if exists scenarios_template_global_chk;
alter table public.scenarios
  add constraint scenarios_template_global_chk
    check (is_template = false or org_id is null);

create index if not exists scenarios_stage_type_idx on public.scenarios (stage_type);
create index if not exists scenarios_org_id_idx on public.scenarios (org_id) where org_id is not null;
create index if not exists scenarios_is_template_idx on public.scenarios (is_template) where is_template = true;

alter table public.scenarios enable row level security;

drop policy if exists "Scenarios: read templates and own-org rows" on public.scenarios;
create policy "Scenarios: read templates and own-org rows"
  on public.scenarios for select to authenticated
  using (
    is_template = true
    or (org_id is not null and public.is_org_member(org_id))
  );

-- No INSERT/UPDATE/DELETE policies in Phase 1 — table is effectively
-- read-only client-side. Seeds land via service_role migration (T6).
