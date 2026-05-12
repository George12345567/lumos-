-- ============================================================================
-- Client-side deliverable changes request RPC.
--
-- Allows a client to request changes on a review-ready deliverable, updating
-- its status and notifying the admin/team. Keeps the asset visible in
-- Project Hub and Files Library, removes it from Action Center, and
-- optionally moves the linked service back to 'in_progress'.
-- ============================================================================

create or replace function public.client_request_deliverable_changes(
  p_asset_id uuid,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_asset          public.client_assets%rowtype;
  v_service        public.project_services%rowtype;
  v_now            timestamptz := now();
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

  if coalesce(v_asset.deliverable_status, '') not in ('ready_for_review', 'needs_review', 'review') then
    return jsonb_build_object('ok', false, 'error', 'not_in_review',
      'current_status', v_asset.deliverable_status);
  end if;

  -- Update the asset: changes requested, still visible, remove from action center
  update public.client_assets
     set deliverable_status      = 'changes_requested',
         client_visible          = true,
         placement_action_center = false,
         updated_at              = v_now
   where id = p_asset_id;

  -- Move linked service status back to in_progress if it was in review
  if v_asset.project_service_id is not null then
    select * into v_service
      from public.project_services
     where id = v_asset.project_service_id;

    if v_service.id is not null and v_service.status in ('review', 'in_progress') then
      update public.project_services
         set status     = 'in_progress',
             updated_at = v_now
       where id = v_service.id;
    end if;
  end if;

  -- Notification for the client
  v_notif_title := 'Changes requested';
  v_notif_msg   := coalesce(v_asset.file_name, 'Your file') || ' — changes requested';

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
    'تم طلب تعديلات',
    v_notif_msg,
    coalesce(v_asset.file_name, 'الملف') || ' — تم طلب تعديلات',
    'file', 'normal',
    'client_asset', p_asset_id::text,
    'client_asset', p_asset_id::text,
    '/profile?tab=projects',
    false,
    v_now
  );

  -- Notification for admin
  v_notif_title := 'Client requested changes';
  v_notif_msg   := coalesce(v_asset.file_name, 'A file') || ' — client requested changes';

  if p_message is not null then
    v_notif_msg := v_notif_msg || ': ' || left(p_message, 200);
  end if;

  insert into public.notifications (
    user_id, user_type, recipient_user_id,
    title, title_ar, message, message_ar,
    type, priority, entity_type, entity_id,
    action_type, action_id,
    action_url, is_read, created_at
  )
  select
    c.id, 'admin', c.id,
    'Client requested changes on a deliverable',
    'طلب العميل تعديلات على ملف',
    v_notif_msg,
    'طلب العميل تعديلات على ' || coalesce(v_asset.file_name, 'ملف'),
    'file', 'high',
    'client_asset', p_asset_id::text,
    'client_asset', p_asset_id::text,
    '/lumos-admin?section=projects',
    false,
    v_now
  from public.clients c
  where c.role in ('admin', 'owner')
  limit 5;

  return jsonb_build_object(
    'ok', true,
    'asset_id', p_asset_id,
    'new_status', 'changes_requested'
  );
end;
$$;

revoke all on function public.client_request_deliverable_changes(uuid, text) from public;
grant execute on function public.client_request_deliverable_changes(uuid, text) to authenticated;

-- ─── Add changes_requested to deliverable_status check if not present ────

alter table public.client_assets drop constraint if exists client_assets_deliverable_status_check;
alter table public.client_assets
  add constraint client_assets_deliverable_status_check
  check (deliverable_status in ('draft', 'ready_for_review', 'approved', 'delivered', 'changes_requested'));

notify pgrst, 'reload schema';