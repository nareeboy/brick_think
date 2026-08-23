-- create_workshop_with_session: transactional workshop + first session + stages
-- ----------------------------------------------------------------------------
-- The AI setup assistant's opening move creates a workshop, a session and the
-- five canonical stages. As three round-trips, a failure in the middle strands
-- a workshop with no session -- the same class of bug create_session_with_stages
-- was written to prevent one level down. One function, one transaction.
--
-- SECURITY DEFINER, deliberately, and unlike create_session_with_stages:
-- createOrgAction already inserts organisations via the service-role client
-- because the user-scoped path hits an RLS check that fails inconsistently on
-- freshly-created profiles -- exactly the first-time facilitator this function
-- serves. The authorization boundary is therefore the explicit auth.uid()
-- guard below, matching the application-level invariant createOrgAction relies
-- on (owner_id is always the authenticated caller).
--
-- The session and stage inserts are INLINE rather than delegated to
-- create_session_with_stages: a SECURITY INVOKER function called from a
-- DEFINER context runs with the definer's privileges, which would silently
-- bypass the sessions/stages RLS that function depends on.
--
-- The stage list arrives as jsonb so lib/sessions/stage-labels.ts stays the
-- single source of truth for stage types, ordering and default durations.
create or replace function public.create_workshop_with_session(
  p_name          text,
  p_slug          text,
  p_owner_id      uuid,
  p_session_title text,
  p_stages        jsonb
)
returns table (org_id uuid, session_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
volatile
as $$
declare
  v_name       text;
  v_title      text;
  v_org_id     uuid;
  v_session_id uuid;
begin
  -- The authorization boundary. Callers may only create workshops they own.
  if p_owner_id is null or auth.uid() is null or p_owner_id is distinct from auth.uid() then
    raise exception 'create_workshop_with_session: owner must be the authenticated caller';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  v_title := btrim(coalesce(p_session_title, ''));
  if length(v_name) = 0 then
    raise exception 'create_workshop_with_session: workshop name is required';
  end if;
  if length(v_title) = 0 then
    raise exception 'create_workshop_with_session: session title is required';
  end if;
  if p_stages is null or jsonb_typeof(p_stages) <> 'array'
     or jsonb_array_length(p_stages) = 0 then
    raise exception 'create_workshop_with_session: stages payload must be a non-empty array';
  end if;

  insert into public.organisations (name, slug, owner_id)
  values (v_name, btrim(p_slug), p_owner_id)
  returning id into v_org_id;

  -- The owner-membership trigger on organisations has now made the caller a
  -- member, so the session belongs to a workshop they are in.
  insert into public.sessions (org_id, facilitator_id, title, join_code)
  values (v_org_id, p_owner_id, v_title, public.generate_join_code())
  returning id into v_session_id;

  insert into public.stages (session_id, stage_type, position, duration_seconds)
  select
    v_session_id,
    (s ->> 'stage_type')::public.stage_type,
    (s ->> 'position')::int,
    (s ->> 'duration_seconds')::int
  from jsonb_array_elements(p_stages) as s;

  org_id := v_org_id;
  session_id := v_session_id;
  return next;
end;
$$;

revoke execute on function public.create_workshop_with_session(text, text, uuid, text, jsonb)
  from public, anon;
grant execute on function public.create_workshop_with_session(text, text, uuid, text, jsonb)
  to authenticated, service_role;

comment on function public.create_workshop_with_session(text, text, uuid, text, jsonb) is
  'Atomic workshop + first session + stages for the AI setup assistant. SECURITY DEFINER: the auth.uid() guard is the authorization boundary (mirrors createOrgAction''s service-role insert).';
