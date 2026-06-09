-- White-label brand presets, owned by the facilitator (profiles row). Each preset
-- is a reusable set of branding applied to a generated PDF report. Logo + custom
-- font files live in the private `brand-assets` Storage bucket (next migration);
-- only the storage *path* is stored here. Clients do full CRUD on their OWN rows
-- via RLS; the report renderer reads rows + asset bytes via service role.

create table if not exists public.brand_profiles (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 80),
  display_name    text not null check (char_length(display_name) between 1 and 80),
  footer_contact  text check (footer_contact is null or char_length(footer_contact) <= 160),
  brand_colour    text not null check (brand_colour ~ '^#[0-9a-fA-F]{6}$'),
  accent_colour   text not null check (accent_colour ~ '^#[0-9a-fA-F]{6}$'),
  logo_path       text,
  -- heading_font / body_font: {kind, key|path} JSON shape enforced application-side.
  heading_font    jsonb not null,
  body_font       jsonb not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists brand_profiles_owner_idx
  on public.brand_profiles (owner_id, created_at desc);

alter table public.brand_profiles enable row level security;

drop policy if exists "Brand profiles: owner read"   on public.brand_profiles;
drop policy if exists "Brand profiles: owner insert" on public.brand_profiles;
drop policy if exists "Brand profiles: owner update" on public.brand_profiles;
drop policy if exists "Brand profiles: owner delete" on public.brand_profiles;

create policy "Brand profiles: owner read"
  on public.brand_profiles for select to authenticated
  using (owner_id = auth.uid());

create policy "Brand profiles: owner insert"
  on public.brand_profiles for insert to authenticated
  with check (owner_id = auth.uid());

create policy "Brand profiles: owner update"
  on public.brand_profiles for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Brand profiles: owner delete"
  on public.brand_profiles for delete to authenticated
  using (owner_id = auth.uid());

grant select, insert, update, delete on public.brand_profiles to authenticated;
grant select, insert, update, delete on public.brand_profiles to service_role;

-- Maintain updated_at via the shared trigger function defined in the init migration.
drop trigger if exists brand_profiles_touch_updated_at on public.brand_profiles;
create trigger brand_profiles_touch_updated_at
  before update on public.brand_profiles
  for each row execute function public.touch_updated_at();

-- Remember the last preset used on a session so re-generation is one click.
-- SET NULL on delete so deleting a preset never orphans/breaks a session.
alter table public.sessions
  add column if not exists brand_profile_id uuid
  references public.brand_profiles(id) on delete set null;
