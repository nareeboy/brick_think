-- 20260519141000_session_reports.sql
-- One row per session capturing the latest PDF report generation attempt.
-- Single "latest" semantics: PK on session_id, regenerate overwrites the row
-- and the corresponding Storage object.

create table public.session_reports (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  generation_status text not null check (generation_status in ('pending','succeeded','failed')),
  claude_model text not null,
  pdf_path text,
  error_code text,
  error_message text,
  included_artifacts jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles(id) on delete set null
);

create index session_reports_generated_at_idx on public.session_reports (generated_at desc);

alter table public.session_reports enable row level security;

-- Facilitator of the parent session can SELECT their report row.
create policy "facilitator reads session report"
  on public.session_reports
  for select
  using (
    exists (
      select 1
      from public.sessions s
      where s.id = session_reports.session_id
        and s.facilitator_id = auth.uid()
    )
  );

-- Service role owns inserts/updates; no client write policy by design.
grant select, insert, update, delete on public.session_reports to service_role;
