-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507120000_add_clients_role_and_is_admin.sql
--
-- Strengthen the existing public.clients.role column and add a stable
-- public.is_admin() helper function used by every admin-protected RLS policy.
--
-- Why this exists:
--   * `clients.role` already existed in the schema but was nullable, had no
--     CHECK constraint, defaulted to '' and had no index. Several rows likely
--     have NULL or '' which would break any policy that compares to 'admin'.
--   * The previous RLS migration (004_fix_rls_policies.sql) compared
--     `current_setting('request.jwt.claims', ...)::jsonb->>'email'` against
--     `clients.email`. That works but is fragile (case sensitivity, missing
--     index) and duplicated everywhere. This migration centralises the check.
--
-- This migration is idempotent and safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Backfill any NULL/empty role values to 'client' so the constraint passes.
update public.clients
set role = 'client'
where role is null or btrim(role) = '';

-- 2. Tighten the role column.
alter table public.clients
  alter column role set default 'client';

alter table public.clients
  alter column role set not null;

-- Drop a previous version of the check constraint if it exists so this is
-- safely re-runnable.
alter table public.clients
  drop constraint if exists clients_role_check;

alter table public.clients
  add constraint clients_role_check
  check (role in ('client', 'admin'));

-- 3. Index by role so admin lookups in RLS sub-queries stay fast.
create index if not exists idx_clients_role on public.clients(role);

-- 4. is_admin() helper — single source of truth for admin authorization.
--
--    SECURITY DEFINER lets the function read public.clients even when the
--    caller's RLS policy on clients hasn't run yet. We pin the search_path
--    so a malicious schema with a `public` shadow can't hijack the lookup.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = auth.uid()
      and c.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

comment on function public.is_admin() is
'Returns true when the calling auth.uid() corresponds to a public.clients row with role = ''admin''. Use in RLS policies as the single source of truth for admin authorization. Updated by 20260507120000_add_clients_role_and_is_admin.sql.';

-- ───────────────────────────────────────────────────────────────────────────────
-- MANUAL STEP REQUIRED AFTER DEPLOY
-- ───────────────────────────────────────────────────────────────────────────────
-- 1. Make sure the master admin already has a row in public.clients whose `id`
--    matches their auth.users.id. (If they signed up through the normal flow
--    this is automatic.)
-- 2. Promote them with:
--
--      update public.clients
--      set role = 'admin'
--      where email = lower('YOUR_MASTER_ADMIN_EMAIL_HERE');
--
--    Replace YOUR_MASTER_ADMIN_EMAIL_HERE with the value of
--    VITE_MASTER_ADMIN_EMAIL. Do NOT commit the actual email into this file.
-- 3. Verify by running:
--
--      select id, email, role from public.clients where role = 'admin';
--      select public.is_admin();   -- run while signed in as the admin
-- ───────────────────────────────────────────────────────────────────────────────
