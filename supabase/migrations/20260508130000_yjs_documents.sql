-- Yjs persistence (Phase 0 step 8 PoC)
-- Stores the latest encoded snapshot per shared model. The worker
-- writes to this table after a debounce window (idle persistence)
-- and reads on startup to seed the y-websocket room. Phase 4
-- will replace this with incremental updates.

create table public.yjs_documents (
  name text primary key,
  state bytea not null,
  bytes integer generated always as (octet_length(state)) stored,
  updated_at timestamptz not null default now()
);

alter table public.yjs_documents enable row level security;

-- Direct read access is server-side only (worker, Edge Functions).
-- No application client should hit this table directly. RLS denies
-- everything by default once enabled with no policies; service-role
-- writes bypass RLS by design.

comment on table public.yjs_documents is
  'Latest Yjs document snapshot per shared model name. Service-role only.';
