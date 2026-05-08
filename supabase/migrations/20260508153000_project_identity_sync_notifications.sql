-- ============================================================================
-- Project deliverable -> Client Identity sync and project notification hardening.
--
-- Idempotent. Extends the project workroom so a deliverable can be published to
-- Identity immediately or automatically when its service is delivered.
-- ============================================================================

alter table public.client_assets
  add column if not exists identity_publish_on_delivery boolean not null default false;

alter table public.client_assets drop constraint if exists client_assets_identity_category_check;
alter table public.client_assets
  add constraint client_assets_identity_category_check
  check (
    identity_category is null
    or identity_category in (
      'logo_primary',
      'logo_secondary',
      'logo_icon',
      'logo_monochrome',
      'logo_light',
      'logo_dark',
      'brand_guide',
      'color_palette',
      'typography',
      'social_media_kit',
      'social_avatar',
      'social_cover',
      'icon',
      'pattern',
      'template',
      'other'
    )
  );

create index if not exists idx_client_assets_identity_publish_on_delivery
  on public.client_assets(project_service_id, identity_publish_on_delivery)
  where identity_publish_on_delivery is true;

-- Employees with explicit Identity permissions can manage structured identity
-- rows. Admin/owner policies already exist in the identity migration.
drop policy if exists "team reads client identity" on public.client_identity;
drop policy if exists "team creates client identity" on public.client_identity;
drop policy if exists "team updates client identity" on public.client_identity;
drop policy if exists "team deletes client identity" on public.client_identity;

create policy "team reads client identity"
  on public.client_identity for select
  to authenticated
  using (
    public.has_admin_permission('identity', 'view')
    or public.has_admin_permission('clients', 'view')
  );

create policy "team creates client identity"
  on public.client_identity for insert
  to authenticated
  with check (public.has_admin_permission('identity', 'create'));

create policy "team updates client identity"
  on public.client_identity for update
  to authenticated
  using (public.has_admin_permission('identity', 'edit'))
  with check (public.has_admin_permission('identity', 'edit'));

create policy "team deletes client identity"
  on public.client_identity for delete
  to authenticated
  using (public.has_admin_permission('identity', 'delete'));

create or replace function public.apply_project_service_delivery_side_effects()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'delivered' and old.status is distinct from new.status then
    update public.client_assets
       set deliverable_status = 'delivered',
           client_visible = true,
           is_downloadable = true
     where project_service_id = new.id
       and coalesce(is_deliverable, false) is true
       and coalesce(visibility, 'client') = 'client';

    update public.client_assets
       set category = 'identity',
           is_identity_asset = true,
           published_to_identity = true,
           published_to_identity_at = coalesce(published_to_identity_at, now()),
           client_visible = true,
           visibility = 'client',
           is_downloadable = true
     where project_service_id = new.id
       and coalesce(identity_publish_on_delivery, false) is true
       and identity_category is not null
       and coalesce(visibility, 'client') = 'client';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_project_service_delivery_side_effects on public.project_services;
create trigger trg_project_service_delivery_side_effects
after update of status on public.project_services
for each row execute function public.apply_project_service_delivery_side_effects();

create or replace function public.notify_project_asset_delivery_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  was_delivered boolean := false;
  became_identity boolean := false;
begin
  if new.client_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    was_delivered :=
      coalesce(new.is_deliverable, false) is true
      and coalesce(new.client_visible, true) is true
      and coalesce(new.visibility, 'client') = 'client'
      and new.deliverable_status = 'delivered';

    became_identity :=
      coalesce(new.published_to_identity, false) is true
      and coalesce(new.is_identity_asset, false) is true
      and coalesce(new.visibility, 'client') = 'client';
  else
    was_delivered :=
      coalesce(new.is_deliverable, false) is true
      and coalesce(new.client_visible, true) is true
      and coalesce(new.visibility, 'client') = 'client'
      and new.deliverable_status = 'delivered'
      and (
        old.deliverable_status is distinct from new.deliverable_status
        or old.client_visible is distinct from new.client_visible
        or old.visibility is distinct from new.visibility
      );

    became_identity :=
      coalesce(new.published_to_identity, false) is true
      and coalesce(new.is_identity_asset, false) is true
      and coalesce(new.visibility, 'client') = 'client'
      and (
        old.published_to_identity is distinct from new.published_to_identity
        or old.is_identity_asset is distinct from new.is_identity_asset
      );
  end if;

  if was_delivered then
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
      'File delivered',
      'تم تسليم ملف',
      coalesce(nullif(new.file_name, ''), 'A project file') || ' is ready to download.',
      'أصبح أحد ملفات مشروعك جاهزاً للتحميل.',
      'file',
      'high',
      'client_asset',
      new.id::text,
      'client_asset',
      new.id::text,
      '/profile?tab=projects'
    );
  end if;

  if became_identity then
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
      'Identity updated',
      'تم تحديث الهوية',
      coalesce(nullif(new.file_name, ''), 'A brand asset') || ' was published to your Identity section.',
      'تم نشر أصل جديد في قسم هوية علامتك.',
      'identity',
      'high',
      'client_asset',
      new.id::text,
      'client_identity',
      new.id::text,
      '/profile?tab=identity'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_project_asset_delivery_event on public.client_assets;
create trigger trg_notify_project_asset_delivery_event
after insert or update of deliverable_status, client_visible, visibility, is_identity_asset, published_to_identity
on public.client_assets
for each row execute function public.notify_project_asset_delivery_event();

create or replace function public.notify_project_completed_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.client_id is null or new.status is distinct from 'completed' or old.status is not distinct from new.status then
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
    'Project completed',
    'اكتمل المشروع',
    coalesce(nullif(new.project_name, ''), 'Your Lumos project') || ' is complete.',
    'اكتمل مشروعك مع لوموس.',
    'project',
    'high',
    'project',
    new.id::text,
    'project',
    new.id::text,
    '/profile?tab=projects'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_project_completed_event on public.projects;
create trigger trg_notify_project_completed_event
after update of status on public.projects
for each row execute function public.notify_project_completed_event();
