-- ============================================================
-- BrickThink Phase 0 schema
-- ============================================================
-- Owners: workspace data (organisations, profiles)
-- Billing: plans catalog, Stripe customer + subscription rows
-- Methodology: stage_type enum and Phase 0 sessions/stages tables
-- Every table has Row Level Security enabled with explicit
-- policies. Service-role writes (Stripe webhook, AI workers)
-- bypass RLS by design.

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ------------------------------------------------------------
-- Helper functions
-- ------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

-- The five canonical Serious Play etiquette stages from the PRD.
-- These are first-class values in the data model. Stage transitions
-- ship in Phase 1 but the type lands now so Phase 0 cannot drift.
create type public.stage_type as enum (
  'skill_building',
  'individual_model',
  'shared_model',
  'system_model',
  'guiding_principles'
);

create type public.org_role as enum (
  'owner',
  'admin',
  'facilitator',
  'member'
);

create type public.plan_tier as enum (
  'free',
  'pro',
  'team',
  'enterprise'
);

create type public.subscription_status as enum (
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused'
);

create type public.session_mode as enum (
  'sync',
  'async',
  'hybrid'
);

create type public.session_status as enum (
  'draft',
  'scheduled',
  'live',
  'completed',
  'archived'
);

-- ------------------------------------------------------------
-- profiles
-- Mirrors auth.users with public profile fields. Populated by a
-- trigger on auth.users insert so signing in via magic link or
-- OAuth always materialises a row here.
-- ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- plans (catalog)
-- Pricing values left null where the PRD has them as TBC. The
-- catalog is read-only from the application and managed by
-- migrations.
-- ------------------------------------------------------------

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  tier plan_tier not null unique,
  display_name text not null,
  monthly_price_pence integer,
  storage_gb integer not null,
  max_facilitators integer not null,
  max_participants_per_session integer not null,
  retention_days integer not null,
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.plans
  (tier, display_name, monthly_price_pence, storage_gb, max_facilitators, max_participants_per_session, retention_days, sort_order, features)
values
  ('free', 'Free', 0, 1, 1, 8, 30, 1,
    jsonb_build_object('mode', 'sync_only', 'watermark_exports', true, 'ai', false, 'sessions_per_month', 2)),
  ('pro', 'Pro', null, 25, 1, 25, 365, 2,
    jsonb_build_object('mode', 'sync_async', 'custom_prompts', true, 'ai', true, 'unlimited_sessions', true)),
  ('team', 'Team', null, 100, 5, 25, 1095, 3,
    jsonb_build_object('mode', 'sync_async', 'shared_prompt_library', true, 'co_facilitation', true, 'sso', true, 'branded_exports', true)),
  ('enterprise', 'Enterprise', null, 100, 5, 25, 1825, 4,
    jsonb_build_object('saml_sso', true, 'audit_log', true, 'dpa', true, 'on_prem_ai', true, 'custom_retention', true, 'sla', true));

-- ------------------------------------------------------------
-- organisations
-- ------------------------------------------------------------

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  slug citext not null unique
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$' and length(slug) between 2 and 40),
  plan_id uuid references public.plans(id),
  owner_id uuid not null references public.profiles(id),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organisations_owner_idx on public.organisations(owner_id);

create trigger organisations_touch_updated_at
before update on public.organisations
for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- org_memberships
-- ------------------------------------------------------------

create table public.org_memberships (
  org_id uuid not null references public.organisations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, profile_id)
);

create index org_memberships_profile_idx on public.org_memberships(profile_id);

-- Auto-create an owner membership when an organisation is created.
create or replace function public.handle_new_organisation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.org_memberships (org_id, profile_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (org_id, profile_id) do update set role = 'owner';
  return new;
end;
$$;

create trigger on_organisation_created
after insert on public.organisations
for each row execute function public.handle_new_organisation();

-- ------------------------------------------------------------
-- stripe_customers
-- One Stripe customer per organisation.
-- ------------------------------------------------------------

create table public.stripe_customers (
  org_id uuid primary key references public.organisations(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- stripe_subscriptions
-- Source of truth synced from Stripe webhook events. The
-- application reads plan_id here to gate features.
-- ------------------------------------------------------------

create table public.stripe_subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,
  plan_id uuid references public.plans(id),
  status subscription_status not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stripe_subscriptions_org_idx on public.stripe_subscriptions(org_id);

create trigger stripe_subscriptions_touch_updated_at
before update on public.stripe_subscriptions
for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- sessions
-- Skeleton table referenced by stages and Phase 1 features.
-- ------------------------------------------------------------

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  facilitator_id uuid not null references public.profiles(id),
  title text not null check (length(title) between 1 and 200),
  mode session_mode not null default 'sync',
  status session_status not null default 'draft',
  current_stage stage_type,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_org_idx on public.sessions(org_id);
create index sessions_facilitator_idx on public.sessions(facilitator_id);

create trigger sessions_touch_updated_at
before update on public.sessions
for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- stages
-- ------------------------------------------------------------

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  stage_type stage_type not null,
  position integer not null check (position >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, position)
);

create index stages_session_idx on public.stages(session_id);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS on every table.
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.organisations enable row level security;
alter table public.org_memberships enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.stripe_subscriptions enable row level security;
alter table public.sessions enable row level security;
alter table public.stages enable row level security;

-- Helper: is the calling user a member of the given org?
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_memberships
    where org_id = p_org_id
      and profile_id = auth.uid()
  );
$$;

-- Helper: is the calling user an admin or owner of the given org?
create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_memberships
    where org_id = p_org_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- ----- profiles -----
create policy "Profiles: read own"
on public.profiles for select to authenticated
using (id = auth.uid());

create policy "Profiles: read fellow org members"
on public.profiles for select to authenticated
using (
  exists (
    select 1
    from public.org_memberships m1
    join public.org_memberships m2 on m1.org_id = m2.org_id
    where m1.profile_id = auth.uid()
      and m2.profile_id = profiles.id
  )
);

create policy "Profiles: update own"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ----- plans (catalog read) -----
create policy "Plans: read for any authenticated user"
on public.plans for select to authenticated
using (true);

-- ----- organisations -----
create policy "Organisations: members can read"
on public.organisations for select to authenticated
using (public.is_org_member(id));

create policy "Organisations: any authenticated user can create their own"
on public.organisations for insert to authenticated
with check (owner_id = auth.uid());

create policy "Organisations: owner or admin can update"
on public.organisations for update to authenticated
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

create policy "Organisations: owner can delete"
on public.organisations for delete to authenticated
using (
  exists (
    select 1 from public.org_memberships
    where org_id = organisations.id
      and profile_id = auth.uid()
      and role = 'owner'
  )
);

-- ----- org_memberships -----
create policy "Memberships: members can read their org"
on public.org_memberships for select to authenticated
using (public.is_org_member(org_id));

create policy "Memberships: owner or admin can manage"
on public.org_memberships for all to authenticated
using (public.is_org_admin(org_id))
with check (public.is_org_admin(org_id));

create policy "Memberships: a user can leave their own membership"
on public.org_memberships for delete to authenticated
using (profile_id = auth.uid());

-- ----- stripe_customers -----
create policy "Stripe customers: org admin can read"
on public.stripe_customers for select to authenticated
using (public.is_org_admin(org_id));

-- ----- stripe_subscriptions -----
create policy "Stripe subscriptions: org admin can read"
on public.stripe_subscriptions for select to authenticated
using (public.is_org_admin(org_id));

-- ----- sessions -----
create policy "Sessions: org members can read"
on public.sessions for select to authenticated
using (public.is_org_member(org_id));

create policy "Sessions: facilitator or admin can write"
on public.sessions for all to authenticated
using (
  public.is_org_admin(org_id)
  or facilitator_id = auth.uid()
)
with check (
  public.is_org_admin(org_id)
  or facilitator_id = auth.uid()
);

-- ----- stages -----
create policy "Stages: org members can read"
on public.stages for select to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = stages.session_id
      and public.is_org_member(s.org_id)
  )
);

create policy "Stages: facilitator or admin can write"
on public.stages for all to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = stages.session_id
      and (public.is_org_admin(s.org_id) or s.facilitator_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.sessions s
    where s.id = stages.session_id
      and (public.is_org_admin(s.org_id) or s.facilitator_id = auth.uid())
  )
);
