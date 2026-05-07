# Supabase Production Deploy Checklist — Lumos

Tick every item before pointing the production domain at this build.

---

## 1. Frontend env (Vercel / hosting provider)

These three are the only `VITE_*` Supabase-related variables that may be
set on the frontend. Anything else `VITE_*` will be inlined into the
browser bundle.

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_MASTER_ADMIN_EMAIL` (lowercase, matches the email of the
      `clients` row that will be promoted to `role = 'admin'`)

Optional, off by default:
- [ ] `VITE_ENABLE_PROFILE_PREVIEW=true` — only set if you want the mocked
      `/profile-preview` route enabled in production.

**MUST NOT BE SET on the frontend** (rotate immediately if any of these
ever shipped to production with a `VITE_` prefix):
- `VITE_SUPABASE_SERVICE_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SERVICE_ROLE_KEY`
- Any `VITE_*_SERVICE_*`

---

## 2. Backend-only secrets (Supabase Edge Functions / CI)

Set with `supabase secrets set` or in CI env. Never `VITE_*`.

- [ ] `SUPABASE_SERVICE_ROLE_KEY` — present **only** inside Supabase
      Edge Functions or backend automation. Used by the planned
      `admin-create-client` Edge Function.
- [ ] `DATABASE_URL` (CI / migrations only, not exposed to runtime).
- [ ] `SUPABASE_DB_PASSWORD` (CI / migrations only).
- [ ] `SECURITY_RESET_TOKEN_SECRET` (only if the `verify-security-answer`
      Edge Function is implemented).

If the local `.env` file currently has `VITE_SUPABASE_SERVICE_KEY` (a
prior build inlined this), **rotate the Supabase service-role key in the
Supabase dashboard immediately** and remove the variable from `.env`.

---

## 3. Run migrations (in order)

```
supabase db push
# OR if using Supabase CLI with linked project:
supabase migration up
```

Required migrations applied in this branch:

- [ ] `002_signup_and_password_reset.sql` (legacy / already applied)
- [ ] `003_availability_rpc.sql` (legacy / already applied)
- [ ] `004_fix_rls_policies.sql` (legacy / already applied)
- [ ] `20260505_client_profile_columns.sql` (legacy)
- [ ] `20260507120000_add_clients_role_and_is_admin.sql` ← NEW
- [ ] `20260507120100_enable_rls_and_policies.sql` ← NEW
- [ ] `20260507120200_cleanup_plaintext_security_answer.sql` ← NEW
- [ ] `20260507120300_storage_rls_client_assets.sql` ← NEW

---

## 4. Manual SQL — promote the master admin

After `20260507120000_add_clients_role_and_is_admin.sql` has run and the
master admin has signed up at least once (so a `public.clients` row
exists with their auth uid), run:

```sql
update public.clients
set role = 'admin'
where email = lower('YOUR_MASTER_ADMIN_EMAIL_HERE');

-- Verify
select id, email, role from public.clients where role = 'admin';
```

Replace `YOUR_MASTER_ADMIN_EMAIL_HERE` with the literal value of
`VITE_MASTER_ADMIN_EMAIL`. Do not commit the actual email into version
control.

---

## 5. Storage bucket

- [ ] Bucket `client-assets` exists.
- [ ] Bucket is **private** (not public).
- [ ] Storage policies from `20260507120300_storage_rls_client_assets.sql`
      are listed under Storage → Policies → `client-assets`.

---

## 6. Edge Functions (optional but recommended)

- [ ] `admin-create-client` deployed (otherwise admin dashboard tells the
      operator to invite users from Supabase manually — already shipped).
- [ ] `verify-security-answer` deployed (otherwise security-question reset
      stays disabled and email reset is the only path — already shipped).

See `SUPABASE_EDGE_FUNCTIONS_TODO.md`.

---

## 7. Smoke tests (three browsers / three sessions)

Run these in three separate browsers or incognito windows.

### A. Anonymous user

- [ ] `/` loads.
- [ ] `/profile` redirects to `/client-login?redirectTo=%2Fprofile`.
- [ ] `/lumos-admin` shows the 403 page.
- [ ] `/profile-preview` returns 404 unless `VITE_ENABLE_PROFILE_PREVIEW=true`.
- [ ] Open devtools and run
      `await fetch('https://<project>.supabase.co/rest/v1/clients?select=*', { headers: { apikey: '<anon>' } })`.
      Response must be `[]` or 401/403, never the full client list.

### B. Normal client (signup → confirm → login)

- [ ] Signup creates the user; confirmation email arrives.
- [ ] Login redirects to `/` (or `redirectTo` if present).
- [ ] `/profile` loads with the client's own data.
- [ ] Editing email/phone/website triggers validation; invalid input is
      rejected with a localized error.
- [ ] Saving valid changes shows a "saved" chip and persists after reload.
- [ ] In devtools:
      `await supabase.from('clients').select('*').neq('id', '<self-id>')`
      must return `[]` (cannot read other clients).
- [ ] `/lumos-admin` shows the 403 page.

### C. Master admin

- [ ] Login as the promoted admin.
- [ ] `/lumos-admin` loads. All tabs (Requests, Discounts, Contacts,
      Notifications, Audit, Team, Clients, Stats) populate.
- [ ] Status changes / discount creation / client edits all succeed and
      write `audit_logs` entries with `changed_by = <admin auth uid>`.
- [ ] Sign out clears React Query cache (no admin data leaks into the
      next session that opens in the same tab).

### D. Confirm cleanup migration

- [ ] `select count(*) from public.clients where (package_details ? 'security_answer') or (package_details->'signup_profile') ? 'security_answer';`
      returns `0`.
- [ ] `clients.security_answer` and `signup_requests.security_answer`
      columns no longer exist
      (`select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'clients' and column_name = 'security_answer';`
      returns `0`).

---

## 8. Frontend build sanity

- [ ] `npx tsc --noEmit` — exit 0
- [ ] `npm run build` — exit 0
- [ ] `npm run lint` — only the pre-existing 7 errors in unrelated files
      (`EnhancedNavbar.tsx`, `useCurrency.tsx`, `db.ts`, `submissionService.ts`,
      `AiChatSidebar.tsx`). No new errors in any auth/profile/admin file.
- [ ] Confirm the production bundle does NOT contain the string
      "service_role" (`grep -r service_role dist/`).

---

## 9. Final go/no-go

The site is **safe to launch** only when every box above is ticked.

If any of the following is missing, **do not launch**:

- `clients.role` column hardened (default `'client'`, NOT NULL, CHECK constraint, index).
- `public.is_admin()` exists.
- RLS enabled and policies present on `clients`, `pricing_requests`,
  `orders`, `contacts`, `audit_logs`, `notifications`, `team_members`,
  `discount_codes`, `saved_designs`.
- Storage RLS policies present on `client-assets`.
- Plaintext `security_answer` cleanup migration applied; columns dropped.
- `VITE_*_SERVICE_*` not set in any production frontend env.
- Master admin promoted via SQL.
- Smoke tests A/B/C/D all pass.
