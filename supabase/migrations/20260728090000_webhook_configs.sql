-- Admin-configurable outbound webhooks (signup notifications → Make/Zapier).
--
-- Two tables:
--   * webhook_configs    — one row per configured hook (type, URL, trigger,
--                          delay in days, active flag). Managed from
--                          /app/admin/webhooks; site-admin-only via RLS.
--   * webhook_deliveries — one row per (user, webhook) delivery. Immediate
--                          hooks (delay_days = 0) are posted from the signup
--                          trigger via pg_net and land here already sent;
--                          delayed hooks (day-3 check-in etc.) are queued with
--                          a future scheduled_for and posted by the pg_cron
--                          processor below. Doubles as the admin page's
--                          "recent deliveries" audit log.
--
-- Firing is a DB trigger on public.profiles AFTER INSERT — the single point
-- every signup path (magic link, Google OAuth) converges on via
-- handle_new_user(). INSERT-only means existing users can never be re-fired:
-- handle_new_user()'s `on conflict (id) do update` runs UPDATE triggers, not
-- INSERT triggers, for rows that already exist. pg_net posts are async
-- (enqueued, sent out-of-band), so signup latency is unaffected, and the
-- trigger swallows per-config errors so a bad webhook can never break signup.
--
-- Delivery is fire-and-forget (pg_net enqueue == sent), matching the
-- reference implementation this mirrors; response-status tracking is a
-- deliberate non-goal for v1.
--
-- No hook URLs are seeded here: this repo is public, and a seeded URL would
-- let anyone spam the receiving scenario. Hooks are added through the admin
-- page (or direct SQL against the target environment).
--
-- pg_cron enabled in 20260513000000_models_soft_delete.sql; pg_net in
-- 20260605090000_careers.sql. Idempotent — every statement can re-run safely.

create extension if not exists pg_net with schema extensions;

-- 1. Config table ------------------------------------------------------------

create table if not exists public.webhook_configs (
  id uuid primary key default gen_random_uuid(),
  webhook_type text not null unique
    check (char_length(webhook_type) between 1 and 64),
  webhook_url text not null
    check (webhook_url like 'https://%' and char_length(webhook_url) <= 2000),
  trigger_type text not null default 'signup'
    check (trigger_type in ('signup', 'manual')),
  delay_days integer not null default 0
    check (delay_days between 0 and 365),
  description text
    check (description is null or char_length(description) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists webhook_configs_touch_updated_at on public.webhook_configs;
create trigger webhook_configs_touch_updated_at
before update on public.webhook_configs
for each row execute function public.touch_updated_at();

alter table public.webhook_configs enable row level security;

drop policy if exists "Site admins manage webhook configs" on public.webhook_configs;
create policy "Site admins manage webhook configs"
  on public.webhook_configs for all
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- 2. Delivery log / queue ----------------------------------------------------

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  email text not null,
  full_name text,
  webhook_type text not null,
  webhook_url text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists webhook_deliveries_pending_idx
  on public.webhook_deliveries (scheduled_for)
  where sent_at is null;

alter table public.webhook_deliveries enable row level security;

drop policy if exists "Site admins manage webhook deliveries" on public.webhook_deliveries;
create policy "Site admins manage webhook deliveries"
  on public.webhook_deliveries for all
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- 3. Signup trigger ----------------------------------------------------------

create or replace function public.queue_signup_webhooks()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  cfg record;
begin
  for cfg in
    select webhook_type, webhook_url, delay_days
    from public.webhook_configs
    where is_active and trigger_type = 'signup'
  loop
    -- Per-config guard: one broken hook must never abort the signup
    -- transaction (this trigger runs inside handle_new_user's INSERT).
    begin
      if cfg.delay_days <= 0 then
        perform net.http_post(
          url := cfg.webhook_url,
          body := jsonb_build_object(
            'email', coalesce(new.email, ''),
            'full_name', coalesce(new.full_name, ''),
            'webhook_type', cfg.webhook_type,
            'user_id', new.id,
            'triggered_at', now()
          ),
          headers := '{"Content-Type": "application/json"}'::jsonb
        );
        insert into public.webhook_deliveries
          (profile_id, email, full_name, webhook_type, webhook_url, scheduled_for, sent_at)
        values
          (new.id, coalesce(new.email, ''), new.full_name, cfg.webhook_type,
           cfg.webhook_url, now(), now());
      else
        insert into public.webhook_deliveries
          (profile_id, email, full_name, webhook_type, webhook_url, scheduled_for)
        values
          (new.id, coalesce(new.email, ''), new.full_name, cfg.webhook_type,
           cfg.webhook_url, now() + make_interval(days => cfg.delay_days));
      end if;
    exception when others then
      null;
    end;
  end loop;
  return new;
end;
$fn$;

drop trigger if exists trg_queue_signup_webhooks on public.profiles;
create trigger trg_queue_signup_webhooks
after insert on public.profiles
for each row execute function public.queue_signup_webhooks();

-- 4. Delayed-delivery processor ---------------------------------------------

create or replace function public.process_due_webhook_deliveries()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  d record;
  processed integer := 0;
begin
  for d in
    select id, profile_id, email, full_name, webhook_type, webhook_url
    from public.webhook_deliveries
    where sent_at is null and scheduled_for <= now()
    order by scheduled_for
    limit 100
    for update skip locked
  loop
    begin
      perform net.http_post(
        url := d.webhook_url,
        body := jsonb_build_object(
          'email', d.email,
          'full_name', coalesce(d.full_name, ''),
          'webhook_type', d.webhook_type,
          'user_id', d.profile_id,
          'triggered_at', now()
        ),
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
      update public.webhook_deliveries
      set sent_at = now(), error_message = null
      where id = d.id;
      processed := processed + 1;
    exception when others then
      update public.webhook_deliveries
      set error_message = left(sqlerrm, 500)
      where id = d.id;
    end;
  end loop;
  return processed;
end;
$fn$;

revoke execute on function public.process_due_webhook_deliveries() from public;
revoke execute on function public.process_due_webhook_deliveries() from anon;
revoke execute on function public.process_due_webhook_deliveries() from authenticated;
-- pg_cron runs it as the owner; service_role keeps execute so server code and
-- integration tests can drive the processor on demand.
grant execute on function public.process_due_webhook_deliveries() to service_role;

-- pg_cron jobs run as `postgres`, which owns these tables — table owners
-- bypass RLS by default (same note as sample-online-users in
-- 20260727100000_admin_dashboard_presence.sql). Do NOT add
-- `force row level security` to either table.
do $$
begin
  perform cron.unschedule('process-webhook-deliveries')
  where exists (select 1 from cron.job where jobname = 'process-webhook-deliveries');
end
$$;

select cron.schedule(
  'process-webhook-deliveries',
  '*/5 * * * *',
  $job$ select public.process_due_webhook_deliveries() $job$
);
