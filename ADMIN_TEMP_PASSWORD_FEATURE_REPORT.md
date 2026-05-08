# Admin Temporary Password Feature Report

## 1. Summary

Implemented a secure admin temporary-password flow for existing clients. Admins can now open a client in `/lumos-admin`, use the Security tab to set a temporary password through a Supabase Edge Function, and the client is forced to change that password on first login through `/change-password`.

The service-role key is not used in Vite, not exposed to frontend code, and not included in the production bundle.

## 2. Files Created / Modified

| File | Change |
| --- | --- |
| `supabase/migrations/20260507150200_admin_temp_password_flags.sql` | Adds password status metadata flags to `public.clients`. |
| `supabase/functions/admin-set-client-password/index.ts` | New secure Edge Function for admin-only temporary password updates. |
| `src/services/adminPasswordService.ts` | Frontend service that invokes the Edge Function with the current admin JWT. |
| `src/features/admin/sections/ClientsSection.tsx` | Adds Security Access panel and Set Temporary Password modal in the client drawer. |
| `src/features/admin/components/AdminShell.tsx` | Refreshes dashboard data after a successful security update. |
| `src/pages/ChangePasswordPage.tsx` | New forced password-change page for clients. |
| `src/components/shared/AuthRoutes.tsx` | Redirects authenticated clients with `password_must_change = true` away from protected client pages to `/change-password`. |
| `src/pages/LogInPage.tsx` | Sends clients with `password_must_change = true` to `/change-password` immediately after login. |
| `src/services/authService.ts` | Adds password flag fields to auth profile loading and `changeTemporaryPassword`. |
| `src/lib/constants.ts` | Adds `ROUTES.CHANGE_PASSWORD`. |
| `src/App.tsx` | Adds protected `/change-password` route. |
| `src/types/dashboard.ts` | Adds password metadata fields to `Client`. |
| `src/lib/supabaseClient.ts` | Adds `functions.invoke` to the not-configured Supabase stub. |
| `ADMIN_TEMP_PASSWORD_SETUP.md` | Setup, deployment, testing, and recovery documentation. |
| `ADMIN_TEMP_PASSWORD_FEATURE_REPORT.md` | This report. |

## 3. Migration Created

Created:

`supabase/migrations/20260507150200_admin_temp_password_flags.sql`

Adds:

- `password_must_change boolean not null default false`
- `password_updated_by_admin_at timestamptz`
- `password_updated_by_admin_by uuid references auth.users(id) on delete set null`
- `auth_password_pending boolean` if missing

No plaintext password or password hash is stored in `public.clients`.

## 4. Edge Function Created

Created:

`supabase/functions/admin-set-client-password/index.ts`

Behavior:

- Accepts `POST` only.
- Requires an authenticated JWT.
- Verifies the caller with `public.is_admin()`.
- Rejects non-admin users.
- Validates `clientId`.
- Validates `newPassword` with minimum length plus uppercase, lowercase, and digit requirements.
- Uses `SUPABASE_SERVICE_ROLE_KEY` only inside the Edge Function.
- Calls `supabaseAdmin.auth.admin.updateUserById(clientId, { password: newPassword })`.
- Updates `public.clients`:
  - `auth_password_pending = false`
  - `password_must_change = true`
  - `password_updated_by_admin_at = now()`
  - `password_updated_by_admin_by = caller id`
- Returns success only and never returns the password.

## 5. Admin UI Changes

Added a Security Access panel inside the existing client detail drawer Security tab.

It shows:

- Auth password pending status.
- Password must change status.
- Last admin password update date.
- `Set Temporary Password` button.

The modal includes:

- Client name/email.
- Temporary password input.
- Strong password generator.
- Copy button.
- Confirmation button.
- Warning that the password is shown once and must be changed by the client.
- Loading and error states.
- One-time success display for copying the temporary password.

The modal clears password state when closed.

## 6. Force-Change-Password Flow

Created `/change-password`.

When a client has `password_must_change = true`:

- `ProtectedRoute` redirects protected client pages to `/change-password`.
- Login redirects the client to `/change-password` immediately after successful authentication.
- The page validates the new password.
- It calls `supabase.auth.updateUser({ password })` through `changeTemporaryPassword`.
- It updates `public.clients.password_must_change = false` only after Auth password update succeeds.
- It redirects to `/profile`.
- Sign out remains available.

## 7. Security Notes

- No service-role key was added to frontend code.
- No `VITE_*_SERVICE_*` variable was added.
- `.env` variable-name scan found no dangerous Vite service-key variables.
- `dist` scan found no matches for:
  - `service_role`
  - `SUPABASE_SERVICE`
  - `VITE_SUPABASE_SERVICE`
  - `SERVICE_ROLE`
  - `sk_live`
  - `sk_test`
  - `sb_secret`
- No plaintext password is stored in database rows.
- The Edge Function does not log the password.
- The frontend does not log the password.
- Admins cannot see a client’s current password.
- Admins can only set a new temporary password.
- Non-admin callers are rejected by the Edge Function through `public.is_admin()`.
- The frontend admin route remains only a UX gate; the backend check is the real authorization.

## 8. Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `npx tsc --noEmit` | Passed | TypeScript check clean. |
| `npm run lint` | Passed with warnings | 10 existing warnings in unrelated admin/AI/availability files, no errors. |
| `npm run build` | Passed | Production build succeeded. |
| `npm audit --audit-level=low` | Passed | 0 vulnerabilities. |
| `dist` secret marker scan | Passed | No marker matches found. |
| HTTP route check | Passed | Running local Vite server returned HTTP 200 for `/change-password`. |

## 9. Manual Test Checklist

| Test | Status |
| --- | --- |
| Admin opens client drawer | Code implemented; requires browser test. |
| Admin opens Security tab | Code implemented; requires browser test. |
| Admin sets temporary password | Requires deployed Edge Function and live Supabase test. |
| Temporary password shown once | Code implemented; requires browser test. |
| Client logs in with temporary password | Requires live Supabase Auth test. |
| Client is redirected to `/change-password` | Code implemented; requires live login test. |
| Client changes password | Code implemented; requires live Supabase Auth/RLS test. |
| Client lands on `/profile` | Code implemented; requires live browser test. |
| `password_must_change` becomes false | Code implemented; requires live Supabase verification. |
| Non-admin cannot invoke Edge Function | Implemented through `public.is_admin()`; requires deployed function test. |
| Password is never stored in DB | Code/migration verified; requires live DB inspection after test. |

## 10. Deployment TODOs

- Apply migration `20260507150200_admin_temp_password_flags.sql`.
- Deploy Edge Function `admin-set-client-password`.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` exists only as an Edge Function secret.
- Verify `public.is_admin()` works for the admin account.
- Run the manual test checklist against the deployed Supabase project.
