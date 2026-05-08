-- Notification Center: unified, RLS-safe notifications for client and admin UI.
-- This migration extends the existing notifications table without replacing
-- legacy pricing-request notification columns.

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_type text not null default 'client',
  title text not null,
  title_ar text,
  message text not null,
  message_ar text,
  type text not null default 'general',
  priority text not null default 'normal',
  action_type text,
  action_id text,
  action_url text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists recipient_user_id uuid;
alter table public.notifications add column if not exists client_id uuid references public.clients(id) on delete cascade;
alter table public.notifications add column if not exists actor_id uuid;
alter table public.notifications add column if not exists actor_name text;
alter table public.notifications add column if not exists entity_type text;
alter table public.notifications add column if not exists entity_id text;
alter table public.notifications add column if not exists action_type text;
alter table public.notifications add column if not exists action_id text;
alter table public.notifications add column if not exists action_url text;
alter table public.notifications add column if not exists read_at timestamptz;

alter table public.notifications
  alter column is_read set default false,
  alter column priority set default 'normal',
  alter column created_at set default now();

update public.notifications
set
  recipient_user_id = coalesce(recipient_user_id, case when user_type = 'client' then user_id else null end),
  client_id = coalesce(client_id, case when user_type = 'client' then user_id else client_id end),
  entity_type = coalesce(entity_type, nullif(action_type, '')),
  entity_id = coalesce(entity_id, nullif(action_id, ''))
where recipient_user_id is null
   or entity_type is null
   or entity_id is null
   or (client_id is null and user_type = 'client');

alter table public.notifications drop constraint if exists notifications_user_type_check;
alter table public.notifications add constraint notifications_user_type_check
  check (user_type in ('client', 'team_member', 'admin'));

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'message',
    'file',
    'identity',
    'project',
    'request',
    'account',
    'security',
    'system',
    'pricing_request_new',
    'pricing_request_status_changed',
    'pricing_request_assigned',
    'pricing_request_approved',
    'pricing_request_rejected',
    'pricing_request_converted',
    'pricing_request_follow_up',
    'general'
  ));

alter table public.notifications drop constraint if exists notifications_priority_check;
alter table public.notifications add constraint notifications_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

create index if not exists idx_notifications_user_read_created
  on public.notifications(user_id, user_type, is_read, created_at desc);

create index if not exists idx_notifications_client_created
  on public.notifications(client_id, created_at desc);

create index if not exists idx_notifications_entity
  on public.notifications(entity_type, entity_id);

alter table public.notifications enable row level security;

drop policy if exists "client reads own notifications" on public.notifications;
drop policy if exists "client updates own notifications" on public.notifications;
drop policy if exists "client inserts own notifications" on public.notifications;
drop policy if exists "admin manages notifications" on public.notifications;

create policy "client reads own notifications"
  on public.notifications for select
  to authenticated
  using (
    user_type = 'client'
    and (
      user_id = auth.uid()
      or recipient_user_id = auth.uid()
      or client_id = auth.uid()
    )
  );

create policy "client updates own notifications"
  on public.notifications for update
  to authenticated
  using (
    user_type = 'client'
    and (
      user_id = auth.uid()
      or recipient_user_id = auth.uid()
      or client_id = auth.uid()
    )
  )
  with check (
    user_type = 'client'
    and (
      user_id = auth.uid()
      or recipient_user_id = auth.uid()
      or client_id = auth.uid()
    )
  );

-- Keeps legacy client-side pricing-request acknowledgements working without
-- permitting cross-client writes.
create policy "client inserts own notifications"
  on public.notifications for insert
  to authenticated
  with check (
    user_type = 'client'
    and user_id = auth.uid()
    and coalesce(recipient_user_id, auth.uid()) = auth.uid()
    and coalesce(client_id, auth.uid()) = auth.uid()
  );

create policy "admin manages notifications"
  on public.notifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.notifications replica identity full;

do $$
begin
  perform 1
    from pg_publication_tables
   where pubname = 'supabase_realtime'
     and schemaname = 'public'
     and tablename = 'notifications';

  if not found then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

create or replace function public.notify_client_message_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.sender = 'client' then
    insert into public.notifications (
      user_id,
      user_type,
      client_id,
      actor_id,
      actor_name,
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
      'team_member',
      new.client_id,
      new.client_id,
      coalesce(nullif(new.sender_name, ''), 'Client'),
      'New client message',
      'رسالة جديدة من عميل',
      'A client sent a new message. Open Messages to reply.',
      'أرسل عميل رسالة جديدة. افتح الرسائل للرد.',
      'message',
      'normal',
      'client_message',
      new.id::text,
      'client_message',
      new.id::text,
      '/lumos-admin?section=messages&client=' || new.client_id::text
    );
  else
    insert into public.notifications (
      user_id,
      user_type,
      recipient_user_id,
      client_id,
      actor_id,
      actor_name,
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
      new.sender_id,
      coalesce(nullif(new.sender_name, ''), 'Lumos'),
      'New message from Lumos',
      'رسالة جديدة من لوموس',
      'You have a new Lumos message in your client portal.',
      'لديك رسالة جديدة من لوموس في بوابة العميل.',
      'message',
      'normal',
      'client_message',
      new.id::text,
      'client_message',
      new.id::text,
      '/profile?tab=messages'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_client_message_event on public.client_messages;
create trigger trg_notify_client_message_event
after insert on public.client_messages
for each row execute function public.notify_client_message_event();

create or replace function public.notify_client_asset_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  asset_is_identity boolean := coalesce(new.is_identity_asset, false);
  asset_visibility text := coalesce(nullif(new.visibility, ''), 'client');
  asset_downloadable boolean := coalesce(new.is_downloadable, true);
  asset_name text := coalesce(nullif(new.file_name, ''), 'shared file');
begin
  if asset_visibility = 'admin_only' or asset_downloadable is false then
    return new;
  end if;

  if asset_is_identity then
    insert into public.notifications (
      user_id,
      user_type,
      recipient_user_id,
      client_id,
      actor_id,
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
      new.uploaded_by,
      'Your brand identity was updated',
      'تم تحديث هوية علامتك',
      'A new identity asset was shared with you: ' || asset_name || '.',
      'تمت مشاركة أصل جديد لهوية علامتك.',
      'identity',
      'normal',
      'client_asset',
      new.id::text,
      'client_asset',
      new.id::text,
      '/profile?tab=identity'
    );
  else
    insert into public.notifications (
      user_id,
      user_type,
      recipient_user_id,
      client_id,
      actor_id,
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
      new.uploaded_by,
      'New file shared with you',
      'تمت مشاركة ملف جديد معك',
      'Lumos shared a new file in your client portal.',
      'شارك لوموس ملفاً جديداً في بوابة العميل.',
      'file',
      'normal',
      'client_asset',
      new.id::text,
      'client_asset',
      new.id::text,
      '/profile?tab=files'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_client_asset_event on public.client_assets;
create trigger trg_notify_client_asset_event
after insert on public.client_assets
for each row execute function public.notify_client_asset_event();

create or replace function public.notify_client_identity_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE'
     and old.brand_name is not distinct from new.brand_name
     and old.tagline is not distinct from new.tagline
     and old.industry is not distinct from new.industry
     and old.brand_description is not distinct from new.brand_description
     and old.brand_voice is not distinct from new.brand_voice
     and old.brand_feel is not distinct from new.brand_feel
     and old.target_audience is not distinct from new.target_audience
     and old.typography is not distinct from new.typography
     and old.color_palette is not distinct from new.color_palette
     and old.social_links is not distinct from new.social_links
     and old.usage_notes is not distinct from new.usage_notes
     and old.public_notes is not distinct from new.public_notes then
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
    'Your brand identity was updated',
    'تم تحديث هوية علامتك',
    'Lumos updated your brand identity details.',
    'حدّث لوموس تفاصيل هوية علامتك.',
    'identity',
    'normal',
    'client_identity',
    new.id::text,
    'client_identity',
    new.id::text,
    '/profile?tab=identity'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_client_identity_event on public.client_identity;
create trigger trg_notify_client_identity_event
after insert or update on public.client_identity
for each row execute function public.notify_client_identity_event();

create or replace function public.notify_order_status_event()
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
    'Project status updated',
    'تم تحديث حالة المشروع',
    'Your project status changed to ' || new.status || '.',
    'تم تغيير حالة مشروعك.',
    'project',
    case when new.status = 'completed' then 'high' else 'normal' end,
    'order',
    new.id::text,
    'order',
    new.id::text,
    '/profile?tab=projects'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_order_status_event on public.orders;
create trigger trg_notify_order_status_event
after update of status on public.orders
for each row execute function public.notify_order_status_event();

create or replace function public.notify_pricing_request_created_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  admin_user_id uuid;
begin
  if new.client_id is null then
    select id
      into admin_user_id
      from public.clients
     where role = 'admin'
     order by created_at asc
     limit 1;

    if admin_user_id is null then
      return new;
    end if;
  end if;

  insert into public.notifications (
    user_id,
    user_type,
    client_id,
    actor_id,
    actor_name,
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
    coalesce(new.client_id, admin_user_id),
    'team_member',
    new.client_id,
    new.client_id,
    coalesce(nullif(new.guest_name, ''), 'Client'),
    'New pricing request',
    'طلب تسعير جديد',
    'A new pricing request is ready for review.',
    'يوجد طلب تسعير جديد جاهز للمراجعة.',
    'request',
    case when new.priority in ('high', 'urgent') then 'high' else 'normal' end,
    'pricing_request',
    new.id::text,
    'pricing_request',
    new.id::text,
    '/lumos-admin?section=requests'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_pricing_request_created_event on public.pricing_requests;
create trigger trg_notify_pricing_request_created_event
after insert on public.pricing_requests
for each row execute function public.notify_pricing_request_created_event();

create or replace function public.notify_client_security_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(new.password_must_change, false) is false then
    return new;
  end if;

  if old.password_must_change is not distinct from new.password_must_change
     and old.password_updated_by_admin_at is not distinct from new.password_updated_by_admin_at then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    user_type,
    recipient_user_id,
    client_id,
    actor_id,
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
    new.id,
    'client',
    new.id,
    new.id,
    new.password_updated_by_admin_by,
    'Account security update',
    'تحديث أمان الحساب',
    'A temporary password was set for your account. Change it after signing in.',
    'تم تعيين كلمة مرور مؤقتة لحسابك. غيّرها بعد تسجيل الدخول.',
    'security',
    'high',
    'client',
    new.id::text,
    'client',
    new.id::text,
    '/change-password'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_client_security_event on public.clients;
create trigger trg_notify_client_security_event
after update of password_must_change, password_updated_by_admin_at on public.clients
for each row execute function public.notify_client_security_event();
