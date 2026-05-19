-- supabase/migrations/20260519100000_notifications_and_invitations.sql
--
-- Two tables to power the "user was added to an org" / "session has started"
-- notification surface, plus the invite-by-email flow for people who do not
-- yet have an account.
--
--   * public.org_invitations — bridges the "added to an org before signup"
--     case. The membership row is created only on claim (a profile-creation
--     trigger matches by email). Until then the row sits here so the org
--     admin sees the pending invite and a magic-link sign-up materialises
--     it on next sign-in.
--
--   * public.notifications — per-recipient inbox row. One row per
--     recipient × event (fan-out at write time); RLS stays trivial that
--     way and Realtime row-filters work on a single column.
--
-- The trigger on public.profiles AFTER INSERT claims any matching
-- org_invitations rows for the new profile's email — inserts the
-- org_memberships row(s) AND drops a `org_added` notification, then marks
-- the invitation claimed. So an invited-then-signed-up user sees the
-- notification the first time they open the app.
--
-- Realtime row-filter on UPDATE needs REPLICA IDENTITY FULL on
-- notifications (mark-read flips read_at and the participant's RLS gate
-- must evaluate against the full OLD row — see the stage-runtime-state
-- migration for the same gotcha applied to stages/sessions).

-- ── 1. org_invitations ───────────────────────────────────────────────────────

create table if not exists public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  email citext not null,
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by_profile_id uuid references public.profiles(id) on delete set null
);

create unique index if not exists org_invitations_unique_open_idx
  on public.org_invitations (org_id, email)
  where claimed_at is null;

create index if not exists org_invitations_email_idx
  on public.org_invitations (email)
  where claimed_at is null;

alter table public.org_invitations enable row level security;

drop policy if exists "Org invitations: admins read" on public.org_invitations;
create policy "Org invitations: admins read"
on public.org_invitations
for select to authenticated
using (public.is_org_admin(org_id));

-- ── 2. notifications ─────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('org_added', 'session_started')),
  title text not null,
  body text,
  link_url text,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  org_id uuid references public.organisations(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_recent_idx
  on public.notifications (recipient_profile_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_profile_id)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Notifications: recipient read" on public.notifications;
create policy "Notifications: recipient read"
on public.notifications
for select to authenticated
using (recipient_profile_id = auth.uid());

drop policy if exists "Notifications: recipient mark read" on public.notifications;
create policy "Notifications: recipient mark read"
on public.notifications
for update to authenticated
using (recipient_profile_id = auth.uid())
with check (recipient_profile_id = auth.uid());

-- ── 3. Realtime publication + replica identity ──────────────────────────────

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

alter table public.notifications replica identity full;

-- ── 4. handle_new_user — extend to claim invitations ────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_invite record;
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
