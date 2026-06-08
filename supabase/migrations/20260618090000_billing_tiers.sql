-- Tiered billing: add a tier to subscriptions and add per-session one-time unlocks.
-- Idempotent (guards on every statement) so a hand-applied remote and a fresh
-- local db:reset both replay cleanly. Service role is the ONLY writer; clients
-- read their own rows for the UI. Inert on self-hosted installs (billing disabled).

alter table public.facilitator_subscriptions
  add column if not exists tier text;

alter table public.facilitator_subscriptions
  drop constraint if exists facilitator_subscriptions_tier_chk;
alter table public.facilitator_subscriptions
  add constraint facilitator_subscriptions_tier_chk
  check (tier is null or tier in ('session_report', 'client_ready', 'full_findings'));

create table if not exists public.session_purchases (
  id                          uuid primary key default gen_random_uuid(),
  profile_id                  uuid not null references public.profiles(id) on delete cascade,
  session_id                  uuid not null references public.sessions(id) on delete cascade,
  tier                        text not null check (tier in ('session_report', 'client_ready', 'full_findings')),
  status                      text not null default 'paid',
  stripe_checkout_session_id  text unique,
  stripe_payment_intent_id    text unique,
  created_at                  timestamptz not null default now(),
  unique (profile_id, session_id)
);

create index if not exists session_purchases_profile_session_idx
  on public.session_purchases (profile_id, session_id);

alter table public.session_purchases enable row level security;

-- Buyer may read their own unlocks (UI badge). No client writes.
drop policy if exists "Session purchases: owner read" on public.session_purchases;
create policy "Session purchases: owner read"
on public.session_purchases
for select to authenticated
using (profile_id = auth.uid());

grant select, insert, update, delete on public.session_purchases to service_role;
