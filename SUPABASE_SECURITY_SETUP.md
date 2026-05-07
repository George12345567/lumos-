# Supabase Security Setup — Required Backend Steps

> **Critical:** The frontend admin/profile gates added in this branch are
> UX-only. They protect the UI from showing the wrong screen but do **not**
> stop a determined attacker from reading or writing data with a valid
> Supabase session. Real authorization must be enforced server-side via
> Row-Level Security (RLS) policies and Edge Functions. This document lists
> every backend step that must be in place **before** launch.

---

## 1. Required Environment Variables

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_MASTER_ADMIN_EMAIL=<email used as the UI gate for the admin dashboard>
# Optional: enable the mock /profile-preview demo route. Off in production.
# VITE_ENABLE_PROFILE_PREVIEW=true
```

When the URL or anon key is missing, the app refuses to log in/sign up and
shows a clear "Authentication is not configured" message. Do **not** treat
the absence of an error in dev as proof that auth works.

The **service-role key must never appear in the frontend.** Any operation
that requires it (creating a Supabase Auth user from admin, verifying a
security-question answer, etc.) must run inside an Edge Function.

---

## 2. Admin Role Strategy

The audit revealed that admin authorization was email-string comparison only.
Pick **one** of the following strategies and apply RLS uniformly.

### Strategy A — `clients.role` column (recommended; minimal extra schema)

```sql
alter table public.clients
  add column if not exists role text not null default 'client'
    check (role in ('client', 'admin'));

create index if not exists idx_clients_role on public.clients(role);
```

Promote the master admin once, manually:

```sql
update public.clients set role = 'admin' where email = lower('<your master admin email>');
```

In every admin-protected RLS policy, gate on a sub-select against this
column rather than on a JWT email claim.

### Strategy B — Custom JWT claim

If you can run an Auth Hook (`auth.hook.before_user_created`) or a server
function that mints `app_metadata.role`, gate policies with:

```sql
(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
```

Strategy A is simpler and survives JWT rotation. Strategy B avoids an extra
DB lookup. Pick one and stick with it. Do NOT keep relying on
`current_setting('request.jwt.claims', true)::jsonb->>'email'` — that is
what the existing migrations do, and it is fragile.

---

## 3. Required RLS Policies

Enable RLS on every table the frontend reads. The `clients` table policy is
the most important because the entire profile flow keys off it.

```sql
-- ─── clients ──────────────────────────────────────────────────────────────
alter table public.clients enable row level security;

create policy "client reads own row"
  on public.clients for select
  using (auth.uid() = id);

create policy "client updates own row"
  on public.clients for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "admin reads all clients"
  on public.clients for select
  using (
    exists (
      select 1 from public.clients c2
      where c2.id = auth.uid() and c2.role = 'admin'
    )
  );

create policy "admin writes all clients"
  on public.clients for all
  using (
    exists (
      select 1 from public.clients c2
      where c2.id = auth.uid() and c2.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.clients c2
      where c2.id = auth.uid() and c2.role = 'admin'
    )
  );
```

Repeat the same pattern for these admin-managed tables:

- `pricing_requests`
- `orders`
- `contacts`
- `audit_logs`
- `notifications` (read by owner; write by admin or system)
- `team_members`
- `discount_codes`

**Storage**: enable RLS on `client-assets` so each user can only upload
under their own `clientId/...` prefix.

```sql
create policy "client uploads to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## 4. Plaintext Security Answers

Plaintext `security_answer` must never live in `clients.package_details`.
The frontend has been updated to:

- Hash the answer at signup (`security_answer_hash`) and never write the
  plaintext.
- Strip any legacy plaintext value before re-saving package_details.
- Disable the security-question forgot-password branch entirely. Reset
  flows fall back to Supabase's email-link reset.

To clean up rows that already have plaintext, run once:

```sql
update public.clients
set package_details = jsonb_set(
  package_details - 'security_answer',
  '{signup_profile}',
  (package_details->'signup_profile') - 'security_answer',
  false
)
where package_details ? 'security_answer'
   or package_details->'signup_profile' ? 'security_answer';
```

If you want to restore the security-question reset UX, build it server-side:

1. Edge Function `verify-security-answer` accepts `{ email, answer }`.
2. Looks up the salted hash via the service-role client.
3. Returns `{ ok: true, reset_token: <one-time, signed, short-lived> }` on
   match, or `{ ok: false }` otherwise.
4. The frontend exchanges the reset token for a Supabase recovery session
   in a second Edge Function. **Do not ship the hash to the browser.**

Until that exists, leave `verifySecurityQuestion` returning failure (the
current behaviour) so the UX falls through to the email reset link.

---

## 5. Admin-Created Auth Users

`AdminDashboard.createClient` only writes a row in the `clients` table — it
does not create a Supabase Auth user, because the service-role key is not
(and must not be) available to the browser.

To enable admin-initiated logins, create an Edge Function:

```ts
// supabase/functions/admin-create-client/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("unauthorized", { status: 401 });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Confirm caller is an admin (look up clients.role using their JWT).
  // 2. Validate payload (email, username, etc).
  // 3. admin.auth.admin.inviteUserByEmail(email)  // sends magic-link invite
  // 4. Insert/update the matching public.clients row.
  // 5. Return { id, invited_at }.
});
```

Until this Edge Function exists, the admin UI explicitly tells the operator
that profiles must be invited via Supabase manually.

---

## 6. Token Storage / Logout Hygiene

- `persistSession: true` keeps Supabase tokens in localStorage. That is
  acceptable for a pure SPA but makes XSS catastrophic — keep your Content
  Security Policy strict and audit any third-party scripts you add. To get
  HttpOnly cookies you must put a backend (Next.js, Remix, etc.) in front
  of Supabase; this codebase does not have one yet.
- `AuthContext.logout()` now calls `queryClient.clear()` so cached query
  data does not leak between users on the same browser.
- The legacy `lumos_admin_dev` flag is removed on every Admin page mount,
  in case any user device still has it set.

---

## 7. Migrations Already in Repo

`supabase/migrations/004_fix_rls_policies.sql` already locks down
`signup_requests` and `password_reset_requests` to admin-only reads. Keep
that migration; it is consistent with the policies above. The other
migrations under `supabase/migrations/` predate this audit — review them
and confirm RLS is enabled on every table they create.

---

## 8. Pre-Launch Checklist

- [ ] `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MASTER_ADMIN_EMAIL` set in production
- [ ] `clients.role` column added; master admin promoted
- [ ] RLS enabled and tested on `clients`, `pricing_requests`, `orders`,
      `contacts`, `audit_logs`, `notifications`, `team_members`,
      `discount_codes`
- [ ] Storage RLS scoped to `auth.uid()`
- [ ] Plaintext `security_answer` purged from existing rows
- [ ] Admin-create-client Edge Function deployed (or admins are explicitly
      told to invite via Supabase)
- [ ] `verifySecurityQuestion` Edge Function deployed, OR security-question
      reset stays disabled
- [ ] CSP locked down; no inline `<script>` or wildcard sources
- [ ] Manual smoke test: anon user, normal client, master admin
