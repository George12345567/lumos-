# Auth Fix Report — Lumos Website

## 1. Summary

This branch addresses every P0/P1 issue and most of the P2/P3 items in
`AUTH_AUDIT_REPORT.md`. The biggest changes are:

- The admin bypass via `?dev=true` and `localStorage.lumos_admin_dev` is
  gone, and the legacy flag is actively cleared on every admin-page mount.
- Auth state and profile state are now separate in `AuthContext`, so a
  transient profile-fetch failure no longer logs the user out.
- A new central config (`src/config/auth.ts`) is the single source of truth
  for "is Supabase configured" and "is this email the master admin." The
  hard-coded admin email is gone from the bundle.
- Login, signup, forgot-password, and reset-password all show a clear
  "Authentication is not configured" banner and disable submit when the
  Supabase env vars are missing instead of pretending success.
- Plaintext `security_answer` is no longer persisted from the frontend, the
  admin form no longer accepts it, and the admin client view no longer
  surfaces it. The forgot-password security-question branch falls back to
  the Supabase email-reset flow until a server-side verifier exists.
- `useProfileMutation` correctly checks `result.success` so a failed save no
  longer reports success.
- `ProtectedRoute` now supports `?redirectTo=` (validated as an internal
  path) and `AdminRoute` shows a 403 page instead of silently redirecting.
- `/profile-preview` is dev-only unless `VITE_ENABLE_PROFILE_PREVIEW=true`.
- `/clients/dashboard` route constant (no actual route) is removed.
- Duplicate `Order` interface in `src/types/dashboard.ts` is resolved by
  renaming the legacy shape to `LegacyOrder`.

What is **not** fixed in code and is documented as a required Supabase step
in `SUPABASE_SECURITY_SETUP.md`:

- Server-side admin role enforcement (RLS policies + a `clients.role`
  column or JWT claim).
- Edge Functions for admin-created auth users and secure
  security-question verification.
- Purging legacy plaintext security_answer values from existing rows.

## 2. Files Changed

Created:

- `src/config/auth.ts`
- `SUPABASE_SECURITY_SETUP.md`
- `AUTH_FIX_REPORT.md`

Modified:

- `src/App.tsx`
- `src/config/env.ts`
- `src/lib/supabaseClient.ts`
- `src/lib/constants.ts`
- `src/services/authService.ts`
- `src/context/AuthContext.tsx`
- `src/components/shared/AuthRoutes.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/pages/LogInPage.tsx`
- `src/pages/SignUpPage.tsx`
- `src/pages/ForgotPasswordPage.tsx`
- `src/pages/ResetPasswordPage.tsx`
- `src/features/client-profile/ClientProfilePage.tsx`
- `src/features/client-profile/hooks/useProfileMutation.ts`
- `src/features/client-profile/sections/AccountSection.tsx`
- `src/types/dashboard.ts`
- `src/components/admin/dashboard/OrdersKanban.tsx`

## 3. P0 Fixes

### P0-1 — Admin bypass via URL/localStorage

**Issue:** `AdminDashboard.tsx` granted access if `?dev=true` or
`localStorage.lumos_admin_dev === 'true'` was present.

**What changed:**

- The `checkAuth` `useEffect` that read those flags is replaced with a
  context-driven gate. `AdminDashboard` now reads `useIsAdmin()` /
  `useSessionEmail()` / `useAuthConfigured()` and only calls `loadData()`
  when authenticated as the configured master admin.
- A defensive `localStorage.removeItem('lumos_admin_dev')` runs on mount so
  any user device that still carries the legacy flag is cleaned up.
- `AdminRoute` returns a proper 403 component when the caller is not the
  master admin (instead of silently redirecting to `/`).

**Files:** `src/pages/AdminDashboard.tsx`,
`src/components/shared/AuthRoutes.tsx`.

**Backend follow-up:** The frontend gate is UX only. Real authorization is
in `SUPABASE_SECURITY_SETUP.md` §3 (admin RLS) and §2 (role strategy).

### P0-2 — Auth disabled when env is missing

**Issue:** When `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` were missing,
`supabaseClient` returned a stub whose login simply failed, so the UI
looked normal but no auth ever happened.

**What changed:**

- New `src/config/auth.ts` exports `isSupabaseConfigured()` and
  `getSupabaseConfigError()`.
- All four auth pages (`LogInPage`, `SignUpPage`, `ForgotPasswordPage`,
  `ResetPasswordPage`) consume `useAuthConfigured()`. They:
  - Show an amber config banner when `false`.
  - Disable the submit button.
  - Map the new `auth.not_configured` error to a localized "Authentication
    is not configured" toast.
- `authService.login/signup/resetPassword/...` early-return
  `{ success: false, error: 'auth.not_configured' }` when not configured,
  even if the stub would have happened to "succeed."
- `supabaseClient.ts` logs a single big console error in production builds
  when env is missing, so misdeploys are visible.
- The stub `single()`/`insert()`/`upsert()` calls now return a proper
  `auth.not_configured` error so admin code paths can react.

**Files:** `src/lib/supabaseClient.ts`, `src/services/authService.ts`,
`src/context/AuthContext.tsx`, `src/pages/LogInPage.tsx`,
`src/pages/SignUpPage.tsx`, `src/pages/ForgotPasswordPage.tsx`,
`src/pages/ResetPasswordPage.tsx`.

**Backend follow-up:** Set the env vars in production. See
`SUPABASE_SECURITY_SETUP.md` §1.

### P0-3 — Frontend-only admin authorization

**Issue:** Admin gate was a hardcoded email match in the bundle, plus a
JS-only check.

**What changed:**

- `ADMIN_EMAIL = 'george30610@compit.aun.edu.eg'` is removed from
  `AdminDashboard.tsx`.
- `isAdmin` is now derived only from
  `sessionEmail === VITE_MASTER_ADMIN_EMAIL` via `isAdminEmail()` in
  `src/config/auth.ts`. There is one source of truth.
- `audit_logs.changed_by` and other "audited by" fields use
  `sessionEmail || 'unknown_admin'` instead of a constant string.
- `AdminRoute` and `AdminDashboard` now both use the same context state.

**Files:** `src/config/auth.ts`, `src/context/AuthContext.tsx`,
`src/components/shared/AuthRoutes.tsx`, `src/pages/AdminDashboard.tsx`.

**Backend follow-up:** Add `clients.role` (or a JWT claim) and gate every
admin-protected RLS policy on it. See `SUPABASE_SECURITY_SETUP.md` §2/§3.

### P0-4 — Plaintext security answers

**Issue:** `security_answer` plaintext was written into
`clients.package_details.signup_profile` and the admin form let admins type
or read it.

**What changed:**

- `authService.buildPackageDetails` no longer writes `security_answer`. It
  also calls `stripLegacyPlaintextSecurityAnswer()` on any pre-existing
  payload before re-saving so old plaintext is removed in place.
- The admin client form (Add/Edit dialog) no longer has a "Security Answer"
  input. The Security Question hint explains that answers are stored as a
  hash at signup and cannot be edited from admin.
- `ClientForm.password` is also removed and the dialog explicitly states
  that admin-creation produces a profile only.
- The "Security Answer" panel inside the admin's per-client view is
  removed.
- `verifySecurityQuestion()` is short-circuited to always return failure
  with code `security.disabled_use_email_reset`. The forgot-password page
  now skips the security-question step and goes straight to Supabase's
  email reset link, regardless of what `forgotPasswordCheckEmail` reports.
- `Client.security_answer` is marked `@deprecated` in the type so future
  usage stands out in review.

**Files:** `src/services/authService.ts`, `src/pages/AdminDashboard.tsx`,
`src/pages/ForgotPasswordPage.tsx`, `src/types/dashboard.ts`.

**Backend follow-up:** Run the cleanup `UPDATE` in
`SUPABASE_SECURITY_SETUP.md` §4 to scrub historical rows. If the
security-question reset is desired, build the Edge Functions described in
that section.

## 4. P1 Fixes

### P1-1 — Hardcoded admin email

Removed. See P0-3.

### P1-2 — Profile update success check

`useProfileMutation.flush` now treats the result as
`{ success: boolean }`, throws when `success !== true`, and pushes the
unsaved updates back into `pending` so the user can retry. Previously the
returned object was always truthy, which silently masked save failures.

**Files:** `src/features/client-profile/hooks/useProfileMutation.ts`.

### P1-3 — Admin client creation doesn't create auth user

The form no longer collects a password. `createClient` writes a `clients`
row only and the success toast explicitly tells the operator that a
Supabase invite is required for the user to log in.
`signupProfile.auth_password_pending` is forced to `false` for
admin-created profiles. Implementing real "create auth user" requires the
service-role key and therefore an Edge Function — see
`SUPABASE_SECURITY_SETUP.md` §5.

**Files:** `src/pages/AdminDashboard.tsx`.

### P1-4 — Session presence without profile = forced logout

`AuthContext` now tracks `hasSession` (auth) and `client/profileLoading/
profileError` (profile) independently. `isAuthenticated` is bound to
`hasSession`, so a transient `getClientProfile` failure leaves the user
logged in. `ClientProfilePage` shows a friendly retry/empty state when the
profile cannot be fetched, with a "Try again" button (`refreshProfile`)
and an explicit "Sign out."

**Files:** `src/context/AuthContext.tsx`,
`src/features/client-profile/ClientProfilePage.tsx`.

## 5. P2/P3 Fixes

### P2-1 — localStorage tokens

We continue to rely on Supabase's default `persistSession: true` because
this is a pure SPA without a backend that can set HttpOnly cookies.
`AuthContext.logout()` now calls `queryClient.clear()` to wipe React
Query state on logout. The constraint and recommended migration path are
documented in `SUPABASE_SECURITY_SETUP.md` §6.

**Files:** `src/context/AuthContext.tsx`.

### P2-2 — Profile edit validation

`AccountSection.EditableFieldInline` now accepts `validate` and
`normalize` props. Email, phone, website, and company-name fields all
hook in: invalid input shows a localized inline error and is rejected
before reaching the mutation. Website inputs are normalized through
`normalizeWebsiteUrl()` (https-only).

**Files:**
`src/features/client-profile/sections/AccountSection.tsx`,
`src/lib/validation.ts` (re-uses existing helpers).

### P2-3 — Misleading availability check in stub mode

`checkUsernameAvailable/checkEmailAvailable/checkPhoneAvailable` now
short-circuit to `"unknown"` when Supabase is not configured, so the
signup UI surfaces "Could not verify" instead of a misleading "Available."
Combined with the disabled submit button this prevents the user from
appearing to complete signup while the backend is missing.

**Files:** `src/services/authService.ts`.

### P2-4 — Inconsistent admin identity

Both `AuthContext.isAdmin` and any admin-side code now route through
`isAdminEmail(email)` from `src/config/auth.ts`. There is no separate
hardcoded value.

**Files:** `src/config/auth.ts`, `src/context/AuthContext.tsx`,
`src/pages/AdminDashboard.tsx`.

### P2-5 — `/profile-preview`

The route is registered only when `import.meta.env.DEV` is true or the new
flag `VITE_ENABLE_PROFILE_PREVIEW=true` is set. In a normal production
build the route 404s.

**Files:** `src/App.tsx`, `src/config/auth.ts`, `src/config/env.ts`.

### P3-1 — Return-to redirect after login

`ProtectedRoute` builds a `redirectTo=` query param that is validated as
an internal path (no `//`, no scheme). `LogInPage` reads it from
`useSearchParams`, validates again, and navigates there on success.
`useEffect` for already-authenticated users also honors the redirect.

**Files:** `src/components/shared/AuthRoutes.tsx`,
`src/pages/LogInPage.tsx`.

### P3-2 — Duplicate `Order` interface

The legacy shape (with `client_name`, `package_type`) is renamed
`LegacyOrder`. The canonical `Order` (with `guest_*` fields,
`payment_status`, etc.) keeps its name. `OrdersKanban.tsx` imports
`LegacyOrder as Order` so its existing JSX keeps working.

**Files:** `src/types/dashboard.ts`,
`src/components/admin/dashboard/OrdersKanban.tsx`.

### P3-3 — Reset password route guard

`ResetPasswordPage` immediately marks the session invalid when Supabase
isn't configured (no fake "checking" spinner) and falls through to the
existing "Invalid Link" view, which already covers an unauthenticated
visit. The page also disables submit on `!authConfigured`.

**Files:** `src/pages/ResetPasswordPage.tsx`.

### P3-4 — `/clients/dashboard` constant

Removed from `src/lib/constants.ts`. Nothing else referenced it.

**Files:** `src/lib/constants.ts`.

## 6. Supabase / Backend Requirements

See `SUPABASE_SECURITY_SETUP.md` for the full setup. In short:

| Requirement | Status |
| --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set in production | **Required at deploy time** |
| `VITE_MASTER_ADMIN_EMAIL` set | **Required** |
| `clients.role` column (or JWT `app_metadata.role`) | **Required, ship before launch** |
| RLS on `clients`, `pricing_requests`, `orders`, `contacts`, `audit_logs`, `notifications`, `team_members`, `discount_codes` | **Required, ship before launch** |
| Storage RLS on `client-assets` scoped to `auth.uid()` | **Required, ship before launch** |
| Cleanup `UPDATE` to remove existing plaintext `security_answer` | **Required, ship before launch** |
| Edge Function `admin-create-client` (uses service role) | Optional — until shipped, admin operators must invite users from the Supabase dashboard |
| Edge Function `verify-security-answer` | Optional — until shipped, security-question reset stays disabled and email reset is used |
| HttpOnly cookie session storage | Not feasible without a server in front; documented constraint |

## 7. Routes Status

| Route | Status After Fix | Notes |
| --- | --- | --- |
| `/client-login` | Works when configured. Disabled (banner + grayed submit) when env is missing. Honors `?redirectTo=`. | |
| `/client-signup` | Works when configured. Banner + disabled submit when not. Availability check returns `"unknown"` instead of false-positive. | |
| `/forgot-password` | Always uses Supabase email reset. Security-question step is disabled until an Edge Function exists. | |
| `/reset-password` | Detects invalid/expired links and missing config. Disabled submit when not configured. | |
| `/profile` | Protected. Authenticated users with a missing profile see a retry/empty state instead of being logged out. | |
| `/profile-preview` | **Dev-only.** Hidden in production unless `VITE_ENABLE_PROFILE_PREVIEW=true`. | |
| `/lumos-admin` | UI-protected by `AdminRoute`. Bypass flags removed. Renders 403 page for non-admins. | Real protection requires RLS — see setup doc. |
| `/clients/dashboard` | Removed (constant deleted, no actual route). | |

## 8. Security Notes

- The frontend cannot enforce authorization on its own. Every admin-only
  table must have RLS that gates on a server-trusted role/claim, not on a
  client-supplied email string.
- localStorage-based session storage means any XSS will leak Supabase
  tokens. Keep CSP strict and audit any third-party scripts.
- Even after these fixes, an authenticated client could still call
  `supabase.from('clients').update(...).eq('id', otherUserId)` if RLS on
  `clients` is not enabled. Frontend cannot guard against this.
- The admin-create-client form does **not** create an auth user. Until the
  Edge Function exists, treat admin-created profiles as pending invites.

## 9. Commands Run

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **0 errors** (`vite build` succeeds, ~15s) |
| `npm run lint` | 7 pre-existing errors in unrelated files (`EnhancedNavbar.tsx`, `useCurrency.tsx`, `db.ts`, `submissionService.ts`, `AiChatSidebar.tsx`); 0 errors introduced by this change. |
| `npm run typecheck` | Not present in `package.json`. `npx tsc --noEmit` is the equivalent. |

## 10. Final Verdict

- **Is auth safer now?** Yes — the admin URL/localStorage bypass is gone,
  the configured-admin check is centralised, plaintext security answers no
  longer round-trip through the frontend, and the user is no longer logged
  out by a transient profile error.
- **Is admin bypass removed?** Yes (frontend). Real authorization still
  needs server-side RLS.
- **Is profile safer?** Yes — `useProfileMutation` correctly detects save
  failures, profile fields are validated and normalised before saving, and
  a missing profile no longer kicks the user back to login.
- **What remains before production launch?**
  1. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
     `VITE_MASTER_ADMIN_EMAIL` in production.
  2. Add `clients.role` (or equivalent JWT claim) and promote the master
     admin.
  3. Enable RLS on every table the frontend reads, with the admin/owner
     policies in `SUPABASE_SECURITY_SETUP.md` §3. Same for storage.
  4. Run the cleanup migration to remove legacy plaintext security
     answers.
  5. Decide on the admin-create-client and security-question Edge Functions
     (or accept the documented manual fallback).
  6. Address the seven pre-existing lint errors in unrelated files if you
     want a clean `npm run lint`.

Without those backend steps, the site is *not* yet safe to launch even
with these frontend fixes.
