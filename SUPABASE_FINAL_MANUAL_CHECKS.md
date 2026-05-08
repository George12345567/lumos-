# Supabase Final Manual Checks — Pre-Launch

Run **every** snippet below against the production Supabase project from
the SQL editor (Dashboard → SQL Editor → New query). Each one is
read-only and idempotent unless explicitly noted. Confirm the expected
output before going live.

> The frontend never has the service-role key. These checks should be run
> by you (the project owner) signed in as the Supabase project owner /
> dashboard operator, **not** from any browser-side code.

---

## 1. RLS is enabled on every sensitive table

```sql
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'clients', 'pricing_requests', 'orders', 'contacts',
    'audit_logs', 'notifications', 'team_members',
    'discount_codes', 'saved_designs',
    'signup_requests', 'password_reset_requests',
    'client_messages', 'client_assets'
  )
order by c.relname;
```

**Expected:** every row shows `rls_enabled = t`. If any row shows `f`, run
the migration `20260507120100_enable_rls_and_policies.sql` (or its
equivalent for the missing table) before launch.

---

## 2. No broad / public-write policies on `clients`

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'clients'
order by policyname;
```

**Expected policies (no others):**

| policyname | cmd | notes |
|---|---|---|
| `client reads own row` | SELECT | `using (auth.uid() = id)` |
| `client updates own row` | UPDATE | `using (auth.uid() = id)`, with_check rejects role changes |
| `admin reads all clients` | SELECT | `using (public.is_admin())` |
| `admin writes all clients` | ALL | both `using` and `with check` are `public.is_admin()` |
| `invited client inserts own row` | INSERT | `with check (auth.uid() = id and role = 'client')` |

If you see a policy whose `qual` or `with_check` is just `true` (e.g.
"Allow all" or "Public can read"), **drop it** before launch:

```sql
-- Replace <policy_name> with the actual leak.
drop policy if exists "<policy_name>" on public.clients;
```

---

## 3. Master admin row exists and has `role = 'admin'`

Replace `__YOUR_ADMIN_EMAIL__` with the value of `VITE_MASTER_ADMIN_EMAIL`
(do **not** commit the email into this file — keep the substitution
local).

```sql
select id, email, role, status
from public.clients
where email = lower('__YOUR_ADMIN_EMAIL__');
```

**Expected:** exactly one row, `role = 'admin'`. If `role` is anything
else, promote it once:

```sql
update public.clients
set role = 'admin'
where email = lower('__YOUR_ADMIN_EMAIL__');
```

Then verify the helper:

```sql
-- Must be run while signed in as the admin in a Studio "Run as user" session,
-- otherwise auth.uid() will be NULL.
select public.is_admin();
```

**Expected:** `t`.

---

## 4. `clients` insert path provides every NOT NULL column

The invited-user onboarding service writes:

```
id, username, email, role, signup_source, package_details
+ phone, company_name, full_contact_name, website, industry,
  project_summary, auth_password_pending, signup_completed_at
```

Confirm those are the only NOT NULL columns without a default:

```sql
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clients'
  and is_nullable = 'NO'
order by ordinal_position;
```

**Expected:** every NOT-NULL column either has a `column_default` or is
provided by `inviteOnboardingService.completeInviteOnboarding(...)`. If a
new NOT NULL column is added later, update the service before redeploying
the frontend.

---

## 5. `client-assets` storage bucket is private

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where name = 'client-assets';
```

**Expected:** exactly one row, `public = false`. Public buckets bypass
RLS and would expose every uploaded file.

If `public = true`, set it private from the dashboard (Storage → bucket →
Settings → toggle Public off) **before** users start uploading real
content.

---

## 6. Storage RLS policies on `client-assets`

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and qual like '%client-assets%' or with_check like '%client-assets%';
```

**Expected:** at least one INSERT policy whose `with_check` enforces
`bucket_id = 'client-assets' and (storage.foldername(name))[1] = auth.uid()::text`,
plus a matching SELECT policy. See migration
`20260507120300_storage_rls_client_assets.sql`.

---

## 7. No leftover plaintext security answers

```sql
select count(*) as offending_rows
from public.clients
where (package_details -> 'signup_profile') ? 'security_answer';
```

**Expected:** `0`. The plaintext field was nulled by migration
`20260507120200_cleanup_plaintext_security_answer.sql`. If this returns >
0, re-run that migration.

---

## 8. Master admin email matches frontend env

In your **Vercel** project settings (Production environment), confirm:

| Variable | Expected |
|---|---|
| `VITE_SUPABASE_URL` | Your production Supabase URL (no trailing slash). |
| `VITE_SUPABASE_ANON_KEY` | The **anon** key, never the service-role key. |
| `VITE_MASTER_ADMIN_EMAIL` | The exact email used in §3 (lowercased). |

Variables that **must NOT exist** in Vercel production:

```
VITE_SUPABASE_SERVICE_KEY
VITE_SUPABASE_SERVICE_ROLE_KEY
VITE_SERVICE_ROLE_KEY
VITE_AI_API_KEY
VITE_AI_FALLBACK_KEY
VITE_AI_API_ENDPOINT
VITE_AI_FALLBACK_ENDPOINT
VITE_AI_MODEL
VITE_AI_FALLBACK_MODEL
```

If any of those exist, delete them. The service-role key must only live
inside Edge Function secrets (not the project's frontend environment).
The AI keys would be bundled into client JS for every visitor — not safe.

---

## 9. Anon-role smoke test

In the SQL editor, switch to anon and verify reads/writes are denied:

```sql
set role anon;
select count(*) from public.clients;     -- expect 0 (RLS hides everything)
select count(*) from public.audit_logs;   -- expect 0
insert into public.clients (id, username, email, role)
  values (gen_random_uuid(), 'evil', 'evil@example.com', 'admin');
-- expect: ERROR — new row violates row-level security policy

reset role;
```

If the anon role can SELECT or INSERT into `public.clients`, an RLS
policy is too permissive — fix before launch.

---

## 10. Authenticated-role smoke test (invitee path)

```sql
-- Replace <invited-user-uid> with a real auth.users.id you control.
set local "request.jwt.claims" = '{"sub":"<invited-user-uid>","role":"authenticated"}';

-- 1. Self insert as client = OK
insert into public.clients (id, username, email, role)
values ('<invited-user-uid>', 'self_test', 'invited@example.com', 'client');

-- 2. Role escalation = REJECTED
insert into public.clients (id, username, email, role)
values ('<other-uid>', 'evil', 'evil@example.com', 'admin');
-- expect: ERROR — new row violates row-level security policy

-- 3. Cross-user insert = REJECTED
insert into public.clients (id, username, email, role)
values ('00000000-0000-0000-0000-000000000000', 'mallory', 'm@example.com', 'client');
-- expect: ERROR — new row violates row-level security policy
```

---

## Final go/no-go

You're cleared to launch the auth surfaces when:

- §1 returns RLS enabled on every listed table.
- §2 lists exactly the five expected policies on `clients` (no extras).
- §3 returns exactly one admin row matching `VITE_MASTER_ADMIN_EMAIL`.
- §4's NOT NULL columns are all covered by the frontend insert/update
  payloads.
- §5 returns `public = false` for `client-assets`.
- §6 confirms the per-user folder INSERT/SELECT policies exist.
- §7 returns 0.
- §8 matches your Vercel env exactly.
- §9 and §10 behave as commented.

Anything else is a launch blocker — fix or document the deviation before
flipping the DNS / production toggle.
