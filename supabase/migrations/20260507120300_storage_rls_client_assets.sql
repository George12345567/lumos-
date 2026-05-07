-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507120300_storage_rls_client_assets.sql
--
-- Storage policies for the `client-assets` bucket. The frontend uploads
-- profile avatars and other per-client files to paths like:
--
--   client-assets/<auth.uid>/<filename>
--
-- (See src/services/profileService.ts uploadAvatar — note the legacy code
-- path uses `profile-avatars/<id>-<ts>-<name>` which is a flat layout. New
-- uploads should be migrated to the per-uid folder layout described below
-- so the policy actually scopes them. Until that frontend change ships,
-- treat the bucket as admin-only or temporarily allow flat reads.)
--
-- This migration only installs the policies. It does NOT create the bucket
-- itself — Supabase Storage buckets are managed in the dashboard. See the
-- "MANUAL STEP" block at the bottom.
--
-- This migration is idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════


-- Drop legacy policies first so re-runs don't conflict.
drop policy if exists "client-assets read own files"   on storage.objects;
drop policy if exists "client-assets insert own files" on storage.objects;
drop policy if exists "client-assets update own files" on storage.objects;
drop policy if exists "client-assets delete own files" on storage.objects;
drop policy if exists "client-assets admin read"       on storage.objects;
drop policy if exists "client-assets admin write"      on storage.objects;
drop policy if exists "client-assets public read"      on storage.objects;


-- ─── Owner policies ───────────────────────────────────────────────────────────
-- A signed-in user may read/upload/update/delete files only inside the folder
-- whose first segment matches their auth.uid().

create policy "client-assets read own files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "client-assets insert own files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "client-assets update own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "client-assets delete own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─── Admin policies ───────────────────────────────────────────────────────────
-- Admins can read and manage any object in the bucket.

create policy "client-assets admin read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-assets'
    and public.is_admin()
  );

create policy "client-assets admin write"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'client-assets'
    and public.is_admin()
  )
  with check (
    bucket_id = 'client-assets'
    and public.is_admin()
  );


-- ───────────────────────────────────────────────────────────────────────────────
-- MANUAL STEPS REQUIRED
-- ───────────────────────────────────────────────────────────────────────────────
-- 1. In the Supabase dashboard → Storage → New bucket:
--      name:   client-assets
--      public: NO   (private bucket; objects served via signed URLs)
--    If the bucket already exists with `public: yes`, switch it to private.
--
-- 2. Update the frontend uploader to use a per-uid folder layout:
--      profileService.uploadAvatar should write to
--        `${client_id}/avatars/<filename>` not
--        `profile-avatars/${client_id}-${ts}-<filename>`.
--    Until that ships, files at the flat layout will not be visible to the
--    new policies — admins can still read them, owners cannot. Migrate via:
--
--      -- one-off backfill (run from a server-side context with service-role)
--      update storage.objects
--      set name = split_part(name, '/', 1) -- adjust to your real layout
--      where bucket_id = 'client-assets'
--        and name like 'profile-avatars/%';
--
-- 3. Confirm policies via Supabase dashboard → Storage → Policies → client-assets.
-- ───────────────────────────────────────────────────────────────────────────────
