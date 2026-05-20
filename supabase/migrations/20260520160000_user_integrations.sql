-- 20260520160000_user_integrations.sql
-- Move BYO Anthropic API key storage from per-org (org_integrations) to
-- per-user (user_integrations). Users manage their own key on /app/account;
-- the report-generation pipeline looks up the key for the session's
-- facilitator at generation time.

drop table if exists public.org_integrations;

create table public.user_integrations (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  anthropic_api_key_ciphertext bytea,
  anthropic_api_key_nonce bytea,
  anthropic_api_key_last4 text,
  updated_at timestamptz not null default now(),
  check (
    (anthropic_api_key_ciphertext is null and anthropic_api_key_nonce is null
       and anthropic_api_key_last4 is null)
    or
    (anthropic_api_key_ciphertext is not null and anthropic_api_key_nonce is not null
       and anthropic_api_key_last4 is not null)
  )
);

alter table public.user_integrations enable row level security;

-- A user can SELECT their own row. The admin UI uses a narrow column allow-list.
create policy "users read own integrations"
  on public.user_integrations
  for select
  using (profile_id = auth.uid());

-- A user can INSERT / UPDATE / DELETE their own row. Ciphertext columns
-- are still readable via this policy, but the UI never selects them — see
-- the defence-in-depth note below.
create policy "users manage own integrations"
  on public.user_integrations
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Service role bypasses RLS for the decryption path in report generation.
grant select, insert, update, delete on public.user_integrations to service_role;

-- Defence-in-depth: RLS technically allows the owner to read ciphertext +
-- nonce. The admin UI explicitly selects only (anthropic_api_key_last4,
-- updated_at) — see app/(authed)/app/account/IntegrationsCard.tsx. The
-- decrypt helper in lib/integrations/anthropic.ts is the only code path
-- that reads anthropic_api_key_ciphertext, and it runs under service-role.
