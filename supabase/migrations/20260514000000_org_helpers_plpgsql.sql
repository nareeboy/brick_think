-- supabase/migrations/20260514000000_org_helpers_plpgsql.sql
-- Convert is_org_member and is_org_admin from LANGUAGE sql to LANGUAGE plpgsql.
--
-- Why: as defined in 20260508120000_init.sql these helpers are STABLE +
-- SECURITY DEFINER + LANGUAGE sql. PostgreSQL is allowed to inline STABLE
-- LANGUAGE sql functions into the surrounding query plan; when that happens
-- inside an RLS USING/WITH CHECK clause, the inlined body runs in the caller's
-- security context (not the function owner's), defeating the SECURITY DEFINER
-- intent. The observable symptom is policies that call is_org_member silently
-- returning false in policy context (and recursing on org_memberships when
-- SECURITY DEFINER is dropped). LANGUAGE plpgsql is opaque to the inliner, so
-- the function executes as a real call with SECURITY DEFINER honoured.
--
-- Function bodies are unchanged; only LANGUAGE changes.

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.org_memberships
    where org_id = p_org_id
      and profile_id = auth.uid()
  );
end;
$$;

create or replace function public.is_org_admin(p_org_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.org_memberships
    where org_id = p_org_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin')
  );
end;
$$;
