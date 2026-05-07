# Invite Onboarding Report — Lumos Website

## 1. Summary

A dedicated `/invite-onboarding` flow was added so that users invited from
**Supabase Authentication → Users → Invite user** land on a Lumos-branded
page where they:

1. Have their session verified from the invite link.
2. Set a permanent password.
3. Complete the minimum profile fields needed to activate a `public.clients`
   row owned by `auth.uid()`.
4. Get redirected to `/profile` once the row is in place.

No existing flow (sign-up, login, forgot password, reset password, profile,
admin dashboard) was modified. No service-role keys are used in the browser.
Role escalation is blocked at three layers (frontend never sets role,
service forces `role = 'client'`, RLS rejects anything else).

This work depends on **two manual Supabase steps** (a redirect URL
allow-list entry and applying one new RLS migration). Until those are done
the invite flow will not work end-to-end. See §5 and `INVITE_ONBOARDING_SETUP.md`.

---

## 2. Files Created / Modified

### Created

| Path | Purpose |
|---|---|
| `src/pages/InviteOnboardingPage.tsx` | The lazy-loaded page rendered at `/invite-onboarding`. Verifies the Supabase session, shows the form, handles all UX states. |
| `src/services/inviteOnboardingService.ts` | Calls `auth.updateUser` for the password, then UPDATEs an existing `clients` row (admin pre-created) or INSERTs a new one (`role = 'client'`). |
| `supabase/migrations/20260507130000_invited_user_self_insert.sql` | RLS policy: authenticated users may INSERT their own clients row only when `auth.uid() = id` and `role = 'client'`. |
| `INVITE_ONBOARDING_SETUP.md` | Dashboard configuration steps (redirect URLs, applying the migration, customising the invite email template). |
| `INVITE_ONBOARDING_REPORT.md` | This report. |

### Modified

| Path | Change |
|---|---|
| `src/App.tsx` | Lazy-import `InviteOnboardingPage` and register the public `/invite-onboarding` route (no guard — the page itself handles invalid sessions). |
| `src/lib/constants.ts` | Add `ROUTES.INVITE_ONBOARDING = '/invite-onboarding'`. |
| `src/lib/validation.ts` | Add `inviteOnboardingSchema` and `InviteOnboardingInput` type, mirroring the existing signup field rules but only requiring username, contact name, company, phone, and password. |
| `src/features/lead-capture/LeadCapturePopup.tsx` | Extend `blockedPaths` so the lead-capture popup never appears during onboarding (or on `/reset-password`). |

No other file was touched.

---

## 3. Route Added

| Path | Element | Guard |
|---|---|---|
| `/invite-onboarding` | `InviteOnboardingPage` (lazy) | None — the page itself renders an "invalid invitation" state when there is no Supabase session. Wrapping it in `GuestRoute` would lock out invitees who already have a fresh session from the invite link, which is exactly the case we need to allow. |

The page is reachable both when signed-in (the invite session) and when
signed-out (in which case it shows the "invalid or expired" panel).

---

## 4. Invite Flow

```
ADMIN                                   SUPABASE                            USER
─────                                   ────────                            ────

1. Auth → Users → "Invite user"  ──►   Generates token, sends email  ──►  Inbox
                                       (allow-listed redirect URL =
                                        /invite-onboarding)

                                                                            │ click invite link
                                                                            ▼

                                                                    2. Browser opens
                                                                       /invite-onboarding
                                                                    ┌─────────────────┐
                                                                    │ supabase-js     │
                                                                    │ detectSessionIn │
                                                                    │ Url=true picks  │
                                                                    │ up the token,   │
                                                                    │ creates session │
                                                                    └─────────────────┘
                                                                            ▼
                                                          3. Page calls getSession +
                                                             getInvitedUser. If no
                                                             session → "invalid invite".
                                                                            ▼
                                                          4. Page checks for an
                                                             existing clients row.
                                                             • exists + signup_completed_at
                                                                 → redirect to /profile
                                                             • else → render form
                                                                            ▼
                                                          5. User fills form
                                                             (read-only invite email,
                                                             username, contact name,
                                                             company, phone, optional
                                                             website / industry /
                                                             project summary, password
                                                             + confirm).
                                                                            ▼
                                                          6. Submit:
                                                             a) supabase.auth.updateUser
                                                                ({ password })
                                                             b) UPDATE clients (if row
                                                                existed) or INSERT
                                                                clients (role='client').
                                                                            ▼
                                                          7. AuthContext.refreshProfile()
                                                             then navigate('/profile').
```

The page also handles: `not_configured`, `no_session`, `missing_email`,
`already_onboarded`, `saving`, and `complete` states (see §7).

---

## 5. Supabase Requirements

These steps are **required** for the flow to actually work in production.
Both are documented in detail in `INVITE_ONBOARDING_SETUP.md`.

### a) Redirect URLs (Authentication → URL Configuration → Redirect URLs)

Add:

```
https://getlumos.studio/invite-onboarding
http://localhost:5173/invite-onboarding
```

Without this, Supabase will reject the redirect target and the user will
land on the default Site URL with no session attached.

### b) RLS migration

Apply `supabase/migrations/20260507130000_invited_user_self_insert.sql`.

It adds:

```sql
create policy "invited client inserts own row"
  on public.clients for insert
  to authenticated
  with check (
    auth.uid() = id
    and role = 'client'
  );
```

This permits exactly one insert path: a user inserting their own row with
`role = 'client'`. Anything else (other id, role = 'admin', etc.) is
rejected by the database.

### c) Optional but recommended

* **Customise the *Invite user* email template** so the link uses
  `/invite-onboarding` even if the default Site URL is `/`. Template
  example provided in `INVITE_ONBOARDING_SETUP.md`.
* **Pre-create the `clients` row from admin** when known in advance. The
  invite flow then UPDATEs (rather than inserts) and the self-insert RLS
  policy is never exercised.

---

## 6. Security Notes

- **No service-role key in the frontend.** Confirmed: only
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used here, which are
  the same keys the rest of the app already ships. Any admin-API operation
  (e.g. `auth.admin.inviteUserByEmail` from a future Edge Function) must
  remain server-side.
- **No role escalation.** Three independent guarantees:
  1. Frontend form has no role field.
  2. `inviteOnboardingService` hard-codes `role: 'client'` on insert and
     omits role entirely on update (so an existing admin row keeps its
     role).
  3. The new RLS policy rejects any insert with `role <> 'client'`.
- **No invite tokens stored or logged.** The page never reads or persists
  the URL token. The Supabase JS SDK manages session storage internally as
  it does for every other route. The page also never logs token values.
- **No plaintext sensitive data.** Passwords go straight to
  `supabase.auth.updateUser({ password })` and are never written to the
  `clients` table or any other storage.
- **Email is read-only.** It is sourced from `auth.user.email` and shown
  in a disabled card; the form does not accept or send an email field.
- **Anti-spam / abuse.** The lead-capture popup is suppressed on this
  route (`/invite-onboarding` added to `blockedPaths`), so it can't appear
  on top of the onboarding form and steal focus.

---

## 7. UX States Covered

| State | Trigger | UI |
|---|---|---|
| `checking` | Initial mount, verifying session | Centered spinner + "Verifying your invitation..." |
| `not_configured` | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing | "Lumos auth not configured" card + Back to Home |
| `no_session` | No session after URL parse, or session died mid-submit | "Invitation Invalid / Expired" card |
| `missing_email` | Session exists but `user.email` is empty | "Invitation incomplete" card |
| `already_onboarded` | `clients` row exists with `signup_completed_at` set | Brief spinner then redirect to `/profile` (or `/lumos-admin` if user is admin) |
| `form` | Valid session, no completed onboarding | Full form with read-only email banner |
| `saving` | Submit in progress | Disabled submit + spinner; duplicate submits suppressed |
| `complete` | Save succeeded | Success card + auto-redirect to `/profile` |
| Username / phone already taken | Insert hits unique constraint | Inline alert: "Username or phone number is already in use." |
| RLS blocks insert | Migration not applied / pre-existing admin row | Inline alert with localized message and an instruction to contact Lumos |
| Save failed (generic) | Other Supabase error | Inline alert "Could not save your details" |
| Password rejected | Supabase auth rejects password | Inline alert "Password is not accepted" |

All messages are bilingual EN/AR with RTL layout (`dir={isArabic ? 'rtl' : 'ltr'}`).

---

## 8. Commands Run

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **Exit 0**, no type errors. |
| `npm run lint` | **0 errors**, 7 pre-existing warnings unchanged (in `AiChatSidebar.tsx` and `useAvailabilityCheck.ts`; not introduced by this change). |
| `npm run build` | **Exit 0**, vite build in 20.63s. New chunk `InviteOnboardingPage-*.js` = **25.74 kB / 7.62 kB gzipped**. |

No tests script is configured in `package.json`, so `npm run test` is not
applicable.

---

## 9. Manual Test Checklist

Run these once the two Supabase setup steps are applied. Each checkbox
below is independently verifiable.

### Pre-flight

- [ ] `https://getlumos.studio/invite-onboarding` and (locally)
  `http://localhost:5173/invite-onboarding` are listed in **Authentication
  → URL Configuration → Redirect URLs**.
- [ ] Migration `20260507130000_invited_user_self_insert.sql` shows up in
  `supabase/migrations` history (or in `pg_policies` as
  `invited client inserts own row`).

### Happy path (no pre-existing clients row)

- [ ] In Supabase dashboard, **Authentication → Users → Invite user** an
  email that does not yet have a `public.clients` row.
- [ ] Open the invite email and click the link.
- [ ] Browser lands on `/invite-onboarding` with the read-only email card
  showing the invited address.
- [ ] Fill the form with a unique username + phone, plus a strong password.
  Submit.
- [ ] Toast "Your account is ready!" appears, then redirects to `/profile`.
- [ ] In Supabase, the new `public.clients` row exists with:
  * `id` matching the user's `auth.users.id`
  * `role = 'client'`
  * `signup_completed_at` set
  * `signup_source = 'admin_created'`
- [ ] Sign out, then sign in with the email + the password just chosen via
  `/client-login`. Login succeeds and the user lands on `/profile`.

### Pre-created clients row (admin pre-fills the row, then invites)

- [ ] Admin inserts a row in `public.clients` with the invitee's
  `auth.users.id`, `role = 'client'`, blank `signup_completed_at`.
- [ ] Invite the same email. Click the link.
- [ ] Onboarding page renders the form (since `signup_completed_at` is
  null). Submit.
- [ ] Same row is **updated** (no second row inserted), with the new fields
  and `signup_completed_at` populated. `role` is preserved.

### Already-onboarded user revisits the page

- [ ] After completing onboarding once, while still signed in, navigate to
  `/invite-onboarding` directly.
- [ ] Page shows "Already activated, redirecting..." and bounces to
  `/profile`.

### Invalid / expired link

- [ ] Open `/invite-onboarding` in a fresh private window with no
  invitation token.
- [ ] Page shows "This invitation link is invalid or has expired" + a Back
  to Home button.

### Role-escalation hardening

- [ ] As an authenticated invitee, attempt manually in the SQL editor:
  `insert into public.clients (id, role) values (auth.uid(), 'admin');`
  → should fail: *new row violates row-level security policy*.

### Cross-flow regression checks

- [ ] `/client-login` still works (no UI regressions).
- [ ] `/client-signup` still works (no UI regressions).
- [ ] `/forgot-password` and `/reset-password` still work.
- [ ] `/profile` loads for a freshly onboarded invitee.
- [ ] `/lumos-admin` loads for the master admin (admin invitations are not
  the recommended path, but the AdminRoute gate must still work).

---

## 10. Strict Caveats

- The flow **will not work end-to-end** until the two Supabase steps in §5
  are applied. The frontend is in place but Supabase will either reject the
  redirect or deny the row insert without them.
- This change does not migrate or backfill any existing rows. If there are
  legacy invited users in `auth.users` without a matching `public.clients`
  row, they can simply visit `/invite-onboarding` (after a fresh invite) to
  finish onboarding through this flow.
- The page deliberately **does not** wrap in `GuestRoute` or
  `ProtectedRoute`. Both would break the invite-link case (a `GuestRoute`
  bounces signed-in users; a `ProtectedRoute` would redirect users whose
  session attached but who haven't been recognised by AuthContext yet to
  the login page). The page enforces its own state machine instead.
- If a future change adds a separate **password set** screen for invitees
  (e.g. magic-link without password), revisit `inviteOnboardingService` to
  branch on whether `auth.user.app_metadata.providers` includes `email`.
  At present we always set a password because Supabase invites in this
  project default to email/password.
