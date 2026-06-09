-- Drop the BYO-Anthropic-key tables. The paid features now run on a single
-- server-side ANTHROPIC_API_KEY (lib/integrations/anthropic.ts
-- getServerAnthropicClient), so the per-user key store is dead. org_integrations
-- was already orphaned (no code references). Idempotent + cascade so a fresh
-- db:reset replays cleanly and an already-migrated remote is a safe no-op.

drop table if exists public.user_integrations cascade;
drop table if exists public.org_integrations cascade;
