-- 20260606110000_model_narrations.sql
--
-- model_narrations: one transcript per model, written by the model owner.
-- Audio is NEVER stored — the browser's Web Speech API produces text and we
-- persist only the text. Reads/writes go exclusively through service-role
-- server code, because can_read_model is service-role-only and cannot be
-- called from an authenticated RLS policy. RLS is therefore enabled and
-- LOCKED (no policies for the authenticated role): only service_role (which
-- bypasses RLS) touches the table. Mirrors the facilitator-notes access model.
--
-- No updated_at trigger: the table is service-role-only and the saveNarration
-- action sets updated_at explicitly in its upsert payload.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'narration_cleanup_status') then
    create type public.narration_cleanup_status as enum ('skipped', 'succeeded', 'failed');
  end if;
end $$;

create table if not exists public.model_narrations (
  id              uuid primary key default gen_random_uuid(),
  model_id        uuid not null references public.models(id) on delete cascade,
  profile_id      uuid references public.profiles(id) on delete set null,
  stage_type      public.stage_type not null,
  transcript_raw  text not null,
  transcript      text not null,
  cleaned         boolean not null default false,
  cleanup_status  public.narration_cleanup_status not null default 'skipped',
  duration_ms     integer check (duration_ms is null or duration_ms >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (model_id)
);

create index if not exists model_narrations_model_idx
  on public.model_narrations (model_id);

alter table public.model_narrations enable row level security;
revoke all on public.model_narrations from anon, authenticated;
