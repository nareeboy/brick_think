-- 20260520200000_session_join_and_roster.sql
--
-- Participant join + roster surface (Spec A).
--
-- New tables:
--   * public.session_participants  — soft-delete membership row
--   * public.session_invitations   — pending email invites (mirrors org_invitations)
--
-- New columns on public.sessions:
--   * join_code text unique        — 6-char Crockford base32
--   * spotlight_target_profile_id  — Realtime-published facilitator pointer
--
-- New helpers:
--   * public.is_session_participant(p_session_id)
--   * public.is_session_participant_for(p_profile_id, p_session_id)
--   * public.generate_join_code()
--   * public.lookup_session_by_code(p_code)  — unauthenticated-safe lookup
--
-- RLS extensions: SELECT policies on sessions/stages/stage_rooms/
-- stage_room_members/stage_room_sources gain an OR is_session_participant
-- branch. can_read_model gains a parallel branch.
--
-- Trigger: public.handle_new_user (the existing AFTER INSERT trigger on
-- auth.users that already creates profiles + claims org_invitations) is
-- extended in-place to also claim session_invitations and fire a
-- session_invitation_claimed notification to the session facilitator.
--
-- Realtime: session_participants joins the publication with REPLICA
-- IDENTITY FULL so the roster panel + kicked-user banner update live.

-- ── 1. Tables ───────────────────────────────────────────────────────────────

create table if not exists public.session_participants (
  session_id uuid not null references public.sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by_profile_id uuid references public.profiles(id) on delete set null,
  primary key (session_id, profile_id)
);

create index if not exists session_participants_profile_idx
  on public.session_participants (profile_id)
  where removed_at is null;

create index if not exists session_participants_session_active_idx
  on public.session_participants (session_id)
  where removed_at is null;

alter table public.session_participants enable row level security;

create table if not exists public.session_invitations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  email citext not null,
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by_profile_id uuid references public.profiles(id) on delete set null
);

create unique index if not exists session_invitations_unique_open_idx
  on public.session_invitations (session_id, email)
  where claimed_at is null;

create index if not exists session_invitations_email_idx
  on public.session_invitations (email)
  where claimed_at is null;

alter table public.session_invitations enable row level security;

-- ── 2. Sessions columns ─────────────────────────────────────────────────────

alter table public.sessions
  add column if not exists join_code text,
  add column if not exists spotlight_target_profile_id uuid
    references public.profiles(id) on delete set null;

create unique index if not exists sessions_join_code_idx
  on public.sessions (join_code);

-- ── 3. Join-code generator ──────────────────────────────────────────────────
-- Crockford-style base32, minus the visually ambiguous 0/1/I/L/O/U.
-- 30-char alphabet × 6 chars ≈ 729M combinations; collision probability on
-- INSERT is negligible but the function still retries up to 16 times.

create or replace function public.generate_join_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  code text;
  i int;
  attempts int := 0;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    perform 1 from public.sessions where join_code = code;
    if not found then
      return code;
    end if;
    attempts := attempts + 1;
    if attempts > 16 then
      raise exception 'generate_join_code: could not find unique code after 16 attempts';
    end if;
  end loop;
end;
$$;

-- Backfill existing sessions with a join code.
update public.sessions
set join_code = public.generate_join_code()
where join_code is null;

-- ── 4. Access helpers ───────────────────────────────────────────────────────

-- LANGUAGE plpgsql (not sql) — Postgres inlines STABLE LANGUAGE sql
-- functions into the surrounding query plan; when that happens inside
-- an RLS USING/WITH CHECK clause, the inlined body runs in the caller's
-- security context, defeating SECURITY DEFINER. See the prior fix in
-- 20260514000000_org_helpers_plpgsql.sql for the same issue with
-- is_org_member / is_org_admin.
create or replace function public.is_session_participant(p_session_id uuid)
returns boolean
language plpgsql
stable security definer
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1
    from public.session_participants sp
    where sp.session_id = p_session_id
      and sp.profile_id = auth.uid()
      and sp.removed_at is null
  );
end;
$$;

-- Parametric variant for service-role / worker callers (mirrors the
-- is_org_member / is_org_member_for split). Also plpgsql for the same
-- inliner reason as above.
create or replace function public.is_session_participant_for(
  p_profile_id uuid,
  p_session_id uuid
) returns boolean
language plpgsql
stable security definer
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1
    from public.session_participants sp
    where sp.session_id = p_session_id
      and sp.profile_id = p_profile_id
      and sp.removed_at is null
  );
end;
$$;

-- The parametric variant takes a caller-supplied profile_id it doesn't
-- validate against auth.uid(); restrict to service_role only (mirrors
-- is_org_member_for / can_read_model in 20260516210000_can_read_model.sql).
-- The auth.uid()-based is_session_participant(uuid) stays open to
-- authenticated — it's caller-safe.
revoke execute on function public.is_session_participant_for(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.is_session_participant_for(uuid, uuid) to service_role;

-- Unauthenticated-safe session lookup for the join page. SECURITY DEFINER
-- so anon callers can resolve a code without granting blanket SELECT on
-- public.sessions. Returns one row max (join_code has a unique index).
create or replace function public.lookup_session_by_code(p_code text)
returns table (id uuid, status public.session_status, title text, facilitator_full_name text)
language sql
stable security definer
set search_path = public, pg_temp
as $$
  select s.id, s.status, s.title, p.full_name
  from public.sessions s
  left join public.profiles p on p.id = s.facilitator_id
  -- generate_join_code only emits uppercase; compare against upper(p_code)
  -- so the unique btree on join_code stays usable (lower() would force a
  -- sequential scan).
  where s.join_code = upper(p_code);
$$;

-- ── 5. RLS — session_participants ───────────────────────────────────────────

drop policy if exists "Session participants: facilitator + admin read" on public.session_participants;
create policy "Session participants: facilitator + admin read"
on public.session_participants for select to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_id
      and (s.facilitator_id = auth.uid() or public.is_org_admin(s.org_id))
  )
);

drop policy if exists "Session participants: self read" on public.session_participants;
create policy "Session participants: self read"
on public.session_participants for select to authenticated
using (profile_id = auth.uid());

-- INSERT/UPDATE/DELETE flow through service-role server actions; no
-- policies on those verbs by design.

-- ── 6. RLS — session_invitations ────────────────────────────────────────────

drop policy if exists "Session invitations: facilitator + admin read" on public.session_invitations;
create policy "Session invitations: facilitator + admin read"
on public.session_invitations for select to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_id
      and (s.facilitator_id = auth.uid() or public.is_org_admin(s.org_id))
  )
);

-- ── 7. RLS extensions on existing tables ────────────────────────────────────
-- Each existing "org members can read" SELECT policy is dropped and
-- re-created with an OR is_session_participant branch so a participant
-- who is NOT an org member can still see the session, its stages, and
-- the rooms backing them.

drop policy if exists "Sessions: org members can read" on public.sessions;
create policy "Sessions: org members can read"
on public.sessions for select to authenticated
using (public.is_org_member(org_id) or public.is_session_participant(id));

drop policy if exists "Stages: org members can read" on public.stages;
create policy "Stages: org members can read"
on public.stages for select to authenticated
using (
  exists (
    select 1 from public.sessions s
    where s.id = session_id
      and (public.is_org_member(s.org_id) or public.is_session_participant(s.id))
  )
);

drop policy if exists "Stage rooms: org members read" on public.stage_rooms;
drop policy if exists "Stage rooms: members read" on public.stage_rooms;
create policy "Stage rooms: members read"
on public.stage_rooms for select to authenticated
using (
  exists (
    select 1
    from public.stages st
    join public.sessions s on s.id = st.session_id
    where st.id = stage_id
      and (public.is_org_member(s.org_id) or public.is_session_participant(s.id))
  )
);

drop policy if exists "Stage room members: org members read" on public.stage_room_members;
drop policy if exists "Stage room members: read" on public.stage_room_members;
create policy "Stage room members: read"
on public.stage_room_members for select to authenticated
using (
  exists (
    select 1
    from public.stages st
    join public.sessions s on s.id = st.session_id
    where st.id = stage_id
      and (public.is_org_member(s.org_id) or public.is_session_participant(s.id))
  )
);

drop policy if exists "Stage room sources: org members read" on public.stage_room_sources;
drop policy if exists "Stage room sources: read" on public.stage_room_sources;
create policy "Stage room sources: read"
on public.stage_room_sources for select to authenticated
using (
  exists (
    select 1
    from public.stage_rooms r
    join public.stages st on st.id = r.stage_id
    join public.sessions s on s.id = st.session_id
    where r.id = room_id
      and (public.is_org_member(s.org_id) or public.is_session_participant(s.id))
  )
);

-- ── 8. can_read_model extension ─────────────────────────────────────────────
-- Mirrors the SELECT-RLS branch on models for the worker / server-callable
-- gate. Adds a participant branch parallel to the existing org-member one.
-- CREATE OR REPLACE preserves the pre-existing revoke/grant from
-- 20260516210000_can_read_model.sql; re-stated below for clarity.

create or replace function public.can_read_model(p_profile_id uuid, p_model_id uuid)
returns boolean
language sql
stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.models m
    where m.id = p_model_id
      and m.deleted_at is null
      and (
        m.owner_profile_id = p_profile_id
        or (m.org_id is not null and public.is_org_member_for(p_profile_id, m.org_id))
        or (m.session_id is not null and exists (
          select 1
          from public.sessions s
          where s.id = m.session_id
            and public.is_org_member_for(p_profile_id, s.org_id)
        ))
        or (m.session_id is not null and public.is_session_participant_for(p_profile_id, m.session_id))
      )
  );
$$;

revoke execute on function public.can_read_model(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.can_read_model(uuid, uuid) to service_role;

comment on function public.can_read_model(uuid, uuid) is
  'Worker-callable. Mirrors the SELECT RLS predicate on public.models. Includes session-participant branch. service_role only.';

-- ── 8b. Extend the models SELECT policy with a participant branch ───────────
-- The previous block only updated can_read_model() (the worker / server-
-- callable gate). The table-level RLS policy on public.models, defined in
-- 20260514150000_collapse_models_rls.sql, also needs the participant
-- OR-branch — otherwise a participant who is NOT an org member can read
-- sessions and stages rows but `select * from models where session_id = ?`
-- returns zero rows for them through the user-scoped client.
--
-- Preserves the existing `deleted_at is null` guard on every non-owner
-- branch so trashed models stay invisible to org/session readers.
drop policy if exists "Models: owner, org reader, or session reader can read" on public.models;
create policy "Models: owner, org reader, or session reader can read"
  on public.models for select to authenticated
  using (
    owner_profile_id = auth.uid()
    or (
      deleted_at is null
      and (
        (org_id is not null and public.is_org_member(org_id))
        or (
          session_id is not null
          and exists (
            select 1 from public.sessions s
            where s.id = models.session_id
              and public.is_org_member(s.org_id)
          )
        )
        or (
          session_id is not null
          and public.is_session_participant(models.session_id)
        )
      )
    )
  );

-- ── 9. handle_new_user — also claim session_invitations ─────────────────────
-- The existing AFTER INSERT trigger on auth.users (defined in
-- 20260519100000_notifications_and_invitations.sql) creates the public
-- profile row and claims any org_invitations matching the new user's
-- email. We extend it here to also:
--   * insert public.session_participants rows for matching session_invitations
--   * fire session_invitation_claimed notifications to each session facilitator
--   * mark the session_invitations as claimed
-- Org-invite behaviour is preserved verbatim.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_invite record;
  v_session_invite record;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );

  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    v_full_name,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  -- org_invitations: behaviour preserved verbatim from 20260519100000_notifications_and_invitations.sql
  for v_invite in
    select id, org_id, invited_by
    from public.org_invitations
    where email = new.email
      and claimed_at is null
  loop
    insert into public.org_memberships (org_id, profile_id, role)
    values (v_invite.org_id, new.id, 'member')
    on conflict (org_id, profile_id) do nothing;

    insert into public.notifications
      (recipient_profile_id, kind, title, body, link_url, actor_profile_id, org_id)
    values (
      new.id,
      'org_added',
      'You were added to an organisation',
      null,
      '/app/orgs/' || v_invite.org_id::text,
      v_invite.invited_by,
      v_invite.org_id
    );

    update public.org_invitations
    set claimed_at = now(),
        claimed_by_profile_id = new.id
    where id = v_invite.id;
  end loop;

  -- session_invitations: new behaviour. Insert a participant row per open
  -- invite, notify the session facilitator, then mark the invite claimed.
  for v_session_invite in
    select i.id, i.session_id, s.facilitator_id, s.title
    from public.session_invitations i
    join public.sessions s on s.id = i.session_id
    where i.email = new.email
      and i.claimed_at is null
  loop
    -- An explicit re-invitation by the facilitator should restore a
    -- previously-kicked participant (clear removed_at / removed_by, bump
    -- joined_at). Without this, a soft-deleted row would silently absorb
    -- the new invite (`do nothing`), the facilitator's invitation would
    -- be marked claimed, no notification would fire, and the user would
    -- have no way to retry. The "sticky kick" rule for unsolicited
    -- code-redemption stays intact — it's enforced in redeemJoinCodeAction
    -- (Task 3), not here.
    insert into public.session_participants (session_id, profile_id)
    values (v_session_invite.session_id, new.id)
    on conflict (session_id, profile_id) do update
      set removed_at = null,
          removed_by_profile_id = null,
          joined_at = now();

    if v_session_invite.facilitator_id is not null then
      insert into public.notifications
        (recipient_profile_id, kind, title, body, link_url, actor_profile_id, session_id)
      values (
        v_session_invite.facilitator_id,
        'session_invitation_claimed',
        coalesce(v_full_name, new.email::text) || ' joined ' || v_session_invite.title,
        null,
        '/app/sessions/' || v_session_invite.session_id::text,
        new.id,
        v_session_invite.session_id
      );
    end if;

    update public.session_invitations
    set claimed_at = now(),
        claimed_by_profile_id = new.id
    where id = v_session_invite.id;
  end loop;

  return new;
end;
$$;

-- ── 10. Extend notifications.kind CHECK ─────────────────────────────────────

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('org_added', 'session_started', 'participant_joined', 'session_invitation_claimed'));

-- ── 11. Realtime publication ────────────────────────────────────────────────

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'session_participants'
  ) then
    execute 'alter publication supabase_realtime add table public.session_participants';
  end if;
end $$;

alter table public.session_participants replica identity full;

-- sessions already in supabase_realtime with REPLICA IDENTITY FULL
-- (stage_runtime_state migration) — spotlight_target_profile_id UPDATEs
-- ride that existing surface, no further setup needed.
