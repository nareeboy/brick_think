-- supabase/migrations/20260605110000_careers_application_email.sql
-- Adds a required `email` to careers_applications. Recruiters reply by email,
-- not only via LinkedIn, so applicants now provide one. Additive + idempotent.
--
-- The column is promoted to NOT NULL via a safe backfill so the migration can
-- never fail on a table that already holds rows (none in prod; this guards
-- local/test data). Format is validated in the application layer (the apply
-- route); the DB only length-checks, mirroring how `linkedin_url` is handled.

alter table public.careers_applications
  add column if not exists email text;

-- Backfill any pre-existing rows so the NOT NULL promotion can't fail.
update public.careers_applications
  set email = 'unknown@example.invalid'
  where email is null;

alter table public.careers_applications
  alter column email set not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'careers_applications_email_check'
  ) then
    alter table public.careers_applications
      add constraint careers_applications_email_check
      check (length(email) between 3 and 320);
  end if;
end $$;

-- Rollback (reference only):
--   alter table public.careers_applications drop constraint careers_applications_email_check;
--   alter table public.careers_applications drop column email;
