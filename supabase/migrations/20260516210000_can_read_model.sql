-- Worker-callable membership helpers. The worker holds a service-role
-- connection but no Supabase auth context, so it cannot use the existing
-- auth.uid()-based helpers. These parametric variants are revoked from
-- everyone except service_role.

create or replace function public.is_org_member_for(
  p_profile_id uuid,
  p_org_id uuid
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.org_memberships m
    where m.profile_id = p_profile_id
      and m.org_id = p_org_id
  );
$$;

revoke execute on function public.is_org_member_for(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.is_org_member_for(uuid, uuid) to service_role;

create or replace function public.can_read_model(
  p_profile_id uuid,
  p_model_id uuid
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.models m
    where m.id = p_model_id
      and m.deleted_at is null
      and (
        m.owner_profile_id = p_profile_id
        or (m.org_id is not null and public.is_org_member_for(p_profile_id, m.org_id))
        or (m.session_id is not null and exists (
          select 1
          from public.sessions s
          where s.id = m.session_id
            and public.is_org_member_for(p_profile_id, s.org_id)
        ))
      )
  );
$$;

revoke execute on function public.can_read_model(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.can_read_model(uuid, uuid) to service_role;

comment on function public.can_read_model(uuid, uuid) is
  'Worker-callable. Mirrors the SELECT RLS predicate on public.models. service_role only.';
