-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507130000_invited_user_self_insert.sql
--
-- Add a tightly scoped INSERT policy on public.clients so a freshly-invited
-- Supabase user can finish onboarding at /invite-onboarding without admin
-- intervention.
--
-- Why this exists:
--   * 20260507120100_enable_rls_and_policies.sql installs SELECT and UPDATE
--     policies for clients on their own row, and full ALL access for admins.
--     There is no INSERT policy for clients, which means a normal client
--     cannot create their own row from the frontend. That is correct for
--     ordinary signup (we go through Edge Functions / SECURITY DEFINER) and
--     for the invite flow when the admin pre-creates the row.
--   * For invite onboarding, we sometimes want the invited user to materialise
--     their own clients row themselves — but ONLY their own row, ONLY with
--     role = 'client', and ONLY if no row already exists. This policy enforces
--     all three at the database level.
--
-- This migration is idempotent and safe to re-run.
--
-- DEPENDENCIES:
--   * 20260507120000_add_clients_role_and_is_admin.sql (clients_role_check)
--   * 20260507120100_enable_rls_and_policies.sql       (existing client policies)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Make the migration re-runnable by dropping any older variant first.
drop policy if exists "client inserts own row"                 on public.clients;
drop policy if exists "invited client inserts own row"         on public.clients;

-- A signed-in user may insert exactly one row for themselves, and only as a
-- client. The row's id MUST equal auth.uid(). The row's role MUST be 'client'.
-- Admins continue to have full access via "admin writes all clients".
--
-- NOTE on uniqueness: clients.id is the primary key. If a row already exists
-- for auth.uid() (e.g. admin pre-created it), this INSERT will fail with
-- "duplicate key" — that's intentional. The frontend detects the existing row
-- and switches to UPDATE; see src/services/inviteOnboardingService.ts.
create policy "invited client inserts own row"
  on public.clients for insert
  to authenticated
  with check (
    auth.uid() = id
    and role = 'client'
  );

-- ───────────────────────────────────────────────────────────────────────────────
-- POST-DEPLOY VERIFICATION
-- ───────────────────────────────────────────────────────────────────────────────
-- 1. As a fresh authenticated user (no existing clients row):
--      insert into public.clients (id, username, email, role)
--      values (auth.uid(), 'invitee_test', 'invitee@example.com', 'client');
--    → should succeed.
--
-- 2. As the same user, attempting role escalation:
--      insert into public.clients (id, username, email, role)
--      values (auth.uid(), 'evil', 'evil@example.com', 'admin');
--    → should fail with: new row violates row-level security policy.
--
-- 3. As the same user, inserting somebody else's id:
--      insert into public.clients (id, username, email, role)
--      values ('00000000-0000-0000-0000-000000000000', 'mallory', 'm@example.com', 'client');
--    → should fail with: new row violates row-level security policy.
-- ───────────────────────────────────────────────────────────────────────────────
