-- Production schema catch-up for client_assets and team_members.
--
-- This migration is intentionally idempotent. It only adds columns used by the
-- current frontend payloads and does not loosen RLS or make private data public.

alter table public.client_assets
  add column if not exists uploaded_by uuid,
  add column if not exists uploaded_by_type text default 'admin',
  add column if not exists category text default 'general',
  add column if not exists note text,
  add column if not exists file_size bigint,
  add column if not exists storage_path text,
  add column if not exists asset_type text,
  add column if not exists identity_category text,
  add column if not exists is_identity_asset boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_downloadable boolean not null default true,
  add column if not exists visibility text not null default 'client',
  add column if not exists project_id uuid,
  add column if not exists project_service_id uuid,
  add column if not exists is_deliverable boolean not null default false,
  add column if not exists deliverable_status text,
  add column if not exists published_to_identity boolean not null default false,
  add column if not exists published_to_identity_at timestamptz,
  add column if not exists identity_publish_on_delivery boolean not null default false,
  add column if not exists client_visible boolean not null default true,
  add column if not exists placement_project_hub boolean,
  add column if not exists placement_action_center boolean,
  add column if not exists placement_files_library boolean,
  add column if not exists placement_brand_kit boolean;

alter table public.client_assets drop constraint if exists client_assets_uploaded_by_type_check;
alter table public.client_assets
  add constraint client_assets_uploaded_by_type_check
  check (uploaded_by_type in ('admin', 'team', 'client'));

alter table public.client_assets drop constraint if exists client_assets_visibility_check;
alter table public.client_assets
  add constraint client_assets_visibility_check
  check (visibility in ('client', 'admin_only'));

alter table public.client_assets drop constraint if exists client_assets_deliverable_status_check;
alter table public.client_assets
  add constraint client_assets_deliverable_status_check
  check (
    deliverable_status is null
    or deliverable_status in ('draft', 'ready_for_review', 'approved', 'delivered')
  );

alter table public.team_members
  add column if not exists phone text,
  add column if not exists avatar_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists job_title text,
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists last_active_at timestamptz;

create index if not exists client_assets_client_id_idx on public.client_assets(client_id);
create index if not exists client_assets_category_idx on public.client_assets(category);
create index if not exists idx_client_assets_client_visibility_created
  on public.client_assets(client_id, client_visible, visibility, created_at desc);
create index if not exists idx_client_assets_project_visible
  on public.client_assets(project_id, client_visible, visibility)
  where project_id is not null;
create index if not exists idx_client_assets_brand_kit
  on public.client_assets(client_id, published_to_identity, is_identity_asset, identity_category)
  where coalesce(client_visible, true) is true;
create unique index if not exists team_members_user_id_unique
  on public.team_members(user_id)
  where user_id is not null;
create unique index if not exists team_members_client_id_unique
  on public.team_members(client_id)
  where client_id is not null;

notify pgrst, 'reload schema';
