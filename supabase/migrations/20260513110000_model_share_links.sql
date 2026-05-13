-- supabase/migrations/20260513110000_model_share_links.sql
-- Public sharing links for personal designs. Owner-only authenticated RLS.
-- The /share/[token] route bypasses RLS via the service-role client (token IS the auth).
-- Companion spec: docs/superpowers/specs/2026-05-13-public-sharing-links-design.md

create table public.model_share_links (
  id           uuid primary key default gen_random_uuid(),
  token        text not null unique
                  check (length(token) between 32 and 128),
  model_id     uuid not null references public.models(id) on delete cascade,
  created_by   uuid not null references public.profiles(id) on delete cascade,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index model_share_links_model_idx
  on public.model_share_links(model_id, created_at desc);

alter table public.model_share_links enable row level security;

create policy "Share links: owner of model can read"
  on public.model_share_links for select to authenticated
  using (exists (
    select 1 from public.models m
    where m.id = model_share_links.model_id
      and m.owner_profile_id = auth.uid()
  ));

create policy "Share links: owner of model can insert"
  on public.model_share_links for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.models m
      where m.id = model_share_links.model_id
        and m.owner_profile_id = auth.uid()
    )
  );

create policy "Share links: owner can revoke"
  on public.model_share_links for update to authenticated
  using (exists (
    select 1 from public.models m
    where m.id = model_share_links.model_id
      and m.owner_profile_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.models m
    where m.id = model_share_links.model_id
      and m.owner_profile_id = auth.uid()
  ));
