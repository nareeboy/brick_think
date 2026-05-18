-- Phase 2 of the WCAG 2.2 AA remediation. Adds a per-user accessibility
-- preferences blob on profiles so users can opt into pattern overlays
-- on bricks (colourblind mode) and any future a11y preferences.
alter table public.profiles
add column a11y_preferences jsonb not null default '{}'::jsonb;

comment on column public.profiles.a11y_preferences is
  'Per-user accessibility settings: { colourblindMode?: boolean, ... }';
