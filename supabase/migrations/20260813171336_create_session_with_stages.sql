-- create_session_with_stages: transactional session + stages creation
-- ----------------------------------------------------------------------------
-- Tech-debt Tier 2 ("no transactions on multi-step writes"): the createSession
-- server action performed sessions INSERT then stages INSERT as two separate
-- statements over PostgREST. A failure between them (network blip, crash,
-- stages RLS surprise) left an orphaned 0-stage session that the UI can't
-- meaningfully render. Moving both writes into one plpgsql function makes the
-- pair atomic — any failure rolls the whole thing back.
--
-- SECURITY INVOKER on purpose: the inserts run under the caller's role so the
-- existing RLS policies stay the authorization boundary, exactly as before
-- (sessions INSERT allows facilitator_id = auth.uid(); stages INSERT allows
-- facilitator/org-admin). generate_join_code() is also invoker and keeps its
-- current semantics (collision probe over caller-visible sessions).
--
-- The stage list is passed in as jsonb so lib/sessions/stage-labels.ts stays
-- the single source of truth for canonical stage types, ordering and default
-- durations — the function does not duplicate that catalog.
create or replace function public.create_session_with_stages(
  p_org_id uuid,
  p_title text,
  p_stages jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
volatile
as $$
declare
  v_title text;
  v_session_id uuid;
begin
  v_title := btrim(coalesce(p_title, ''));
  if length(v_title) = 0 then
    raise exception 'create_session_with_stages: title is required';
  end if;
  if p_stages is null or jsonb_typeof(p_stages) <> 'array'
     or jsonb_array_length(p_stages) = 0 then
    raise exception 'create_session_with_stages: stages payload must be a non-empty array';
  end if;

  insert into public.sessions (org_id, facilitator_id, title, join_code)
  values (p_org_id, auth.uid(), v_title, public.generate_join_code())
  returning id into v_session_id;

  insert into public.stages (session_id, stage_type, position, duration_seconds)
  select
    v_session_id,
    (s ->> 'stage_type')::public.stage_type,
    (s ->> 'position')::int,
    (s ->> 'duration_seconds')::int
  from jsonb_array_elements(p_stages) as s;

  return v_session_id;
end;
$$;

-- Authenticated callers only — this is a signed-in facilitator flow. The
-- service_role grant keeps parity with how server actions may invoke RPCs.
revoke execute on function public.create_session_with_stages(uuid, text, jsonb) from public, anon;
grant  execute on function public.create_session_with_stages(uuid, text, jsonb) to authenticated, service_role;

comment on function public.create_session_with_stages(uuid, text, jsonb) is
  'Atomic session + stages creation for the createSession server action. SECURITY INVOKER: RLS on sessions/stages remains the authorization boundary.';
