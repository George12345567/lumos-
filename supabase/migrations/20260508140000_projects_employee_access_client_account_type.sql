-- ============================================================================
-- Projects, employee dashboard access, project deliverables, and client account
-- classification.
--
-- Idempotent. This migration avoids service-role use in the frontend and keeps
-- RLS closed by default: clients read only their own rows, owner/admin manage
-- all, and employees are admitted only when an active team_members row grants
-- the requested resource/action.
-- ============================================================================

create extension if not exists pgcrypto;

-- ─── Client account classification ───────────────────────────────────────────
alter table public.clients
  add column if not exists account_type text not null default 'client';

alter table public.clients drop constraint if exists clients_account_type_check;
alter table public.clients
  add constraint clients_account_type_check
  check (account_type in ('client', 'admin', 'team', 'internal'));

-- Existing installs only allowed role = client/admin. Expand safely for owner.
alter table public.clients drop constraint if exists clients_role_check;
alter table public.clients
  add constraint clients_role_check
  check (role in ('client', 'admin', 'owner'));

update public.clients
set account_type = case
  when role = 'owner' then 'admin'
  when role = 'admin' then 'admin'
  when id in (
    select tm.client_id
    from public.team_members tm
    where tm.client_id is not null
      and tm.is_active is true
  ) then 'team'
  else coalesce(nullif(account_type, ''), 'client')
end
where account_type is null
   or account_type = 'client'
   or role in ('owner', 'admin');

create index if not exists idx_clients_account_type on public.clients(account_type);

-- Owner is an admin for RLS purposes.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = auth.uid()
      and c.role in ('admin', 'owner')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ─── Team roles and permission helpers ───────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_type where typname = 'team_role_enum' and typnamespace = 'public'::regnamespace) then
    alter type public.team_role_enum add value if not exists 'owner';
    alter type public.team_role_enum add value if not exists 'support';
    alter type public.team_role_enum add value if not exists 'viewer';
  end if;
end$$;

alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members
  add constraint team_members_role_check
  check (role::text in ('owner', 'admin', 'manager', 'sales', 'designer', 'support', 'viewer'));

create or replace function public.current_team_member_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with claims as (
    select lower(coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email', '')) as email
  )
  select tm.id
  from public.team_members tm
  left join public.clients c on c.id = auth.uid()
  cross join claims
  where tm.is_active is true
    and (
      tm.user_id = auth.uid()
      or tm.client_id = auth.uid()
      or lower(coalesce(tm.email, '')) = claims.email
      or (c.email is not null and lower(coalesce(tm.email, '')) = lower(c.email))
    )
  order by
    case
      when tm.user_id = auth.uid() then 1
      when tm.client_id = auth.uid() then 2
      else 3
    end,
    tm.created_at asc nulls last
  limit 1;
$$;

create or replace function public.current_team_member_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select tm.role::text
  from public.team_members tm
  where tm.id = public.current_team_member_id()
    and tm.is_active is true
  limit 1;
$$;

create or replace function public.default_role_permission(
  p_role text,
  p_resource text,
  p_action text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  r text := case
    when p_resource = 'overview' then 'dashboard'
    when p_resource = 'audit' then 'audit_logs'
    else p_resource
  end;
  a text := case
    when p_action = 'upload' then 'create'
    when p_action = 'download' then 'view'
    else p_action
  end;
begin
  if p_role in ('owner', 'admin') then
    return true;
  end if;

  if p_role = 'manager' then
    return r in ('dashboard', 'requests', 'clients', 'projects', 'contacts', 'messages', 'files', 'team', 'discounts', 'audit_logs', 'statistics')
      and (
        a = 'view'
        or (r in ('requests', 'clients', 'projects', 'contacts', 'messages', 'files') and a in ('create', 'edit', 'assign', 'upload', 'download'))
        or (r = 'requests' and a = 'archive')
      );
  end if;

  if p_role = 'sales' then
    return (r in ('dashboard', 'requests', 'clients', 'contacts', 'messages', 'statistics') and a = 'view')
      or (r in ('requests', 'clients', 'contacts', 'messages') and a in ('create', 'edit', 'assign'));
  end if;

  if p_role = 'designer' then
    return (r in ('dashboard', 'clients', 'projects', 'files', 'identity', 'messages') and a = 'view')
      or (r in ('projects', 'files', 'identity', 'messages') and a in ('create', 'edit', 'upload', 'download'));
  end if;

  if p_role = 'support' then
    return (r in ('dashboard', 'clients', 'contacts', 'messages') and a = 'view')
      or (r in ('contacts', 'messages') and a in ('create', 'edit'));
  end if;

  if p_role = 'viewer' then
    return r in ('dashboard', 'requests', 'clients', 'projects', 'contacts', 'statistics')
      and a = 'view';
  end if;

  return false;
end;
$$;

create or replace function public.has_admin_permission(
  p_resource text,
  p_action text default 'view'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  tm record;
  explicit_value text;
  normalized_resource text := case
    when p_resource = 'overview' then 'dashboard'
    when p_resource = 'audit' then 'audit_logs'
    else p_resource
  end;
  normalized_action text := case
    when p_action = 'upload' then 'create'
    when p_action = 'download' then 'view'
    else p_action
  end;
begin
  if public.is_admin() then
    return true;
  end if;

  select *
    into tm
    from public.team_members
   where id = public.current_team_member_id()
     and is_active is true
   limit 1;

  if tm.id is null then
    return false;
  end if;

  explicit_value := tm.permissions #>> array[normalized_resource, normalized_action];
  if explicit_value is not null then
    return explicit_value::boolean;
  end if;

  return public.default_role_permission(tm.role::text, normalized_resource, normalized_action);
end;
$$;

revoke all on function public.current_team_member_id() from public;
revoke all on function public.current_team_member_role() from public;
revoke all on function public.default_role_permission(text, text, text) from public;
revoke all on function public.has_admin_permission(text, text) from public;
grant execute on function public.current_team_member_id() to authenticated;
grant execute on function public.current_team_member_role() to authenticated;
grant execute on function public.default_role_permission(text, text, text) to authenticated;
grant execute on function public.has_admin_permission(text, text) to authenticated;

-- ─── Project tables ──────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  pricing_request_id uuid references public.pricing_requests(id) on delete set null,
  invoice_number text,
  project_name text,
  package_name text,
  status text not null default 'active',
  payment_status text not null default 'unpaid',
  progress int not null default 0,
  total_amount numeric,
  currency text not null default 'EGP',
  started_at timestamptz,
  expected_delivery_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid references public.team_members(id) on delete set null,
  admin_notes text,
  client_notes text,
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_services (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  service_name text not null,
  service_key text,
  description text,
  status text not null default 'not_started',
  progress int not null default 0,
  assigned_to uuid references public.team_members(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  sort_order int not null default 0,
  admin_notes text,
  client_visible_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check
  check (status in ('active', 'paused', 'completed', 'cancelled'));

alter table public.projects drop constraint if exists projects_payment_status_check;
alter table public.projects
  add constraint projects_payment_status_check
  check (payment_status in ('unpaid', 'partial', 'paid', 'refunded'));

alter table public.projects drop constraint if exists projects_progress_check;
alter table public.projects
  add constraint projects_progress_check
  check (progress between 0 and 100);

alter table public.project_services drop constraint if exists project_services_status_check;
alter table public.project_services
  add constraint project_services_status_check
  check (status in ('not_started', 'in_progress', 'review', 'changes_requested', 'completed', 'delivered'));

alter table public.project_services drop constraint if exists project_services_progress_check;
alter table public.project_services
  add constraint project_services_progress_check
  check (progress between 0 and 100);

create unique index if not exists projects_pricing_request_id_unique
  on public.projects(pricing_request_id)
  where pricing_request_id is not null;

create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_assigned_to on public.projects(assigned_to);
create index if not exists idx_project_services_project_id on public.project_services(project_id);
create index if not exists idx_project_services_client_id on public.project_services(client_id);
create index if not exists idx_project_services_assigned_to on public.project_services(assigned_to);

alter table public.pricing_requests
  add column if not exists converted_project_id uuid references public.projects(id) on delete set null;

create or replace function public.set_project_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_project_updated_at();

create or replace function public.set_project_service_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'in_progress' and new.started_at is null then
    new.started_at = now();
  end if;
  if new.status in ('completed', 'delivered') and new.completed_at is null then
    new.completed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_services_updated_at on public.project_services;
create trigger trg_project_services_updated_at
  before update on public.project_services
  for each row execute function public.set_project_service_updated_at();

create or replace function public.recalculate_project_progress(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  avg_progress int;
begin
  select coalesce(round(avg(progress))::int, 0)
    into avg_progress
    from public.project_services
   where project_id = p_project_id;

  update public.projects
     set progress = greatest(0, least(100, avg_progress)),
         updated_at = now()
   where id = p_project_id;
end;
$$;

create or replace function public.recalculate_project_progress_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.recalculate_project_progress(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recalculate_project_progress on public.project_services;
create trigger trg_recalculate_project_progress
  after insert or update or delete on public.project_services
  for each row execute function public.recalculate_project_progress_trigger();

-- ─── Project deliverable metadata on client_assets ───────────────────────────
alter table public.client_assets
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists project_service_id uuid references public.project_services(id) on delete set null,
  add column if not exists is_deliverable boolean not null default false,
  add column if not exists deliverable_status text not null default 'draft',
  add column if not exists published_to_identity boolean not null default false,
  add column if not exists published_to_identity_at timestamptz,
  add column if not exists client_visible boolean not null default true;

alter table public.client_assets drop constraint if exists client_assets_deliverable_status_check;
alter table public.client_assets
  add constraint client_assets_deliverable_status_check
  check (deliverable_status in ('draft', 'ready_for_review', 'approved', 'delivered'));

create index if not exists idx_client_assets_project_id on public.client_assets(project_id);
create index if not exists idx_client_assets_project_service_id on public.client_assets(project_service_id);
create index if not exists idx_client_assets_deliverable_visibility
  on public.client_assets(client_id, project_id, project_service_id, is_deliverable, client_visible);

-- ─── Atomic request → project conversion ─────────────────────────────────────
create or replace function public.create_project_from_pricing_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.pricing_requests%rowtype;
  v_existing uuid;
  v_project_id uuid;
  v_now timestamptz := now();
  v_service jsonb;
  v_order int := 0;
  v_service_name text;
begin
  if not (
    public.is_admin()
    or (public.has_admin_permission('projects', 'create') and public.has_admin_permission('requests', 'edit'))
  ) then
    raise exception 'not_allowed';
  end if;

  select *
    into v_request
    from public.pricing_requests
   where id = p_request_id
   limit 1;

  if v_request.id is null then
    raise exception 'pricing_request_not_found';
  end if;

  select id
    into v_existing
    from public.projects
   where pricing_request_id = p_request_id
   limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.projects (
    client_id,
    pricing_request_id,
    invoice_number,
    project_name,
    package_name,
    status,
    payment_status,
    progress,
    total_amount,
    currency,
    started_at,
    assigned_to,
    client_notes,
    status_history,
    created_at,
    updated_at
  )
  values (
    v_request.client_id,
    v_request.id,
    v_request.invoice_number,
    coalesce(nullif(v_request.company_name, ''), nullif(v_request.guest_name, ''), 'Lumos') || ' Project',
    v_request.package_name,
    'active',
    'unpaid',
    0,
    v_request.estimated_total,
    coalesce(nullif(v_request.price_currency, ''), 'EGP'),
    v_now,
    v_request.assigned_to,
    v_request.request_notes,
    jsonb_build_array(jsonb_build_object(
      'status', 'active',
      'changed_at', v_now,
      'changed_by', auth.uid(),
      'note', 'Project created from pricing request'
    )),
    v_now,
    v_now
  )
  returning id into v_project_id;

  for v_service in
    select value from jsonb_array_elements(coalesce(to_jsonb(v_request.selected_services), '[]'::jsonb))
  loop
    v_order := v_order + 1;
    v_service_name := coalesce(nullif(v_service->>'name', ''), nullif(v_service->>'nameEn', ''), nullif(v_service->>'id', ''), 'Service ' || v_order);

    insert into public.project_services (
      project_id,
      client_id,
      service_name,
      service_key,
      description,
      status,
      progress,
      assigned_to,
      sort_order,
      created_at,
      updated_at
    )
    values (
      v_project_id,
      v_request.client_id,
      v_service_name,
      nullif(v_service->>'id', ''),
      nullif(coalesce(v_service->>'category', v_service->>'description'), ''),
      'not_started',
      0,
      v_request.assigned_to,
      v_order,
      v_now,
      v_now
    );
  end loop;

  update public.pricing_requests
     set status = 'converted',
         converted_project_id = v_project_id,
         updated_at = v_now,
         status_history = coalesce(status_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
           'status', 'converted',
           'old_status', v_request.status,
           'new_status', 'converted',
           'changed_at', v_now,
           'changed_by', auth.uid(),
           'note', 'Project created from request'
         ))
   where id = v_request.id;

  if v_request.client_id is not null then
    insert into public.notifications (
      user_id,
      user_type,
      recipient_user_id,
      client_id,
      title,
      title_ar,
      message,
      message_ar,
      type,
      priority,
      entity_type,
      entity_id,
      action_type,
      action_id,
      action_url
    )
    values (
      v_request.client_id,
      'client',
      v_request.client_id,
      v_request.client_id,
      'Your project has started',
      'بدأ مشروعك',
      'Lumos has started your project workspace.',
      'بدأ فريق لوموس مساحة عمل مشروعك.',
      'project',
      'high',
      'project',
      v_project_id::text,
      'project',
      v_project_id::text,
      '/profile?tab=projects'
    );
  end if;

  return v_project_id;
end;
$$;

revoke all on function public.create_project_from_pricing_request(uuid) from public;
grant execute on function public.create_project_from_pricing_request(uuid) to authenticated;

-- ─── Project notifications ───────────────────────────────────────────────────
create or replace function public.notify_project_service_status_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.client_id is null or old.status is not distinct from new.status then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    user_type,
    recipient_user_id,
    client_id,
    title,
    title_ar,
    message,
    message_ar,
    type,
    priority,
    entity_type,
    entity_id,
    action_type,
    action_id,
    action_url
  )
  values (
    new.client_id,
    'client',
    new.client_id,
    new.client_id,
    'Service status updated',
    'تم تحديث حالة خدمة',
    new.service_name || ' is now ' || replace(new.status, '_', ' ') || '.',
    'تم تحديث حالة خدمة في مشروعك.',
    'project',
    case when new.status = 'delivered' then 'high' else 'normal' end,
    'project_service',
    new.id::text,
    'project_service',
    new.id::text,
    '/profile?tab=projects'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_project_service_status_event on public.project_services;
create trigger trg_notify_project_service_status_event
after update of status on public.project_services
for each row execute function public.notify_project_service_status_event();

-- ─── RLS policies ────────────────────────────────────────────────────────────
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
  using (
    public.has_admin_permission('projects', 'view')
    and (
      public.current_team_member_role() is distinct from 'designer'
      or assigned_to = public.current_team_member_id()
      or exists (
        select 1
        from public.project_services ps
        where ps.project_id = projects.id
          and ps.assigned_to = public.current_team_member_id()
      )
    )
  );

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
  using (
    public.has_admin_permission('projects', 'view')
    and (
      public.current_team_member_role() is distinct from 'designer'
      or assigned_to = public.current_team_member_id()
      or exists (
        select 1
        from public.projects p
        where p.id = project_services.project_id
          and p.assigned_to = public.current_team_member_id()
      )
    )
  );

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

-- Employee policies for existing operational tables. These complement, not
-- replace, the existing client/admin policies.
drop policy if exists "team reads external clients" on public.clients;
drop policy if exists "team updates external clients" on public.clients;

create policy "team reads external clients"
  on public.clients for select
  to authenticated
  using (
    public.has_admin_permission('clients', 'view')
    and account_type = 'client'
  );

create policy "team updates external clients"
  on public.clients for update
  to authenticated
  using (
    public.has_admin_permission('clients', 'edit')
    and account_type = 'client'
  )
  with check (
    public.has_admin_permission('clients', 'edit')
    and account_type = 'client'
    and role = 'client'
  );

drop policy if exists "team reads pricing requests" on public.pricing_requests;
drop policy if exists "team updates pricing requests" on public.pricing_requests;
drop policy if exists "team deletes pricing requests" on public.pricing_requests;

create policy "team reads pricing requests"
  on public.pricing_requests for select
  to authenticated
  using (public.has_admin_permission('requests', 'view'));

create policy "team updates pricing requests"
  on public.pricing_requests for update
  to authenticated
  using (public.has_admin_permission('requests', 'edit'))
  with check (public.has_admin_permission('requests', 'edit'));

create policy "team deletes pricing requests"
  on public.pricing_requests for delete
  to authenticated
  using (public.has_admin_permission('requests', 'delete'));

drop policy if exists "team reads orders" on public.orders;
drop policy if exists "team updates orders" on public.orders;

create policy "team reads orders"
  on public.orders for select
  to authenticated
  using (public.has_admin_permission('projects', 'view'));

create policy "team updates orders"
  on public.orders for update
  to authenticated
  using (public.has_admin_permission('projects', 'edit'))
  with check (public.has_admin_permission('projects', 'edit'));

-- Tighten client asset visibility and add employee policies.
drop policy if exists "client reads own assets" on public.client_assets;
create policy "client reads own assets"
  on public.client_assets for select
  to authenticated
  using (
    client_id = auth.uid()
    and coalesce(client_visible, true) is true
    and coalesce(visibility, 'client') = 'client'
    and (
      coalesce(is_identity_asset, false) is false
      or (
        is_identity_asset is true
        and coalesce(is_downloadable, true) is true
      )
    )
  );

drop policy if exists "team reads client assets" on public.client_assets;
drop policy if exists "team inserts client assets" on public.client_assets;
drop policy if exists "team updates client assets" on public.client_assets;
drop policy if exists "team deletes client assets" on public.client_assets;

create policy "team reads client assets"
  on public.client_assets for select
  to authenticated
  using (
    public.has_admin_permission('files', 'view')
    or public.has_admin_permission('projects', 'view')
    or public.has_admin_permission('identity', 'view')
  );

create policy "team inserts client assets"
  on public.client_assets for insert
  to authenticated
  with check (
    public.has_admin_permission('files', 'create')
    or public.has_admin_permission('projects', 'create')
    or public.has_admin_permission('identity', 'create')
  );

create policy "team updates client assets"
  on public.client_assets for update
  to authenticated
  using (
    public.has_admin_permission('files', 'edit')
    or public.has_admin_permission('projects', 'edit')
    or public.has_admin_permission('identity', 'edit')
  )
  with check (
    public.has_admin_permission('files', 'edit')
    or public.has_admin_permission('projects', 'edit')
    or public.has_admin_permission('identity', 'edit')
  );

create policy "team deletes client assets"
  on public.client_assets for delete
  to authenticated
  using (
    public.has_admin_permission('files', 'delete')
    or public.has_admin_permission('projects', 'delete')
    or public.has_admin_permission('identity', 'delete')
  );

-- Storage permissions for employees who can upload/read project or file assets.
drop policy if exists "client-assets team read" on storage.objects;
drop policy if exists "client-assets team insert" on storage.objects;
drop policy if exists "client-assets team update" on storage.objects;
drop policy if exists "client-assets team delete" on storage.objects;

create policy "client-assets team read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-assets'
    and (
      public.has_admin_permission('files', 'view')
      or public.has_admin_permission('projects', 'view')
      or public.has_admin_permission('identity', 'view')
    )
  );

create policy "client-assets team insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'client-assets'
    and (
      public.has_admin_permission('files', 'create')
      or public.has_admin_permission('projects', 'create')
      or public.has_admin_permission('identity', 'create')
    )
  );

create policy "client-assets team update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'client-assets'
    and (
      public.has_admin_permission('files', 'edit')
      or public.has_admin_permission('projects', 'edit')
      or public.has_admin_permission('identity', 'edit')
    )
  )
  with check (
    bucket_id = 'client-assets'
    and (
      public.has_admin_permission('files', 'edit')
      or public.has_admin_permission('projects', 'edit')
      or public.has_admin_permission('identity', 'edit')
    )
  );

create policy "client-assets team delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'client-assets'
    and (
      public.has_admin_permission('files', 'delete')
      or public.has_admin_permission('projects', 'delete')
      or public.has_admin_permission('identity', 'delete')
    )
  );

-- Realtime fanout.
do $$
begin
  perform 1 from pg_publication_tables
   where pubname = 'supabase_realtime'
     and schemaname = 'public'
     and tablename = 'projects';
  if not found then
    execute 'alter publication supabase_realtime add table public.projects';
  end if;

  perform 1 from pg_publication_tables
   where pubname = 'supabase_realtime'
     and schemaname = 'public'
     and tablename = 'project_services';
  if not found then
    execute 'alter publication supabase_realtime add table public.project_services';
  end if;
end$$;
