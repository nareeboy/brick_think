-- supabase/migrations/20260519142000_session_reports_storage.sql
-- Provisions a private session-reports Storage bucket for generated session
-- PDF reports. Clients never access this bucket directly: the server action
-- uploads via service-role (which bypasses RLS) and hands out short-lived
-- signed URLs to recipients.
--
-- Intentionally no permissive policies on storage.objects for this bucket.
-- RLS on storage.objects denies by default, and the neighbouring buckets
-- (model-thumbnails, avatars) only grant access via policies that pin
-- bucket_id to their own name — so authenticated clients have no path to
-- read or write objects in this bucket. Service-role bypasses RLS, which
-- is how the server action in lib/reports/session-report.ts ships PDFs
-- into the bucket and signs URLs for download.
--
-- Written idempotently so re-applying (locally or against a remote that
-- has already been migrated by hand) is a no-op. Mirrors the bucket-insert
-- shape of supabase/migrations/20260513100000_model_thumbnails.sql.

insert into storage.buckets (id, name, public)
values ('session-reports', 'session-reports', false)
on conflict (id) do nothing;
