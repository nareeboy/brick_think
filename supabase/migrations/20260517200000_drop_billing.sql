-- ------------------------------------------------------------
-- 20260517200000_drop_billing
-- Open-source flip: remove Stripe billing scaffolding from the
-- schema. The init migration created `plans`, `stripe_customers`,
-- `stripe_subscriptions`, `organisations.plan_id`, and the
-- `plan_tier` + `subscription_status` enums; none are used now
-- that the per-seat pricing model is gone (replaced by the
-- ContributionCard on /app/account). Idempotent so a fresh
-- `pnpm db:reset` replays cleanly and an already-applied remote
-- is a safe no-op.
-- ------------------------------------------------------------

-- Drop the FK on organisations.plan_id before the column / table
-- it points at can go. `if exists` guards make this safe on a
-- freshly-reset local that already lacks the constraint.
alter table public.organisations drop constraint if exists organisations_plan_id_fkey;
alter table public.organisations drop column if exists plan_id;

-- stripe_subscriptions has FKs to organisations and plans, plus a
-- trigger and an index. `drop table ... cascade` cleans the
-- dependent policy/trigger/index/FK objects in one move.
drop table if exists public.stripe_subscriptions cascade;
drop table if exists public.stripe_customers cascade;
drop table if exists public.plans cascade;

-- Enums are only referenced by the tables we just dropped.
drop type if exists public.subscription_status;
drop type if exists public.plan_tier;
