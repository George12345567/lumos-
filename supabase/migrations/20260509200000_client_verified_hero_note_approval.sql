-- ============================================================================
-- Client verified badge, hero notes, and client-side asset approval.
--
-- Idempotent. Does not loosen existing RLS. Clients can approve only their
-- own review-ready deliverables via the SECURITY DEFINER RPC below.
-- ============================================================================

create extension if not exists pgcrypto;

-- ─── Extend client verification fields ───────────────────────────────────────
alter table public.clients
  add column if not exists verified_by   uuid    references auth.users(id) on delete set null,
  add column if not exists verified_label text;

-- Backfill: clients that have is_verified = true but no verified_at
update public.clients
   set verified_at = coalesce(verified_at, updated_at, created_at)
 where is_verified is true
   and verified_at is null;

-- Admin can update client verification fields (uses existing has_admin_permission check)
-- RLS is already handled by the "admin manages clients" policy which covers all updates.

-- ─── Hero notes on client_notes ───────────────────────────────────────────────
alter table public.client_notes
  add column if not exists show_in_profile_hero boolean not null default false;

create index if not exists idx_client_notes_hero
  on public.client_notes(client_id, show_in_profile_hero, is_active)
  where show_in_profile_hero is true;

-- ─── Client-side deliverable approval RPC ────────────────────────────────────
-- Maps project service names to identity_category values.
create or replace function public.derive_identity_category(p_service_name text)
returns text
language plpgsql
immutable
security definer
set search_path = public, pg_temp
as $$
declare
  n text := lower(coalesce(p_service_name, ''));
begin
  if n ~ 'logo' then return 'logo_primary'; end if;
  if n ~ 'color|colour|palette' then return 'color_palette'; end if;
  if n ~ 'typograph|font' then return 'typography'; end if;
  if n ~ 'brand.?guide|style.?guide|guideline' then return 'brand_guide'; end if;
  if n ~ 'social.?kit|social.?media.?kit' then return 'social_media_kit'; end if;
  if n ~ 'social.?avatar|profile.?picture|profile.?photo' then return 'social_avatar'; end if;
  if n ~ 'social.?cover|cover.?image|cover.?photo|banner' then return 'social_cover'; end if;
  if n ~ 'icon|favicon|app.?icon' then return 'icon'; end if;
  if n ~ 'pattern|texture' then return 'pattern'; end if;
  if n ~ 'template|stationery' then return 'template'; end if;
  if n ~ 'brand|identity|visual' then return 'brand_asset'; end if;
  return null;
end;
$$;

create or replace function public.client_approve_deliverable(p_asset_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_asset          public.client_assets%rowtype;
  v_service        public.project_services%rowtype;
  v_project        public.projects%rowtype;
  v_now            timestamptz := now();
  v_identity_cat   text;
  v_publish        boolean := false;
  v_svc_progress   int;
  v_proj_progress  numeric;
  v_notif_title    text;
  v_notif_msg      text;
begin
  -- Fetch the asset, verify ownership
  select * into v_asset
    from public.client_assets
   where id = p_asset_id
     and client_id = auth.uid()
   for update;

  if v_asset.id is null then
    return jsonb_build_object('ok', false, 'error', 'asset_not_found');
  end if;

  if coalesce(v_asset.deliverable_status, '') != 'ready_for_review' then
    return jsonb_build_object('ok', false, 'error', 'not_in_review',
      'current_status', v_asset.deliverable_status);
  end if;

  -- Fetch linked service to determine identity category
  if v_asset.project_service_id is not null then
    select * into v_service
      from public.project_services
     where id = v_asset.project_service_id;
  end if;

  -- Determine whether to publish to identity
  v_identity_cat := coalesce(
    nullif(v_asset.identity_category, ''),
    case when v_service.id is not null then public.derive_identity_category(v_service.service_name) end
  );

  v_publish := coalesce(v_asset.identity_publish_on_delivery, false)
               or coalesce(v_asset.is_identity_asset, false)
               or v_identity_cat is not null;

  -- Update the asset
  update public.client_assets
     set deliverable_status        = 'approved',
         client_visible            = true,
         visibility                = 'client',
         is_downloadable           = true,
         placement_project_hub     = coalesce(placement_project_hub, true),
         placement_files_library   = coalesce(placement_files_library, true),
         placement_action_center   = false,
         is_identity_asset         = case when v_publish then true else is_identity_asset end,
         identity_category         = coalesce(identity_category, v_identity_cat),
         published_to_identity     = case when v_publish then true else published_to_identity end,
         published_to_identity_at  = case when v_publish and not coalesce(published_to_identity, false)
                                          then v_now
                                          else published_to_identity_at end,
         placement_brand_kit       = case when v_publish then true else placement_brand_kit end,
         updated_at                = v_now
   where id = p_asset_id;

  -- Recalculate service progress
  if v_service.id is not null then
    select
      case
        when count(*) = 0 then v_service.progress
        when sum(case when deliverable_status = 'approved' then 1 else 0 end) = count(*) then 100
        when sum(case when deliverable_status in ('approved', 'delivered') then 1 else 0 end) > 0
          then greatest(v_service.progress, 70)
        else greatest(v_service.progress, 40)
      end
      into v_svc_progress
      from public.client_assets
     where project_service_id = v_service.id
       and is_deliverable is true;

    update public.project_services
       set progress   = greatest(coalesce(progress, 0), v_svc_progress),
           status     = case
                          when greatest(coalesce(progress, 0), v_svc_progress) >= 100
                            then 'delivered'
                          when status in ('not_started', 'in_progress', 'review')
                            then 'in_progress'
                          else status
                        end,
           updated_at = v_now
     where id = v_service.id;
  end if;

  -- Recalculate project progress from services average
  if v_asset.project_id is not null then
    select avg(coalesce(progress, 0)) into v_proj_progress
      from public.project_services
     where project_id = v_asset.project_id;

    update public.projects
       set progress   = round(coalesce(v_proj_progress, 0))::int,
           updated_at = v_now
     where id = v_asset.project_id;

    select * into v_project from public.projects where id = v_asset.project_id;
  end if;

  -- Notification for the client
  v_notif_title := 'File approved';
  v_notif_msg   := coalesce(v_asset.file_name, 'Your file') || ' has been approved';
  if v_publish then
    v_notif_msg := v_notif_msg || ' and published to your Brand Kit';
  end if;

  insert into public.notifications (
    user_id, user_type, recipient_user_id, client_id,
    title, title_ar, message, message_ar,
    type, priority, entity_type, entity_id,
    action_type, action_id,
    action_url, is_read, created_at
  )
  values (
    auth.uid(), 'client', auth.uid(), auth.uid(),
    v_notif_title,
    case when v_publish then 'تم اعتماد الملف ونشره في حزمة الهوية'
         else 'تم اعتماد الملف' end,
    v_notif_msg,
    case when v_publish then coalesce(v_asset.file_name, 'الملف') || ' تم اعتماده ونشره في حزمة الهوية'
         else coalesce(v_asset.file_name, 'الملف') || ' تم اعتماده' end,
    case when v_publish then 'identity' else 'file' end,
    'normal',
    'client_asset', p_asset_id::text,
    'client_asset', p_asset_id::text,
    case when v_publish then '/profile?tab=identity' else '/profile?tab=files' end,
    false,
    v_now
  );

  -- Notification for admin
  insert into public.notifications (
    user_id, user_type, recipient_user_id,
    title, title_ar, message, message_ar,
    type, priority, entity_type, entity_id,
    action_type, action_id,
    action_url, is_read, created_at
  )
  select
    c.id, 'admin', c.id,
    'Client approved a deliverable',
    'اعتمد العميل ملفاً',
    coalesce(v_asset.file_name, 'A file') || ' approved by client',
    'تم اعتماد ' || coalesce(v_asset.file_name, 'ملف') || ' من قِبل العميل',
    'file', 'normal',
    'client_asset', p_asset_id::text,
    'client_asset', p_asset_id::text,
    '/lumos-admin?section=projects',
    false,
    v_now
  from public.clients c
  where c.role in ('admin', 'owner')
  limit 5;

  return jsonb_build_object(
    'ok',              true,
    'asset_id',        p_asset_id,
    'published',       v_publish,
    'identity_category', v_identity_cat,
    'service_progress', v_svc_progress,
    'project_progress', round(coalesce(v_proj_progress, 0))
  );
end;
$$;

revoke all on function public.client_approve_deliverable(uuid) from public;
grant execute on function public.client_approve_deliverable(uuid) to authenticated;

revoke all on function public.derive_identity_category(text) from public;
grant execute on function public.derive_identity_category(text) to authenticated;

notify pgrst, 'reload schema';
