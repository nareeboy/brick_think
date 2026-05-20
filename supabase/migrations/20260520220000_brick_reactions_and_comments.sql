-- 20260520220000_brick_reactions_and_comments.sql
--
-- Per-brick reactions and flat comments on room-backed canvases (Spec C).
-- Both tables key on (model_id, brick_id) where brick_id is the stable
-- string id assigned by makeBrickId('b') in builderState.tsx. Bricks live
-- in Yjs, not Postgres — no FK. Orphans (after brick delete) are retained
-- as historical record; UI hides them.

-- ── 1. brick_reactions ──────────────────────────────────────────────────────

create table if not exists public.brick_reactions (
  model_id uuid not null references public.models(id) on delete cascade,
  brick_id text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (model_id, brick_id, profile_id, emoji)
);

create index if not exists brick_reactions_brick_idx
  on public.brick_reactions (model_id, brick_id);

alter table public.brick_reactions enable row level security;

drop policy if exists "brick_reactions: room members read" on public.brick_reactions;
create policy "brick_reactions: room members read"
on public.brick_reactions for select to authenticated
using (public.can_edit_room(auth.uid(), model_id));

drop policy if exists "brick_reactions: room members insert own" on public.brick_reactions;
create policy "brick_reactions: room members insert own"
on public.brick_reactions for insert to authenticated
with check (
  profile_id = auth.uid()
  and public.can_edit_room(auth.uid(), model_id)
);

drop policy if exists "brick_reactions: room members delete own" on public.brick_reactions;
create policy "brick_reactions: room members delete own"
on public.brick_reactions for delete to authenticated
using (
  profile_id = auth.uid()
  and public.can_edit_room(auth.uid(), model_id)
);

-- ── 2. brick_comments ───────────────────────────────────────────────────────

create table if not exists public.brick_comments (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  brick_id text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists brick_comments_brick_idx
  on public.brick_comments (model_id, brick_id)
  where deleted_at is null;

create index if not exists brick_comments_created_idx
  on public.brick_comments (model_id, created_at desc);

alter table public.brick_comments enable row level security;

drop policy if exists "brick_comments: room members read" on public.brick_comments;
create policy "brick_comments: room members read"
on public.brick_comments for select to authenticated
using (public.can_edit_room(auth.uid(), model_id));

drop policy if exists "brick_comments: room members insert own" on public.brick_comments;
create policy "brick_comments: room members insert own"
on public.brick_comments for insert to authenticated
with check (
  profile_id = auth.uid()
  and public.can_edit_room(auth.uid(), model_id)
);

drop policy if exists "brick_comments: room members soft delete own" on public.brick_comments;
create policy "brick_comments: room members soft delete own"
on public.brick_comments for update to authenticated
using (
  profile_id = auth.uid()
  and public.can_edit_room(auth.uid(), model_id)
)
with check (profile_id = auth.uid());

-- ── 3. Realtime publication ─────────────────────────────────────────────────

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'brick_reactions'
  ) then
    execute 'alter publication supabase_realtime add table public.brick_reactions';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'brick_comments'
  ) then
    execute 'alter publication supabase_realtime add table public.brick_comments';
  end if;
end $$;

alter table public.brick_reactions replica identity full;
alter table public.brick_comments replica identity full;
