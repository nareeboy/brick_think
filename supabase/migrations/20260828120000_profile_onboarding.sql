-- Server-side onboarding state: configuration-flow answers (role, fluency,
-- purpose, group size, queued invites) and pathway progress
-- (not_started/completed/skipped + modal dismissal + drop-off events).
-- Shape is owned and normalised by lib/onboarding/config.ts; tour seen-flags
-- deliberately stay in per-device localStorage and never land here.
-- Covered by the profiles self-select/self-update RLS policies.

alter table public.profiles
  add column if not exists onboarding jsonb not null default '{}'::jsonb;

comment on column public.profiles.onboarding is
  'Onboarding configuration answers and pathway progress. Normalised by lib/onboarding/config.ts.';
