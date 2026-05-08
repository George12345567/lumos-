-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260508100000_client_identity.sql
--
-- Structured brand identity data for the client profile Identity portal and
-- admin client drawer. Files stay in the private `client-assets` bucket and
-- are served through signed URLs only.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.client_identity (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  brand_name text,
  tagline text,
  industry text,
  brand_description text,
  brand_voice text,
  brand_feel text,
  target_audience text,
  typography jsonb not null default '{}'::jsonb,
  color_palette jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  usage_notes text,
  public_notes text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'client_identity_client_id_key'
      and conrelid = 'public.client_identity'::regclass
  ) then
    alter table public.client_identity
      add constraint client_identity_client_id_key unique (client_id);
  end if;
end$$;

create index if not exists client_identity_client_id_idx on public.client_identity(client_id);

create or replace function public.set_client_identity_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_client_identity_updated_at on public.client_identity;
create trigger trg_client_identity_updated_at
  before update on public.client_identity
  for each row execute function public.set_client_identity_updated_at();


-- ─── Identity asset metadata on existing client_assets ───────────────────────
alter table public.client_assets
  add column if not exists asset_type text,
  add column if not exists identity_category text,
  add column if not exists is_identity_asset boolean not null default false,
  add column if not exists sort_order int not null default 0,
  add column if not exists is_downloadable boolean not null default true,
  add column if not exists visibility text not null default 'client';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'client_assets_visibility_check'
      and conrelid = 'public.client_assets'::regclass
  ) then
    alter table public.client_assets
      add constraint client_assets_visibility_check
      check (visibility in ('client', 'admin_only'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'client_assets_identity_category_check'
      and conrelid = 'public.client_assets'::regclass
  ) then
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
          'social_avatar',
          'social_cover',
          'icon',
          'pattern',
          'template',
          'other'
        )
      );
  end if;
end$$;

create index if not exists client_assets_identity_idx
  on public.client_assets(client_id, is_identity_asset, visibility, identity_category);

create index if not exists client_assets_storage_path_idx
  on public.client_assets(storage_path)
  where storage_path is not null;


-- ─── RLS: client_identity ────────────────────────────────────────────────────
alter table public.client_identity enable row level security;

drop policy if exists "client reads own identity" on public.client_identity;
drop policy if exists "client updates own identity" on public.client_identity;
drop policy if exists "admin manages client identity" on public.client_identity;
drop policy if exists "public reads client identity" on public.client_identity;

create policy "client reads own identity"
  on public.client_identity for select
  to authenticated
  using (client_id = auth.uid());

-- Identity source-of-truth is admin-managed for now. Clients can request
-- changes through messages, but cannot update this table directly.
create policy "admin manages client identity"
  on public.client_identity for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ─── RLS: client_assets visibility for Identity assets ───────────────────────
alter table public.client_assets enable row level security;

drop policy if exists "client reads own assets" on public.client_assets;
drop policy if exists "client inserts own assets" on public.client_assets;
drop policy if exists "admin manages assets" on public.client_assets;

create policy "client reads own assets"
  on public.client_assets for select
  to authenticated
  using (
    client_id = auth.uid()
    and (
      coalesce(is_identity_asset, false) is false
      or (
        is_identity_asset is true
        and visibility = 'client'
        and coalesce(is_downloadable, true) is true
      )
    )
  );

-- Client metadata inserts are allowed only for non-identity files. Official
-- identity assets are admin-managed.
create policy "client inserts own assets"
  on public.client_assets for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and uploaded_by_type = 'client'
    and coalesce(is_identity_asset, false) is false
  );

create policy "admin manages assets"
  on public.client_assets for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ─── Storage read tightening for private identity files ──────────────────────
-- General files under <auth.uid()>/... remain readable by their owner.
-- Identity files under <auth.uid()>/identity/... require a matching
-- client-visible, downloadable metadata row. Admin policies remain separate.
drop policy if exists "client-assets read own files" on storage.objects;

create policy "client-assets read own files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      (storage.foldername(name))[2] is distinct from 'identity'
      or exists (
        select 1
        from public.client_assets ca
        where ca.client_id = auth.uid()
          and ca.storage_path = name
          and ca.is_identity_asset is true
          and ca.visibility = 'client'
          and coalesce(ca.is_downloadable, true) is true
      )
    )
  );


-- ─── Realtime fanout ─────────────────────────────────────────────────────────
do $$
begin
  perform 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'client_identity';
  if not found then
    execute 'alter publication supabase_realtime add table public.client_identity';
  end if;
end$$;
