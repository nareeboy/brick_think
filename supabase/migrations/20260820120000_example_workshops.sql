-- Example workshops for every user.
--
-- The one-click seeded demo workshop used to be a site-admin testing tool; it
-- is now offered to every signed-in user so they can see what a finished
-- workshop looks like before running one. That needs a way to tell a user's
-- example apart from their real workshops: it enforces the one-per-user rule
-- (regular users reopen their existing example rather than seeding another),
-- and badges the card on /app/workshops so a demo is never mistaken for real
-- work. Site admins are exempt from the rule and keep seeding freely.

alter table public.organisations
  add column if not exists is_example boolean not null default false;

comment on column public.organisations.is_example is
  'True for seeded demo workshops (lib/exampleWorkshop/seed.ts), not real user workshops.';

-- Every read is "does this owner already have an example?", so a partial index
-- on the owner keeps that lookup off a sequential scan as the table grows.
create index if not exists organisations_owner_id_is_example_idx
  on public.organisations (owner_id)
  where is_example;
