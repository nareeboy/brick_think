-- supabase/migrations/20260616120000_articles_body_html.sql
-- Articles move from Markdown to WYSIWYG HTML. Rename the column to match.
-- Idempotent: safe on a fresh db:reset AND as a no-op against an already-renamed
-- remote. Column still holds old Markdown until the one-time conversion script
-- (scripts/convert-article-bodies-to-html.ts) runs; ArticleProse's shim renders
-- legacy Markdown rows correctly in the meantime.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'articles' and column_name = 'body_markdown'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'articles' and column_name = 'body_html'
  ) then
    alter table public.articles rename column body_markdown to body_html;
  end if;
end $$;

-- Rollback (reference only):
--   alter table public.articles rename column body_html to body_markdown;
