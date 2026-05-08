-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507150000_team_members_client_link.sql
--
-- Link team_members to clients so an existing client can be promoted into a
-- team member (employee) without duplicating personal data. The new columns
-- are optional and partial-unique on client_id, so the link is enforced when
-- present but legacy team_members rows without a client are still valid.
--
-- Related migrations:
--   * 20260507140300_team_members_permissions.sql adds permissions/user_id/last_active_at
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.team_members
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists job_title text;

-- Each client can be promoted into at most one team_member row.
create unique index if not exists team_members_client_id_unique
  on public.team_members(client_id)
  where client_id is not null;

-- Existing RLS policies on team_members (anon reads active members, admin
-- manages all) cover the new columns automatically. No new policies needed.

-- Verification:
--   select id, name, role, client_id, job_title, is_active
--     from public.team_members
--     order by created_at desc limit 5;
