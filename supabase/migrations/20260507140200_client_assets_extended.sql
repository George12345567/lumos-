-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507140200_client_assets_extended.sql
--
-- Extend the existing client_assets table so admins can share files with
-- clients (and clients can see who uploaded what). RLS lets clients read only
-- their own assets and admins read/write any asset.
--
-- The bucket-level storage policies remain the source of truth for the file
-- bytes themselves (see 20260507120300_storage_rls_client_assets.sql).
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.client_assets
  add column if not exists uploaded_by uuid,
  add column if not exists uploaded_by_type text default 'admin' check (uploaded_by_type in ('admin', 'team', 'client')),
  add column if not exists category text default 'general',
  add column if not exists note text,
  add column if not exists file_size bigint,
  add column if not exists storage_path text;

create index if not exists client_assets_client_id_idx on public.client_assets(client_id);
create index if not exists client_assets_category_idx on public.client_assets(category);

alter table public.client_assets enable row level security;

drop policy if exists "client reads own assets"  on public.client_assets;
drop policy if exists "client inserts own assets" on public.client_assets;
drop policy if exists "admin manages assets"     on public.client_assets;

create policy "client reads own assets"
  on public.client_assets for select
  to authenticated
  using (client_id = auth.uid());

-- Clients may upload metadata for their own files (the storage policy still
-- enforces that the actual blob lives under their auth.uid folder).
create policy "client inserts own assets"
  on public.client_assets for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and uploaded_by_type = 'client'
  );

create policy "admin manages assets"
  on public.client_assets for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Realtime fanout for the admin & client portal views.
do $$
begin
  perform 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'client_assets';
  if not found then
    execute 'alter publication supabase_realtime add table public.client_assets';
  end if;
end$$;
