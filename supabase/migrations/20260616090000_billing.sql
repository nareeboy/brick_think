-- Billing (cost-recovery, hosted-only). Re-adds a leaner schema than the
-- 20260517200000_drop_billing.sql open-source flip removed. The Stripe webhook
-- (service role) is the ONLY writer of entitlement state; clients read their own
-- row for the UI badge. Tables are inert/empty on self-hosted installs.

create table if not exists public.stripe_customers (
  profile_id          uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id  text not null unique,
  created_at          timestamptz not null default now()
);

create table if not exists public.facilitator_subscriptions (
  profile_id              uuid primary key references public.profiles(id) on delete cascade,
  stripe_subscription_id  text not null unique,
  status                  text not null,
  current_period_end      timestamptz,
  updated_at              timestamptz not null default now()
);

alter table public.stripe_customers enable row level security;
alter table public.facilitator_subscriptions enable row level security;

-- Facilitator may read their own subscription row (UI badge). No client writes.
drop policy if exists "Subscriptions: owner read" on public.facilitator_subscriptions;
create policy "Subscriptions: owner read"
on public.facilitator_subscriptions
for select to authenticated
using (profile_id = auth.uid());

-- stripe_customers is server-only; no authenticated read policy (clients never need it).

grant select, insert, update, delete on public.stripe_customers to service_role;
grant select, insert, update, delete on public.facilitator_subscriptions to service_role;
