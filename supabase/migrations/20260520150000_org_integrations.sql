-- 20260519140000_org_integrations.sql
-- Per-org BYO Anthropic API key storage for the session report feature.
-- Ciphertext is AES-256-GCM encrypted with BRICKTHINK_ENCRYPTION_KEY in the
-- web service; nonce is stored alongside. last4 surfaces in the admin UI so
-- admins can recognise which key is connected without ever decrypting.

create table public.org_integrations (
  org_id uuid primary key references public.organisations(id) on delete cascade,
  anthropic_api_key_ciphertext bytea,
  anthropic_api_key_nonce bytea,
  anthropic_api_key_last4 text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (
    (anthropic_api_key_ciphertext is null and anthropic_api_key_nonce is null
       and anthropic_api_key_last4 is null)
    or
    (anthropic_api_key_ciphertext is not null and anthropic_api_key_nonce is not null
       and anthropic_api_key_last4 is not null)
  )
);

alter table public.org_integrations enable row level security;

-- Org admins can SELECT the row (the admin UI uses a narrow column allow-list).
create policy "org admins read integrations"
  on public.org_integrations
  for select
  using (public.is_org_admin(org_id));

-- Org admins can INSERT / UPDATE / DELETE; ciphertext is written via service-role.
create policy "org admins manage integrations"
  on public.org_integrations
  for all
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

-- Service role bypasses RLS for the decryption path in report generation.
grant select, insert, update, delete on public.org_integrations to service_role;
