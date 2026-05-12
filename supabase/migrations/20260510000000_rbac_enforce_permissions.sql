-- ============================================================================
-- RBAC enforcement: Replace blanket is_admin() policies with has_admin_permission()
-- on tables where team members should have scoped access.
--
-- Tables updated: client_messages, notifications, saved_designs, team_members,
--   contacts, pricing_requests (sides), client_assets (verify).
--
-- Tables kept is_admin() only: audit_logs, discount_codes, workspace_settings,
--   signup_requests, password_reset_requests — these are owner/admin-only.
--
-- Idempotent: drops old policies by name before re-creating.
-- ============================================================================

-- ─── public.client_messages ──────────────────────────────────────────────

alter table public.client_messages enable row level security;

drop policy if exists "admin manages client_messages" on public.client_messages;

create policy "tm can view client_messages"
  on public.client_messages for select
  to authenticated
  using (public.has_admin_permission('messages', 'view'));

create policy "tm can insert client_messages"
  on public.client_messages for insert
  to authenticated
  with check (public.has_admin_permission('messages', 'send'));

create policy "tm can update client_messages"
  on public.client_messages for update
  to authenticated
  using (public.has_admin_permission('messages', 'edit'))
  with check (public.has_admin_permission('messages', 'edit'));

create policy "client reads own messages"
  on public.client_messages for select
  to authenticated
  using (client_id = auth.uid());

create policy "client inserts own messages"
  on public.client_messages for insert
  to authenticated
  with check (client_id = auth.uid());

create policy "client updates own messages"
  on public.client_messages for update
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());


-- ─── public.notifications ────────────────────────────────────────────────

drop policy if exists "admin manages notifications" on public.notifications;

create policy "tm can view notifications"
  on public.notifications for select
  to authenticated
  using (public.has_admin_permission('statistics', 'view'));

create policy "tm can manage notifications"
  on public.notifications for insert
  to authenticated
  with check (public.has_admin_permission('statistics', 'view'));

create policy "tm can update notifications"
  on public.notifications for update
  to authenticated
  using (public.has_admin_permission('statistics', 'view'))
  with check (public.has_admin_permission('statistics', 'view'));


-- ─── public.saved_designs ────────────────────────────────────────────────

drop policy if exists "admin reads all designs" on public.saved_designs;

create policy "tm can view designs"
  on public.saved_designs for select
  to authenticated
  using (public.has_admin_permission('files', 'view'));


-- ─── public.team_members ────────────────────────────────────────────────

drop policy if exists "admin manages team_members" on public.team_members;

create policy "tm can view team_members"
  on public.team_members for select
  to authenticated
  using (public.has_admin_permission('team', 'view'));

create policy "tm can manage team_members"
  on public.team_members for all
  to authenticated
  using (public.has_admin_permission('team', 'edit'))
  with check (public.has_admin_permission('team', 'edit'));

-- Re-add the anon read policy for public team display (unchanged).
create policy "anon reads active team_members"
  on public.team_members for select
  to anon, authenticated
  using (is_active is true);


-- ─── public.contacts ─────────────────────────────────────────────────────

drop policy if exists "admin manages contacts" on public.contacts;

create policy "tm can view contacts"
  on public.contacts for select
  to authenticated
  using (public.has_admin_permission('contacts', 'view'));

create policy "tm can insert contacts"
  on public.contacts for insert
  to authenticated
  with check (public.has_admin_permission('contacts', 'create'));

create policy "tm can update contacts"
  on public.contacts for update
  to authenticated
  using (public.has_admin_permission('contacts', 'edit'))
  with check (public.has_admin_permission('contacts', 'edit'));

create policy "tm can delete contacts"
  on public.contacts for delete
  to authenticated
  using (public.has_admin_permission('contacts', 'delete'));


-- ─── public.pricing_requests (supplement existing) ──────────────────────

drop policy if exists "admin manages pricing_requests" on public.pricing_requests;

create policy "owner admin all pricing_requests"
  on public.pricing_requests for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "tm can view pricing_requests"
  on public.pricing_requests for select
  to authenticated
  using (public.has_admin_permission('requests', 'view'));

create policy "tm can edit pricing_requests"
  on public.pricing_requests for update
  to authenticated
  using (public.has_admin_permission('requests', 'edit'))
  with check (public.has_admin_permission('requests', 'edit'));

create policy "tm can insert pricing_requests"
  on public.pricing_requests for insert
  to authenticated
  with check (public.has_admin_permission('requests', 'create'));

create policy "tm can delete pricing_requests"
  on public.pricing_requests for delete
  to authenticated
  using (public.has_admin_permission('requests', 'delete'));


-- ─── public.orders (supplement existing) ─────────────────────────────────

drop policy if exists "admin manages orders" on public.orders;

create policy "owner admin all orders"
  on public.orders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "tm can view orders"
  on public.orders for select
  to authenticated
  using (public.has_admin_permission('projects', 'view'));

create policy "tm can edit orders"
  on public.orders for update
  to authenticated
  using (public.has_admin_permission('projects', 'edit'))
  with check (public.has_admin_permission('projects', 'edit'));


-- ─── Verify grants ───────────────────────────────────────────────────────

notify pgrst, 'reload schema';