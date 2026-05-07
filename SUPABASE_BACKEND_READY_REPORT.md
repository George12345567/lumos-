# Supabase Backend Ready Report — Lumos Website

## 1. Summary

The Supabase-side scaffolding required for production is now in this
repo, in the form of four idempotent SQL migrations plus three planning
documents. The frontend was not changed.

**The migrations have been _created_, not _applied_.** A maintainer must
still run them against the production project, promote the master admin
manually, create the `client-assets` bucket, and run the smoke tests in
`SUPABASE_PRODUCTION_DEPLOY_CHECKLIST.md`. Until those manual steps are
done, the system is **not** production-ready.

I also discovered one critical environment misconfiguration during this
audit: the local `D:\my web lumos\LAST LUMOS PROCECC\.env` file declares
`VITE_SUPABASE_SERVICE_KEY`. Because anything `VITE_*`-prefixed is
inlined into the Vite bundle, this value would have been shipped to
every browser if it had ever been bundled. **The Supabase service-role
key must be rotated immediately and the variable removed from `.env`.**
No code references the variable, so the only risk is whatever build was
produced while the variable was set.

## 2. Environment Variables Status

The status below was confirmed by reading `.env` for **variable names
only**. No values are printed in this report or persisted anywhere.

| Variable | Status | Safe for Frontend? | Notes |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | present | ✅ yes | Required. |
| `VITE_SUPABASE_ANON_KEY` | present | ✅ yes | Required. Anon key respects RLS. |
| `VITE_MASTER_ADMIN_EMAIL` | present | ✅ yes (UI gate only) | Used by `isAdminEmail()` for UI gating. Real authorization is `public.is_admin()`. |
| `VITE_SUPABASE_SERVICE_KEY` | **present and DANGEROUS** | ❌ NO — must be removed | Anything `VITE_*` is bundled to the browser. **Rotate the service-role key now and delete this variable from `.env`.** No code references it. |
| `DATABASE_URL` | present | ❌ backend-only | Used by CLI/migrations. Do not bundle. |
| `SUPABASE_DB_PASSWORD` | present | ❌ backend-only | Used by CLI/migrations. Do not bundle. |
| `VITE_AI_API_KEY`, `VITE_AI_FALLBACK_KEY`, `VITE_AI_API_ENDPOINT`, `VITE_AI_FALLBACK_ENDPOINT`, `VITE_AI_MODEL`, `VITE_AI_FALLBACK_MODEL` | present | ⚠️ depends | Out of scope of this audit; AI keys in the browser are a separate concern (they are visible to all users). |
| `SUPABASE_SERVICE_ROLE_KEY` (correct name) | not present in `.env` | n/a | This is the correct backend-only name; set it via `supabase secrets set` for Edge Functions. |

## 3. Files Created / Modified

Created:

- `supabase/migrations/20260507120000_add_clients_role_and_is_admin.sql`
- `supabase/migrations/20260507120100_enable_rls_and_policies.sql`
- `supabase/migrations/20260507120200_cleanup_plaintext_security_answer.sql`
- `supabase/migrations/20260507120300_storage_rls_client_assets.sql`
- `SUPABASE_EDGE_FUNCTIONS_TODO.md`
- `SUPABASE_PRODUCTION_DEPLOY_CHECKLIST.md`
- `SUPABASE_BACKEND_READY_REPORT.md` (this file)

Modified:

- _None._ The frontend was intentionally left untouched in this phase
  (per instructions). The previous phase already removed
  `VITE_SUPABASE_SERVICE_KEY` from `src/vite-env.d.ts` and
  `.env.example`. The actual `.env` still contains it; that is the
  manual step flagged in §2.

## 4. Migrations Created

| Migration | Purpose |
| --- | --- |
| `20260507120000_add_clients_role_and_is_admin.sql` | Backfills `clients.role` to `'client'`, adds NOT NULL + CHECK + index, creates `public.is_admin()` SECURITY DEFINER helper with `search_path` pinned to `public, pg_temp`. |
| `20260507120100_enable_rls_and_policies.sql` | Enables RLS on every public table the frontend touches and installs owner+admin policies via `public.is_admin()`. Replaces the older email-claim-based policies in `004_fix_rls_policies.sql` for `signup_requests` and `password_reset_requests`. |
| `20260507120200_cleanup_plaintext_security_answer.sql` | Strips legacy plaintext `security_answer` from `clients.package_details` and the `signup_profile` sub-object. Drops the top-level `clients.security_answer` and `signup_requests.security_answer` columns so they cannot be re-populated. Preserves `security_answer_hash`. |
| `20260507120300_storage_rls_client_assets.sql` | Storage policies for the `client-assets` bucket: per-uid folder ownership for users, full access for admins, no public write. |

All four migrations are idempotent. Re-running them is safe.

## 5. RLS Policies

| Table | RLS Enabled | Client Access | Admin Access | Notes |
| --- | --- | --- | --- | --- |
| `public.clients` | ✅ | select/update own row (cannot escalate `role`) | full | `auth.uid() = id`. The update policy explicitly rejects role changes coming from the client policy. |
| `public.pricing_requests` | ✅ | select own (`client_id = auth.uid()`); anon insert allowed for the public pricing modal | full | Anon insert is required for the lead form. Anon read/update is forbidden. |
| `public.orders` | ✅ | select own (`client_id = auth.uid()`) | full | No anon access. |
| `public.contacts` | ✅ | anon insert allowed for the public contact form | full | Anon read forbidden. |
| `public.audit_logs` | ✅ | none | select + insert | Server-side automation should write via the service-role key from an Edge Function (bypasses RLS). |
| `public.notifications` | ✅ | select/update own (`user_id = auth.uid()` AND `user_type = 'client'`) | full | Marking notifications as read works for clients without admin help. |
| `public.team_members` | ✅ | anon read of `is_active = true` rows only | full | Marketing site shows the team. Decision documented inline; can be tightened later. |
| `public.discount_codes` | ✅ | none | full | Validation should happen via RPC/Edge Function. Anon enumeration is blocked. |
| `public.saved_designs` | ✅ | full on own rows (`client_id = auth.uid()`) | select only | Admins can read designs but cannot mutate them silently. |
| `public.signup_requests` | ✅ (re-affirmed) | anon insert (existing); admin select via `is_admin()` | select only | Replaced the old JWT-claim email check from `004_fix_rls_policies.sql`. |
| `public.password_reset_requests` | ✅ (re-affirmed) | anon insert (existing); admin select via `is_admin()` | select only | Same. |

Tables not covered (and why):

| Table / view | Why skipped |
| --- | --- |
| `public.dashboard_stats`, `public.monthly_revenue`, `public.recent_contacts`, `public.recent_pricing_requests` | These are views — they inherit security from the underlying tables. If they are exposed to the frontend, add policies on the base tables, not the view. |

## 6. Storage Policies

`storage.objects` policies for `client-assets`:

- Owner (`auth.uid()`) can SELECT / INSERT / UPDATE / DELETE objects whose
  first folder segment equals `auth.uid()::text`.
- Admin (`public.is_admin()`) can do anything in the bucket.
- No public/anon access.

**Manual step required:** create the `client-assets` bucket in the
Supabase dashboard and mark it private. Migrations cannot create buckets.

**Frontend follow-up flagged in the migration:** the existing
`profileService.uploadAvatar` writes to a flat
`profile-avatars/<id>-<ts>-<name>` layout, which does not match the
per-uid policy. Owner reads will not see those files until the layout is
migrated to `<auth.uid()>/avatars/<filename>`. Admins can still see them.
This is a frontend tweak that can ship after launch; admins remain
unaffected.

## 7. Plaintext Security Answer Cleanup

`20260507120200_cleanup_plaintext_security_answer.sql` does three things:

1. `update public.clients` to strip `package_details.security_answer` and
   `package_details.signup_profile.security_answer` while preserving
   `security_answer_hash`. Uses safe jsonb operators with `coalesce` so
   rows with NULL `package_details` are untouched.
2. Drops the top-level `clients.security_answer` column.
3. Drops the legacy `signup_requests.security_answer` column.

The hash column (`security_answer_hash`) is preserved everywhere it
exists. The frontend already only writes the hash (verified by grepping
`src/`).

## 8. Edge Functions Status

| Function | Status | Notes |
| --- | --- | --- |
| `admin-create-client` | **Not deployed.** Spec written. | See `SUPABASE_EDGE_FUNCTIONS_TODO.md` §1. Until deployed, the admin dashboard creates a profile-only row and tells the operator to invite via Supabase manually. |
| `verify-security-answer` | **Not deployed (optional).** Spec written. | See `SUPABASE_EDGE_FUNCTIONS_TODO.md` §2. The frontend already falls through to Supabase email reset if this is missing. |
| `supabase/functions/` directory | does not exist | Will be created by `supabase functions new <name>` when the maintainer implements one of the above. |

Until the first Edge Function is implemented, the Supabase CLI is not
required at runtime — the migrations alone are enough.

## 9. Manual Supabase Steps Still Required

These cannot be automated from a migration. They must happen against the
production project before launch.

1. **Rotate the service-role key.** The local `.env` contains
   `VITE_SUPABASE_SERVICE_KEY`. Rotate the key in Supabase → Settings →
   API, then delete that variable from `.env` and any deployed
   environment. After rotation, store the new key only as
   `SUPABASE_SERVICE_ROLE_KEY` in Supabase Edge Function secrets — never
   `VITE_*`.
2. **Set production env vars:** `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_MASTER_ADMIN_EMAIL`.
3. **Apply the four new migrations** in order via `supabase db push` (or
   the Supabase dashboard SQL editor).
4. **Promote the master admin** with the SQL in
   `SUPABASE_PRODUCTION_DEPLOY_CHECKLIST.md` §4.
5. **Create the `client-assets` storage bucket** as private in the
   dashboard (the migration only installs policies, not the bucket).
6. **(Optional)** Implement and deploy the two Edge Functions in
   `SUPABASE_EDGE_FUNCTIONS_TODO.md`. Until then, the documented
   fallbacks ship in the frontend.
7. **Run the smoke-test plan** in
   `SUPABASE_PRODUCTION_DEPLOY_CHECKLIST.md` §7 (anonymous, normal client,
   master admin) and confirm `select count(*) … security_answer …`
   returns 0.

## 10. Commands Run

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | ✅ exit 0 |
| `npm run build` (`vite build`) | ✅ exit 0 |
| `npm run lint` | ❌ exit 1 — same 7 pre-existing errors in unrelated files (EnhancedNavbar, useCurrency, db.ts, submissionService, AiChatSidebar). 0 new errors. 0 errors in any new SQL or doc. |
| `npm run typecheck` | not present in `package.json`. `tsc --noEmit` is the equivalent. |
| `grep -r "service_role" dist/` | no matches — confirms the production bundle does not embed any service-role string. |
| `supabase db lint` / `supabase migration list` / `supabase db diff` | **not run** — Supabase CLI is not installed in this environment. The maintainer should run these against the linked project before pushing. |

## 11. Security Verdict

- **Is the frontend free of service-role key exposure?**
  In source code, **yes** — no file references any service key.
  In the local `.env`, **no** — `VITE_SUPABASE_SERVICE_KEY` is set and
  must be rotated and removed (manual step).
- **Is the admin bypass gone?** Yes (verified in this round and the
  previous one). Only the defensive `localStorage.removeItem` cleanup
  remains.
- **Is RLS prepared?** Yes — migrations exist for `clients`,
  `pricing_requests`, `orders`, `contacts`, `audit_logs`,
  `notifications`, `team_members`, `discount_codes`, `saved_designs`,
  plus `signup_requests` / `password_reset_requests` re-affirmed via
  `is_admin()`, plus storage on `client-assets`.
- **Is RLS actually applied?** **No** — the migrations have only been
  authored. They must still be pushed to the production database.
- **Is the system production-ready?** **No** — see the manual steps in
  §9.

## 12. Launch Verdict

| Surface | Verdict | Conditions |
| --- | --- | --- |
| **Public marketing site (`/`, `/demo`, `/services/:slug`)** | ✅ Safe to launch. | No auth dependency. |
| **Auth pages (`/client-login`, `/client-signup`, `/forgot-password`, `/reset-password`)** | ⏸ Not yet. | Requires §9 steps 2 (env vars) and 3 (migrations applied). Without RLS on `clients`, an authenticated client could read other clients' rows. |
| **Client profile (`/profile`)** | ⏸ Not yet. | Same as auth pages, plus storage bucket from §9 step 5 if avatar uploads are required at launch. |
| **Admin dashboard (`/lumos-admin`)** | ⛔ **Do not launch.** | Requires §9 steps 1–4 and §7 smoke tests. Without `clients.role` promotion + RLS + service-role rotation, admin data is reachable from any authenticated session. |

The site becomes production-ready only when **all** of the following are
true at the same time:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MASTER_ADMIN_EMAIL`
  set in production; no `VITE_*_SERVICE_*` set anywhere.
- Service-role key rotated; old value invalid.
- Four new migrations applied.
- Master admin promoted via the documented `update`.
- `client-assets` bucket created and private.
- Smoke tests A/B/C/D pass.

Until then: the marketing site can ship; the auth/profile/admin surfaces
must wait.
