-- supabase/migrations/20260606100000_careers_description_html.sql
-- The role description is now authored in a WYSIWYG editor and stored as
-- sanitized HTML, so the column name `description_markdown` became a lie.
-- Rename it to `description_html`. Existing plain-text values render fine as
-- HTML. Idempotent: only renames when the old column exists and the new one
-- doesn't, so re-running (or running after a fresh `db reset`) is a no-op.

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'careers_roles'
      and column_name = 'description_markdown'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'careers_roles'
      and column_name = 'description_html'
  ) then
    alter table public.careers_roles rename column description_markdown to description_html;
  end if;
end $$;

-- Rollback (reference only):
--   alter table public.careers_roles rename column description_html to description_markdown;
