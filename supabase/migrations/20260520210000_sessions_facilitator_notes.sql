-- 20260520210000_sessions_facilitator_notes.sql
--
-- Private facilitator scratchpad per session (Spec B).
-- 8000-char cap; privacy enforced at the data-access layer
-- (see lib/sessions/facilitatorNotes.ts), NOT at RLS.
--
-- Postgres RLS is row-level; this column is technically readable to
-- anyone who passes the existing sessions SELECT policy. The privacy
-- guarantee is: every server query lists columns explicitly; only one
-- helper projects facilitator_notes; a source-grep test asserts the
-- invariant.

alter table public.sessions
  add column if not exists facilitator_notes text
    check (facilitator_notes is null or length(facilitator_notes) <= 8000);
