-- supabase/migrations/20260519130000_stage_rooms.sql
-- Stage rooms (breakout groups) for shared_model / system_model / guiding_principles.
--
-- Replaces single-canvas-per-(session, stage) semantics for these three stages.
-- The facilitator partitions participants into rooms on shared_model and then
-- composes downstream rooms from upstream room sets on system_model and
-- guiding_principles. Each room has exactly one canvas (models row).
--
-- See app/(authed)/CLAUDE.md "Rooms & breakout groups" for the user-facing flow
-- and lib/sessions/stage-rooms.ts for the runtime invariants.

-- 1. stage_rooms ------------------------------------------------------------
create table if not exists public.stage_rooms (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  position int not null check (position >= 0),
  title text check (title is null or length(title) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (stage_id, position)
);

create index if not exists stage_rooms_stage_idx on public.stage_rooms(stage_id);

-- Composite uniqueness so children can FK on (id, stage_id) for the
-- "membership is mutually exclusive within a stage" guarantee.
alter table public.stage_rooms
  drop constraint if exists stage_rooms_id_stage_uniq;
alter table public.stage_rooms
  add constraint stage_rooms_id_stage_uniq unique (id, stage_id);

-- 2. models.room_id ---------------------------------------------------------
-- Each room canvas is a `models` row. room_id is the canonical pointer; the
-- unique index ensures 1-1.
alter table public.models
  add column if not exists room_id uuid references public.stage_rooms(id) on delete cascade;

create unique index if not exists models_room_uniq
  on public.models(room_id) where room_id is not null;

-- Personal session models (individual_model, skill_building, guiding_principles
-- where the user hasn't opted into rooms) still get one-per-(session, stage,
-- owner). Room canvases are excluded so the facilitator can own multiple rooms
-- in the same stage.
drop index if exists models_session_stage_owner_active_idx;
create unique index models_session_stage_owner_active_idx
  on public.models(session_id, stage_id, owner_profile_id)
  where session_id is not null and deleted_at is null and room_id is null;

-- 3. stage_room_members -----------------------------------------------------
-- Populated for shared_model rooms only. Mutual exclusion within a stage:
-- a participant belongs to at most one shared_model room per stage.
create table if not exists public.stage_room_members (
  room_id uuid not null,
  stage_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, profile_id),
  foreign key (room_id, stage_id) references public.stage_rooms(id, stage_id) on delete cascade
);

create unique index if not exists stage_room_members_stage_profile_uniq
  on public.stage_room_members(stage_id, profile_id);

create index if not exists stage_room_members_profile_idx
  on public.stage_room_members(profile_id);

-- 4. stage_room_sources -----------------------------------------------------
-- Populated for system_model and guiding_principles rooms. Each row says
-- "this room aggregates that upstream room". The server action validates that
-- source_room is on the immediately-preceding stage in IMPORT_RULES.
create table if not exists public.stage_room_sources (
  room_id uuid not null references public.stage_rooms(id) on delete cascade,
  source_room_id uuid not null references public.stage_rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, source_room_id),
  check (room_id <> source_room_id)
);

create index if not exists stage_room_sources_source_idx
  on public.stage_room_sources(source_room_id);

-- 5. RLS --------------------------------------------------------------------
alter table public.stage_rooms enable row level security;
alter table public.stage_room_members enable row level security;
alter table public.stage_room_sources enable row level security;

drop policy if exists "Stage rooms: org members read" on public.stage_rooms;
create policy "Stage rooms: org members read"
  on public.stage_rooms for select to authenticated
  using (
    exists (
      select 1
      from public.stages st
      join public.sessions s on s.id = st.session_id
      where st.id = stage_rooms.stage_id
        and public.is_org_member(s.org_id)
    )
  );

drop policy if exists "Stage room members: org members read" on public.stage_room_members;
create policy "Stage room members: org members read"
  on public.stage_room_members for select to authenticated
  using (
    exists (
      select 1
      from public.stages st
      join public.sessions s on s.id = st.session_id
      where st.id = stage_room_members.stage_id
        and public.is_org_member(s.org_id)
    )
  );

drop policy if exists "Stage room sources: org members read" on public.stage_room_sources;
create policy "Stage room sources: org members read"
  on public.stage_room_sources for select to authenticated
  using (
    exists (
      select 1
      from public.stage_rooms r
      join public.stages st on st.id = r.stage_id
      join public.sessions s on s.id = st.session_id
      where r.id = stage_room_sources.room_id
        and public.is_org_member(s.org_id)
    )
  );

-- INSERT / UPDATE / DELETE: no policy on any of the three tables — facilitator
-- writes flow through the service-role client in the room server actions.

-- 6. Realtime publication ---------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stage_rooms'
  ) then
    alter publication supabase_realtime add table public.stage_rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stage_room_members'
  ) then
    alter publication supabase_realtime add table public.stage_room_members;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stage_room_sources'
  ) then
    alter publication supabase_realtime add table public.stage_room_sources;
  end if;
end $$;

alter table public.stage_rooms          replica identity full;
alter table public.stage_room_members   replica identity full;
alter table public.stage_room_sources   replica identity full;

-- 7. can_edit_room(p_profile_id, p_model_id) --------------------------------
-- Recursive transitive-membership check. True iff p_profile_id is a member of
-- some shared_model room that is reachable (via stage_room_sources edges)
-- from the room linked to p_model_id. Used by:
--   - Yjs worker before accepting a WS upgrade on a room canvas.
--   - lib/yjs/canPlaceLive.ts via a server-fetched flag passed to the design
--     page liveMode gate.
create or replace function public.can_edit_room(
  p_profile_id uuid,
  p_model_id uuid
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with recursive
    target_room as (
      select m.room_id as id
      from public.models m
      where m.id = p_model_id
        and m.room_id is not null
    ),
    ancestors as (
      select id from target_room
      union
      select s.source_room_id
      from ancestors a
      join public.stage_room_sources s on s.room_id = a.id
    )
  select exists (
    select 1
    from ancestors a
    join public.stage_room_members mem on mem.room_id = a.id
    where mem.profile_id = p_profile_id
  );
$$;

revoke execute on function public.can_edit_room(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.can_edit_room(uuid, uuid) to service_role;

comment on function public.can_edit_room(uuid, uuid) is
  'Worker- and server-callable. True iff profile is a transitive room member for the room linked to model. service_role only.';

-- 8. Backfill ---------------------------------------------------------------
-- Every existing shared_model model row becomes Room 1 (position 0, null title)
-- on its stage, with every org member of the session enrolled. Idempotent:
-- skips rows where room_id is already set, so re-running `db:reset` is safe
-- past the first apply and out-of-band remote application is a no-op.
do $$
declare
  m record;
  r_id uuid;
begin
  for m in
    select mm.id as model_id, mm.stage_id, s.org_id
    from public.models mm
    join public.stages st on st.id = mm.stage_id
    join public.sessions s on s.id = st.session_id
    where st.stage_type = 'shared_model'
      and mm.room_id is null
      and mm.deleted_at is null
  loop
    insert into public.stage_rooms (stage_id, position, title)
    values (m.stage_id, 0, null)
    returning id into r_id;

    update public.models set room_id = r_id where id = m.model_id;

    insert into public.stage_room_members (room_id, stage_id, profile_id)
    select r_id, m.stage_id, om.profile_id
    from public.org_memberships om
    where om.org_id = m.org_id
    on conflict do nothing;
  end loop;
end $$;
