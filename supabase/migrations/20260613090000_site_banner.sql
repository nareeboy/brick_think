-- supabase/migrations/20260613090000_site_banner.sql
-- Site-wide banner: one admin-managed notice shown at the top of every page.
--
--   public.site_banner — a SINGLE-ROW config table (id is a boolean PK fixed
--     to true via a CHECK, so exactly one row can ever exist). Admins UPDATE
--     this row from /app/admin/banner. anon + authenticated may read it only
--     while is_active = true (it drives the public banner); site admins read
--     it always (the admin editor). updated_at is bumped on every save and is
--     reused client-side as the per-visitor dismissal version.
--
-- Idempotent — every statement can re-run safely.

create table if not exists public.site_banner (
  id boolean primary key default true check (id),
  is_active boolean not null default false,
  type text not null default 'info'
    check (type in ('info', 'warning', 'error', 'success', 'promo')),
  message text not null default '' check (length(message) <= 280),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

-- Bump updated_at on every update so the dismissal version always changes when
-- an admin saves (re-showing the banner to anyone who dismissed the prior one).
create or replace function public.site_banner_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_banner_updated_at on public.site_banner;
create trigger site_banner_updated_at
  before update on public.site_banner
  for each row execute function public.site_banner_set_updated_at();

-- Seed the one and only row (inactive). Admins only ever UPDATE it.
insert into public.site_banner (id) values (true) on conflict (id) do nothing;

-- RLS ----------------------------------------------------------------------
alter table public.site_banner enable row level security;

-- anon + authenticated read the row only while active; admins read always.
drop policy if exists "site_banner: read active" on public.site_banner;
create policy "site_banner: read active"
  on public.site_banner for select
  to anon, authenticated
  using (is_active or public.is_site_admin());

-- site admins: update only (the singleton already exists; no insert/delete).
drop policy if exists "site_banner: admin update" on public.site_banner;
create policy "site_banner: admin update"
  on public.site_banner for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- Rollback (reference only):
--   drop table public.site_banner;
--   drop function public.site_banner_set_updated_at();
