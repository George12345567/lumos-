-- Profile/projects/Telegram hardening for May 8, 2026.
--
-- Idempotent production fixes:
-- - detach existing duplicate projects from the same pricing request before
--   enforcing the unique pricing_request_id index;
-- - make request -> project conversion transactional/idempotent under repeated clicks;
-- - add a safe admin-only permanent project delete RPC;
-- - add strictly-RLS-protected Telegram notification integration settings.

-- ─── Duplicate project repair ───────────────────────────────────────────────
with ranked_projects as (
  select
    id,
    pricing_request_id,
    first_value(id) over (
      partition by pricing_request_id
      order by created_at asc nulls last, id asc
    ) as keep_id,
    row_number() over (
      partition by pricing_request_id
      order by created_at asc nulls last, id asc
    ) as row_number
  from public.projects
  where pricing_request_id is not null
),
duplicates as (
  select id, pricing_request_id, keep_id
  from ranked_projects
  where row_number > 1
)
update public.projects p
   set pricing_request_id = null,
       admin_notes = trim(both from concat_ws(
         E'\n',
         nullif(p.admin_notes, ''),
         'Duplicate pricing_request_id detached by migration 20260508183000. Kept project: ' || d.keep_id::text
       )),
       status_history = coalesce(p.status_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
         'status', p.status,
         'changed_at', now(),
         'changed_by', auth.uid(),
         'note', 'Duplicate pricing_request_id detached; original request now points to kept project.',
         'kept_project_id', d.keep_id
       )),
       updated_at = now()
  from duplicates d
 where p.id = d.id;

with kept_projects as (
  select distinct on (pricing_request_id)
    pricing_request_id,
    id as keep_id
  from public.projects
  where pricing_request_id is not null
  order by pricing_request_id, created_at asc nulls last, id asc
)
update public.pricing_requests pr
   set converted_project_id = kp.keep_id,
       status = 'converted',
       updated_at = now()
  from kept_projects kp
 where pr.id = kp.pricing_request_id
   and pr.converted_project_id is distinct from kp.keep_id;

create unique index if not exists projects_pricing_request_id_unique
  on public.projects(pricing_request_id)
  where pricing_request_id is not null;

-- ─── Idempotent request → project conversion RPC ────────────────────────────
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
  v_service_key text;
begin
  if not (
    public.is_admin()
    or (public.has_admin_permission('projects', 'create') and public.has_admin_permission('requests', 'edit'))
  ) then
    raise exception 'not_allowed';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_request_id::text));

  select *
    into v_request
    from public.pricing_requests
   where id = p_request_id
   for update;

  if v_request.id is null then
    raise exception 'pricing_request_not_found';
  end if;

  if v_request.converted_project_id is not null then
    select id
      into v_existing
      from public.projects
     where id = v_request.converted_project_id
     limit 1;

    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  select id
    into v_existing
    from public.projects
   where pricing_request_id = p_request_id
   order by created_at asc nulls last, id asc
   limit 1;

  if v_existing is not null then
    update public.pricing_requests
       set status = 'converted',
           converted_project_id = v_existing,
           updated_at = v_now
     where id = p_request_id;

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
    v_service_key := nullif(v_service->>'id', '');
    v_service_name := coalesce(
      nullif(v_service->>'name', ''),
      nullif(v_service->>'nameEn', ''),
      v_service_key,
      'Service ' || v_order
    );

    if v_service_key is null or not exists (
      select 1
      from public.project_services
      where project_id = v_project_id
        and service_key = v_service_key
    ) then
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
        v_service_key,
        nullif(coalesce(v_service->>'category', v_service->>'description'), ''),
        'not_started',
        0,
        v_request.assigned_to,
        v_order,
        v_now,
        v_now
      );
    end if;
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

-- ─── Permanent project delete RPC ───────────────────────────────────────────
create or replace function public.delete_project_permanently(
  p_project_id uuid,
  p_invoice_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project public.projects%rowtype;
  v_detached_assets int := 0;
begin
  if not (public.is_admin() or public.has_admin_permission('projects', 'delete')) then
    return jsonb_build_object('success', false, 'error', 'not_allowed');
  end if;

  select *
    into v_project
    from public.projects
   where id = p_project_id
   for update;

  if v_project.id is null then
    return jsonb_build_object('success', false, 'error', 'project_not_found');
  end if;

  if coalesce(v_project.invoice_number, '') = ''
     or trim(coalesce(p_invoice_confirmation, '')) <> v_project.invoice_number then
    return jsonb_build_object('success', false, 'error', 'invoice_confirmation_mismatch');
  end if;

  select count(*)
    into v_detached_assets
    from public.client_assets
   where project_id = p_project_id
      or project_service_id in (
        select id from public.project_services where project_id = p_project_id
      );

  delete from public.projects
   where id = p_project_id;

  return jsonb_build_object(
    'success', true,
    'deleted_project_id', p_project_id,
    'detached_assets', v_detached_assets
  );
end;
$$;

revoke all on function public.delete_project_permanently(uuid, text) from public;
grant execute on function public.delete_project_permanently(uuid, text) to authenticated;

-- ─── Telegram notification integration settings ─────────────────────────────
create table if not exists public.notification_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  client_id uuid references public.clients(id) on delete cascade,
  provider text not null default 'telegram',
  bot_token text,
  chat_id text not null default '',
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_integrations_provider_check check (provider in ('telegram'))
);

alter table public.notification_integrations
  add column if not exists user_id uuid,
  add column if not exists client_id uuid references public.clients(id) on delete cascade,
  add column if not exists provider text not null default 'telegram',
  add column if not exists bot_token text,
  add column if not exists chat_id text not null default '',
  add column if not exists enabled boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists notification_integrations_provider_user_unique
  on public.notification_integrations(provider, user_id);

create index if not exists idx_notification_integrations_client_provider
  on public.notification_integrations(client_id, provider);

create or replace function public.set_notification_integrations_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_integrations_updated_at on public.notification_integrations;
create trigger trg_notification_integrations_updated_at
before update on public.notification_integrations
for each row execute function public.set_notification_integrations_updated_at();

alter table public.notification_integrations enable row level security;

drop policy if exists "users read own notification integrations" on public.notification_integrations;
drop policy if exists "users create own notification integrations" on public.notification_integrations;
drop policy if exists "users update own notification integrations" on public.notification_integrations;
drop policy if exists "users delete own notification integrations" on public.notification_integrations;
drop policy if exists "admin manages notification integrations" on public.notification_integrations;

create policy "users read own notification integrations"
  on public.notification_integrations for select
  to authenticated
  using (auth.uid() = user_id or auth.uid() = client_id);

create policy "users create own notification integrations"
  on public.notification_integrations for insert
  to authenticated
  with check (auth.uid() = user_id or auth.uid() = client_id);

create policy "users update own notification integrations"
  on public.notification_integrations for update
  to authenticated
  using (auth.uid() = user_id or auth.uid() = client_id)
  with check (auth.uid() = user_id or auth.uid() = client_id);

create policy "users delete own notification integrations"
  on public.notification_integrations for delete
  to authenticated
  using (auth.uid() = user_id or auth.uid() = client_id);

create policy "admin manages notification integrations"
  on public.notification_integrations for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
