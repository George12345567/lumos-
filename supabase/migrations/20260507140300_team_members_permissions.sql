-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507140300_team_members_permissions.sql
--
-- Add an optional permissions blob and an auth_user_id link to team_members
-- so the admin dashboard can store per-member permission overrides and the
-- backend can later resolve permissions from the active session's auth.uid().
--
-- Frontend impact today:
--   * The Team & Permissions UI reads/writes `team_members.permissions` (jsonb)
--   * `useAdminPermission` falls back to role defaults when the blob is empty
--
-- Backend impact today: NONE. Real RLS enforcement based on this column
-- requires a `has_perm()` SECURITY DEFINER function — see RBAC_BACKEND_TODO.md.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.team_members
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists last_active_at timestamptz;

create unique index if not exists team_members_user_id_unique
  on public.team_members(user_id)
  where user_id is not null;

-- Existing RLS policies on team_members are left intact:
--   * anon reads active rows (already exists from 20260507120100)
--   * admin manages any row (already exists)
-- The new columns inherit those policies. Only an admin can write
-- `permissions`, which matches the product expectation.
