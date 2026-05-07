-- ═══════════════════════════════════════════════════════════════════════════════
-- 20260507120100_enable_rls_and_policies.sql
--
-- Enable Row Level Security and install the canonical policies for every
-- table the frontend reads or writes. Depends on:
--   * 20260507120000_add_clients_role_and_is_admin.sql  (public.is_admin())
--   * 004_fix_rls_policies.sql                          (signup_requests / password_reset_requests baseline)
--
-- Conventions used below:
--   * `auth.uid()` is the authenticated Supabase user id.
--   * `public.is_admin()` is the master admin check (defined in the previous migration).
--   * Every table follows: own-row read/write for the legitimate owner +
--     full read/write for admins. Anonymous access is opt-in per table.
--   * All policies are dropped first by the same name to make this migration
--     idempotent. Drop any conflicting/legacy policy explicitly when its name
--     is unknown — older permissive policies are removed before we add ours.
--
-- IMPORTANT: this migration intentionally does NOT enable RLS on tables it
-- does not understand (dashboard_stats / monthly_revenue / recent_* views are
-- views; they inherit the security of the underlying tables). If a future
-- table is added it must get its own policy block — do not assume the default.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── public.clients ────────────────────────────────────────────────────────────
alter table public.clients enable row level security;

-- Drop legacy policies (names unknown / from prior tooling) before re-creating.
drop policy if exists "client reads own row"     on public.clients;
drop policy if exists "client updates own row"   on public.clients;
drop policy if exists "admin reads all clients"  on public.clients;
drop policy if exists "admin writes all clients" on public.clients;
drop policy if exists "Allow individual user read access"  on public.clients;
drop policy if exists "Allow individual user update access" on public.clients;
drop policy if exists "Public can read clients"  on public.clients;

-- A signed-in client may read their own row.
create policy "client reads own row"
  on public.clients for select
  to authenticated
  using (auth.uid() = id);

-- A signed-in client may update their own row, but cannot escalate role.
create policy "client updates own row"
  on public.clients for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Reject any attempt to set role from a client policy. Admins go through
    -- the admin policy below.
    and role is not distinct from (
      select c.role from public.clients c where c.id = auth.uid()
    )
  );

-- Admins can read every client.
create policy "admin reads all clients"
  on public.clients for select
  to authenticated
  using (public.is_admin());

-- Admins can insert/update/delete any client row.
create policy "admin writes all clients"
  on public.clients for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ─── public.pricing_requests ──────────────────────────────────────────────────
alter table public.pricing_requests enable row level security;

drop policy if exists "anon insert pricing request"           on public.pricing_requests;
drop policy if exists "client reads own pricing request"      on public.pricing_requests;
drop policy if exists "admin manages pricing requests"        on public.pricing_requests;
drop policy if exists "Allow public insert pricing request"   on public.pricing_requests;
drop policy if exists "Public can read pricing_requests"      on public.pricing_requests;

-- The public pricing modal posts here as an anonymous lead. Allow inserts
-- only — never reads or updates.
create policy "anon insert pricing request"
  on public.pricing_requests for insert
  to anon, authenticated
  with check (true);

-- A signed-in client can read their own pricing requests (those linked via client_id).
create policy "client reads own pricing request"
  on public.pricing_requests for select
  to authenticated
  using (client_id is not null and client_id = auth.uid());

-- Admin: full access.
create policy "admin manages pricing requests"
  on public.pricing_requests for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ─── public.orders ─────────────────────────────────────────────────────────────
alter table public.orders enable row level security;

drop policy if exists "client reads own orders"  on public.orders;
drop policy if exists "admin manages orders"     on public.orders;
drop policy if exists "Public can read orders"   on public.orders;

-- A signed-in client can read their own orders.
create policy "client reads own orders"
  on public.orders for select
  to authenticated
  using (client_id is not null and client_id = auth.uid());

-- Admin: full access.
create policy "admin manages orders"
  on public.orders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ─── public.contacts ───────────────────────────────────────────────────────────
alter table public.contacts enable row level security;

drop policy if exists "anon insert contact"    on public.contacts;
drop policy if exists "admin manages contacts" on public.contacts;
drop policy if exists "Public can read contacts" on public.contacts;

-- The public contact form is anonymous. Insert only.
create policy "anon insert contact"
  on public.contacts for insert
  to anon, authenticated
  with check (true);

-- Admin: full access.
create policy "admin manages contacts"
  on public.contacts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ─── public.audit_logs ─────────────────────────────────────────────────────────
alter table public.audit_logs enable row level security;

drop policy if exists "admin reads audit_logs"   on public.audit_logs;
drop policy if exists "admin inserts audit_logs" on public.audit_logs;
drop policy if exists "Public can read audit_logs" on public.audit_logs;

-- Admin: read all audit entries.
create policy "admin reads audit_logs"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin());

-- Admin: write audit entries (the dashboard inserts these for its own actions).
-- For future server-side automated audit writes, use the service role from an
-- Edge Function — service-role bypasses RLS by design.
create policy "admin inserts audit_logs"
  on public.audit_logs for insert
  to authenticated
  with check (public.is_admin());


-- ─── public.notifications ──────────────────────────────────────────────────────
alter table public.notifications enable row level security;

drop policy if exists "client reads own notifications"  on public.notifications;
drop policy if exists "client updates own notifications" on public.notifications;
drop policy if exists "admin manages notifications"     on public.notifications;

-- A signed-in client can read their own notifications.
create policy "client reads own notifications"
  on public.notifications for select
  to authenticated
  using (
    user_id is not null
    and user_id = auth.uid()
    and user_type = 'client'
  );

-- A signed-in client can mark their own notifications read.
create policy "client updates own notifications"
  on public.notifications for update
  to authenticated
  using (
    user_id is not null
    and user_id = auth.uid()
    and user_type = 'client'
  )
  with check (
    user_id is not null
    and user_id = auth.uid()
    and user_type = 'client'
  );

-- Admin: full access.
create policy "admin manages notifications"
  on public.notifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ─── public.team_members ──────────────────────────────────────────────────────
alter table public.team_members enable row level security;

drop policy if exists "anon reads active team_members" on public.team_members;
drop policy if exists "admin manages team_members"     on public.team_members;
drop policy if exists "Public can read team_members"   on public.team_members;

-- The marketing site shows the team. Allow read of active members only.
-- Audit decision: this exposes name / role / avatar / email to unauthenticated
-- visitors. If even that is too much, drop this policy and gate behind admin.
create policy "anon reads active team_members"
  on public.team_members for select
  to anon, authenticated
  using (is_active is true);

-- Admin: full management (including reading inactive members and email/phone
-- of inactive members which the public read above does NOT expose).
create policy "admin manages team_members"
  on public.team_members for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ─── public.discount_codes ────────────────────────────────────────────────────
alter table public.discount_codes enable row level security;

drop policy if exists "admin manages discount_codes" on public.discount_codes;
drop policy if exists "Public can read discount_codes" on public.discount_codes;

-- Discount codes are sensitive (full discount tables shouldn't be enumerable
-- by anonymous visitors). Validation should happen server-side via RPC or an
-- Edge Function — see SUPABASE_EDGE_FUNCTIONS_TODO.md.
create policy "admin manages discount_codes"
  on public.discount_codes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ─── public.saved_designs ─────────────────────────────────────────────────────
alter table public.saved_designs enable row level security;

drop policy if exists "client manages own designs" on public.saved_designs;
drop policy if exists "admin reads all designs"    on public.saved_designs;

-- A signed-in client owns their saved designs.
create policy "client manages own designs"
  on public.saved_designs for all
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- Admin: read everything (no admin write here on purpose; admins shouldn't
-- silently mutate client design state).
create policy "admin reads all designs"
  on public.saved_designs for select
  to authenticated
  using (public.is_admin());


-- ─── Re-affirm signup_requests / password_reset_requests using is_admin() ─────
-- The previous migration (004_fix_rls_policies.sql) used a JWT-claim email
-- check. Replace those policies with the centralised is_admin() helper to
-- avoid drift.

drop policy if exists "Admins can view signup requests"          on public.signup_requests;
create policy "Admins can view signup requests"
  on public.signup_requests for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can view password reset requests"  on public.password_reset_requests;
create policy "Admins can view password reset requests"
  on public.password_reset_requests for select
  to authenticated
  using (public.is_admin());


-- ───────────────────────────────────────────────────────────────────────────────
-- POST-DEPLOY VERIFICATION
-- ───────────────────────────────────────────────────────────────────────────────
-- Run as the ANON role (no session) — every select should be empty / fail:
--   set role anon;
--   select count(*) from public.clients;
--   select count(*) from public.audit_logs;
--   reset role;
--
-- Run as a NORMAL CLIENT session (`auth.uid()` set) — should only see own
-- rows in clients / pricing_requests / orders / notifications / saved_designs.
--
-- Run as the MASTER ADMIN session — every admin policy above should return
-- rows for all clients.
-- ───────────────────────────────────────────────────────────────────────────────
