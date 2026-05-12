-- supabase/migrations/20260511000000_models.sql
-- Personal brick-builder designs. Owner-only RLS for v1.
-- Org-wide visibility and session-scoped designs land in follow-up specs.

create table public.models (
  id                uuid primary key default gen_random_uuid(),
  owner_profile_id  uuid not null references public.profiles(id) on delete cascade,
  title             text not null default 'Untitled model'
                      check (length(title) between 1 and 200),
  canvas_state      jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index models_owner_idx on public.models(owner_profile_id, updated_at desc);

create trigger models_touch_updated_at
before update on public.models
for each row execute function public.touch_updated_at();

create table public.model_versions (
  id            uuid primary key default gen_random_uuid(),
  model_id      uuid not null references public.models(id) on delete cascade,
  label         text,
  canvas_state  jsonb not null,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now()
);

create index model_versions_model_idx on public.model_versions(model_id, created_at desc);

alter table public.models enable row level security;
alter table public.model_versions enable row level security;

create policy "Models: owner can read"
  on public.models for select to authenticated
  using (owner_profile_id = auth.uid());

create policy "Models: owner can insert"
  on public.models for insert to authenticated
  with check (owner_profile_id = auth.uid());

create policy "Models: owner can update"
  on public.models for update to authenticated
  using (owner_profile_id = auth.uid())
  with check (owner_profile_id = auth.uid());

create policy "Models: owner can delete"
  on public.models for delete to authenticated
  using (owner_profile_id = auth.uid());

create policy "Versions: owner of model can read"
  on public.model_versions for select to authenticated
  using (exists (
    select 1 from public.models m
    where m.id = model_versions.model_id
      and m.owner_profile_id = auth.uid()
  ));

create policy "Versions: owner of model can insert"
  on public.model_versions for insert to authenticated
  with check (
    exists (
      select 1 from public.models m
      where m.id = model_versions.model_id
        and m.owner_profile_id = auth.uid()
    )
    and created_by = auth.uid()
  );
