# RBAC Backend TODO — Lumos Admin

The new `/lumos-admin` UI is role-aware. The matrix in
`src/features/admin/permissions.ts` controls which sections/actions are
visible to each role. **None of this is real security yet.** Today the
only enforced gate is:

1. `AdminRoute` (frontend) — redirects non-admin emails to a 403 page.
2. Master admin email check (`isAdminEmail()` against `VITE_MASTER_ADMIN_EMAIL`).
3. Whatever Supabase RLS policies are already on the underlying tables.

Roles like *manager*, *sales*, *designer*, *support*, *viewer* are
**rendered, not enforced**. Anyone who passes the master-admin gate sees
the dashboard as `owner`. To make the matrix real, the work below is
required.

---

## 1. Persist a server-trusted role per user

Add a column the database can verify, not just an email match.

```sql
-- Option A: extend public.clients
alter table public.clients
  add column if not exists role text
    default 'client'
    check (role in ('owner','admin','manager','sales','designer','support','viewer','client'));

-- Option B: extend team_members and link to auth.users
alter table public.team_members
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add constraint team_members_user_id_unique unique(user_id);
```

Pick **one** source of truth. The current frontend reads `clients.role`
(the value `'admin'` is what `is_admin()` returns true for). Mapping the
new richer roles into that column keeps the existing helper working.

---

## 2. SECURITY DEFINER helpers

Update or add helpers that read role and check capabilities, all marked
`SECURITY DEFINER` and run as a low-privilege role.

```sql
create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text
  from public.clients
  where id = auth.uid();
$$;

create or replace function public.has_perm(_resource text, _action text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r text := public.current_admin_role();
begin
  -- Mirror the matrix from src/features/admin/permissions.ts.
  -- Owner: everything.
  if r = 'owner' then return true; end if;
  if r = 'admin' then
    return _resource <> 'audit_logs' or _action = 'view';
  end if;
  -- TODO: fill in rules for manager / sales / designer / support / viewer.
  return false;
end;
$$;
```

**The two implementations (frontend matrix and SQL function) must stay
in sync.** Treat `permissions.ts` as the spec and translate it into the
SQL function. A drift here is a security bug.

---

## 3. Tighten RLS on every admin-touched table

For each table the dashboard reads/writes, replace the catch-all
`is_admin()` policy with permission-based policies. Example for
`pricing_requests`:

```sql
drop policy if exists "admin manages pricing_requests" on public.pricing_requests;

create policy "perm view pricing_requests"
  on public.pricing_requests for select
  using (public.has_perm('requests', 'view'));

create policy "perm insert pricing_requests"
  on public.pricing_requests for insert
  with check (public.has_perm('requests', 'create'));

create policy "perm update pricing_requests"
  on public.pricing_requests for update
  using (public.has_perm('requests', 'edit'))
  with check (public.has_perm('requests', 'edit'));

create policy "perm delete pricing_requests"
  on public.pricing_requests for delete
  using (public.has_perm('requests', 'delete'));
```

Repeat for `clients`, `orders`, `contacts`, `notifications`,
`audit_logs`, `team_members`, `discount_codes`, `client_messages`,
`client_assets` (storage).

---

## 4. Per-resource ownership rules

Some roles should only see records they own/are assigned to:

- **Designer** — only `pricing_requests` / `orders` where
  `assigned_to = (select id from public.team_members where user_id = auth.uid())`.
- **Sales** — same idea, scoped to leads they originated.

Add `using (...)` clauses that enforce that, e.g.:

```sql
create policy "designer sees assigned only"
  on public.pricing_requests for select
  using (
    public.has_perm('requests', 'view')
    and (
      public.current_admin_role() <> 'designer'
      or assigned_to = (
        select id from public.team_members where user_id = auth.uid()
      )
    )
  );
```

---

## 5. Optional: per-user permission overrides

If business demands per-user fine tuning beyond role defaults, add:

```sql
create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  resource text not null,
  action text not null,
  allow boolean not null,
  created_at timestamptz not null default now(),
  unique(user_id, resource, action)
);
```

Then `has_perm()` checks `role_permissions` first, falling back to the
role defaults. The Team & Permissions UI is already a good fit for this
table — it just needs a backing endpoint and policies.

---

## 6. Edge functions that touch RBAC

`admin-client-update` (already used by the existing client CRUD flow)
runs with the service-role key and trusts the caller's session token.
After the changes above, it should also call `has_perm()` before
performing the action so the UI and the edge function agree on access.

---

## 7. Audit logging

Every change made through the admin UI should land in `audit_logs`.
Either:

- Use database triggers on `pricing_requests`, `clients`, `orders`,
  `discount_codes`, `team_members` that insert into `audit_logs`, or
- Wrap the admin RPC layer to call `auditService.logAuditChange()` on
  every mutation.

Trigger-based is preferred — it works no matter which client mutates the
row (UI, edge function, dashboard SQL editor).

---

## 8. Sanity tests before declaring RBAC live

```sql
-- impersonate each role and verify
set local "request.jwt.claims" = '{"sub":"<uid-of-sales-user>"}';
select count(*) from public.pricing_requests; -- expect: only sales-allowed
insert into public.discount_codes(code, discount_type, discount_value)
  values ('FOO','percentage',10);
-- expect: ERROR — RLS blocks insert
reset role;
```

Repeat for owner / admin / manager / sales / designer / support /
viewer. Anything that lets a lower role escalate is a launch blocker.

---

## Summary

The frontend is permission-aware **today**. To turn that awareness into
real security:

- [ ] Persist server-trusted roles (`clients.role` or
      `team_members.user_id` link).
- [ ] Write `current_admin_role()` and `has_perm(resource, action)` as
      SECURITY DEFINER functions.
- [ ] Replace blanket `is_admin()` policies with `has_perm(...)` policies
      across every admin-touched table.
- [ ] Add ownership scoping for designer/sales.
- [ ] (Optional) `role_permissions` table for per-user overrides.
- [ ] Audit triggers / hooks.
- [ ] Run the cross-role test matrix.

Until those land, the admin dashboard's UI gating is an ergonomic
convenience — not a security boundary.
