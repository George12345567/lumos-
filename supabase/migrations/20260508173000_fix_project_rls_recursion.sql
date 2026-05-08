-- Fix PostgREST 500s caused by recursive project/project_services SELECT policies.
-- No public table access is added. The helper functions run as SECURITY DEFINER
-- and preserve the existing admin/team/client visibility model.

create or replace function public.team_can_read_project(
  p_project_id uuid,
  p_project_assigned_to uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_member_id uuid := public.current_team_member_id();
  v_team_role text := public.current_team_member_role();
begin
  if not public.has_admin_permission('projects', 'view') then
    return false;
  end if;

  if v_team_role is distinct from 'designer' then
    return true;
  end if;

  if p_project_assigned_to is not null and p_project_assigned_to = v_team_member_id then
    return true;
  end if;

  return exists (
    select 1
    from public.project_services ps
    where ps.project_id = p_project_id
      and ps.assigned_to = v_team_member_id
  );
end;
$$;

create or replace function public.team_can_read_project_service(
  p_project_id uuid,
  p_service_assigned_to uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_member_id uuid := public.current_team_member_id();
  v_team_role text := public.current_team_member_role();
begin
  if not public.has_admin_permission('projects', 'view') then
    return false;
  end if;

  if v_team_role is distinct from 'designer' then
    return true;
  end if;

  if p_service_assigned_to is not null and p_service_assigned_to = v_team_member_id then
    return true;
  end if;

  return exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.assigned_to = v_team_member_id
  );
end;
$$;

revoke all on function public.team_can_read_project(uuid, uuid) from public;
revoke all on function public.team_can_read_project_service(uuid, uuid) from public;
grant execute on function public.team_can_read_project(uuid, uuid) to authenticated;
grant execute on function public.team_can_read_project_service(uuid, uuid) to authenticated;

alter table public.projects enable row level security;
alter table public.project_services enable row level security;

drop policy if exists "client reads own projects" on public.projects;
drop policy if exists "admin manages projects" on public.projects;
drop policy if exists "team reads permitted projects" on public.projects;
drop policy if exists "team creates projects" on public.projects;
drop policy if exists "team updates permitted projects" on public.projects;
drop policy if exists "team deletes projects" on public.projects;

create policy "client reads own projects"
  on public.projects for select
  to authenticated
  using (client_id = auth.uid());

create policy "admin manages projects"
  on public.projects for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "team reads permitted projects"
  on public.projects for select
  to authenticated
  using (public.team_can_read_project(id, assigned_to));

create policy "team creates projects"
  on public.projects for insert
  to authenticated
  with check (public.has_admin_permission('projects', 'create'));

create policy "team updates permitted projects"
  on public.projects for update
  to authenticated
  using (public.has_admin_permission('projects', 'edit'))
  with check (public.has_admin_permission('projects', 'edit'));

create policy "team deletes projects"
  on public.projects for delete
  to authenticated
  using (public.has_admin_permission('projects', 'delete'));

drop policy if exists "client reads own project services" on public.project_services;
drop policy if exists "admin manages project services" on public.project_services;
drop policy if exists "team reads permitted project services" on public.project_services;
drop policy if exists "team creates project services" on public.project_services;
drop policy if exists "team updates permitted project services" on public.project_services;
drop policy if exists "team deletes project services" on public.project_services;

create policy "client reads own project services"
  on public.project_services for select
  to authenticated
  using (client_id = auth.uid());

create policy "admin manages project services"
  on public.project_services for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "team reads permitted project services"
  on public.project_services for select
  to authenticated
  using (public.team_can_read_project_service(project_id, assigned_to));

create policy "team creates project services"
  on public.project_services for insert
  to authenticated
  with check (public.has_admin_permission('projects', 'create'));

create policy "team updates permitted project services"
  on public.project_services for update
  to authenticated
  using (public.has_admin_permission('projects', 'edit'))
  with check (public.has_admin_permission('projects', 'edit'));

create policy "team deletes project services"
  on public.project_services for delete
  to authenticated
  using (public.has_admin_permission('projects', 'delete'));

notify pgrst, 'reload schema';
