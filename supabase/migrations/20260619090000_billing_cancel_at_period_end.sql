-- Track whether an active subscription is set to cancel at period end. Stripe
-- keeps status='active' until the paid period actually ends, so the billing UI
-- needs this flag to show "cancelled — active until <current_period_end>" while
-- the subscription is still usable. Idempotent so local db:reset and the remote
-- pooler push both replay cleanly. Defaults false (the normal renewing state).

alter table public.facilitator_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;
