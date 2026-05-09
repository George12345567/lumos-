-- Client Portal & Project Room redesign support.
--
-- Adds persisted project verification state, client-visible pinned notes,
-- explicit asset placement metadata, and tighter client asset RLS. The
-- migration is idempotent and does not duplicate or remove existing assets.

create extension if not exists pgcrypto;

-- ─── Verified project badge ────────────────────────────────────────────────
alter table public.projects
  add column if not exists client_verified_badge boolean not null default false,
  add column if not exists project_started_at timestamptz,
  add column if not exists verified_badge_label text;

create index if not exists idx_projects_client_verified_badge
  on public.projects(client_id, client_verified_badge)
  where client_verified_badge is true;

-- ─── Explicit client asset placements ──────────────────────────────────────
alter table public.client_assets
  add column if not exists client_visible boolean not null default true,
  add column if not exists placement_project_hub boolean,
  add column if not exists placement_action_center boolean,
  add column if not exists placement_files_library boolean,
  add column if not exists placement_brand_kit boolean;

update public.client_assets
   set client_visible = false
 where coalesce(visibility, 'client') = 'admin_only'
   and client_visible is distinct from false;

create index if not exists idx_client_assets_client_visibility_created
  on public.client_assets(client_id, client_visible, visibility, created_at desc);

create index if not exists idx_client_assets_project_visible
  on public.client_assets(project_id, client_visible, visibility)
  where project_id is not null;

create index if not exists idx_client_assets_brand_kit
  on public.client_assets(client_id, published_to_identity, is_identity_asset, identity_category)
  where coalesce(client_visible, true) is true;

-- Tighten client reads. Admin policies remain all-access; clients cannot read
-- admin-only or explicitly hidden asset metadata, including non-identity files.
alter table public.client_assets enable row level security;

drop policy if exists "client reads own assets" on public.client_assets;
create policy "client reads own assets"
  on public.client_assets for select
  to authenticated
  using (
    client_id = auth.uid()
    and coalesce(client_visible, true) is true
    and coalesce(visibility, 'client') = 'client'
    and coalesce(is_downloadable, true) is true
  );

-- ─── Client-visible pinned notes ────────────────────────────────────────────
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  body text not null,
  priority text not null default 'normal',
  placement text not null default 'home',
  is_active boolean not null default true,
  is_dismissible boolean not null default true,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  read_at timestamptz,
  constraint client_notes_priority_check check (priority in ('normal', 'important', 'urgent')),
  constraint client_notes_placement_check check (placement in ('home', 'project', 'both'))
);

alter table public.client_notes
  add column if not exists client_id uuid references public.clients(id) on delete cascade,
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists priority text not null default 'normal',
  add column if not exists placement text not null default 'home',
  add column if not exists is_active boolean not null default true,
  add column if not exists is_dismissible boolean not null default true,
  add column if not exists expires_at timestamptz,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists read_at timestamptz;

create index if not exists idx_client_notes_client_active_created
  on public.client_notes(client_id, is_active, created_at desc);

create index if not exists idx_client_notes_project_active
  on public.client_notes(project_id, is_active, created_at desc)
  where project_id is not null;

create or replace function public.set_client_notes_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_client_notes_updated_at on public.client_notes;
create trigger trg_client_notes_updated_at
before update on public.client_notes
for each row execute function public.set_client_notes_updated_at();

alter table public.client_notes enable row level security;

drop policy if exists "client reads own active client notes" on public.client_notes;
drop policy if exists "admin manages client notes" on public.client_notes;

create policy "client reads own active client notes"
  on public.client_notes for select
  to authenticated
  using (
    client_id = auth.uid()
    and is_active is true
    and (expires_at is null or expires_at > now())
  );

create policy "admin manages client notes"
  on public.client_notes for all
  to authenticated
  using (
    public.is_admin()
    or public.has_admin_permission('projects', 'edit')
    or public.has_admin_permission('clients', 'edit')
  )
  with check (
    public.is_admin()
    or public.has_admin_permission('projects', 'edit')
    or public.has_admin_permission('clients', 'edit')
  );

create or replace function public.mark_client_note_read(p_note_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated int := 0;
begin
  update public.client_notes
     set read_at = coalesce(read_at, now()),
         updated_at = now()
   where id = p_note_id
     and client_id = auth.uid()
     and is_active is true
     and is_dismissible is true
     and (expires_at is null or expires_at > now());

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.mark_client_note_read(uuid) from public;
grant execute on function public.mark_client_note_read(uuid) to authenticated;

alter table public.client_notes replica identity full;

do $$
begin
  perform 1
    from pg_publication_tables
   where pubname = 'supabase_realtime'
     and schemaname = 'public'
     and tablename = 'client_notes';

  if not found then
    alter publication supabase_realtime add table public.client_notes;
  end if;
end $$;

-- Keep future request conversions aligned with the new project_started_at
-- field without changing the existing idempotent conversion behavior.
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
    update public.projects
       set project_started_at = coalesce(project_started_at, started_at, v_now),
           updated_at = now()
     where id = v_existing;

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
    project_started_at,
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
