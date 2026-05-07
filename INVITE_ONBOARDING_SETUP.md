# Invite Onboarding — Supabase Setup Guide

This document describes the **manual Supabase Dashboard configuration** that
must be applied so the new `/invite-onboarding` route works end-to-end. The
frontend code is already in place; without these steps the invite emails will
either fail to redirect to the new page or the row insert will be blocked by
RLS.

---

## 1. Add redirect URLs (REQUIRED)

Supabase only redirects users to URLs that have been explicitly allow-listed.

**Dashboard → Authentication → URL Configuration → Redirect URLs**

Add **both** of the following:

```
https://getlumos.studio/invite-onboarding
http://localhost:5173/invite-onboarding
```

If your dev server runs on a different port (e.g. Vite default 5173 vs 8080
configured in this repo), add that port too — match the URL the developer
actually opens in their browser.

> Without these entries Supabase will reject the redirect and the user lands
> on the default site URL with no session — the page will then show
> "This invitation link is invalid or has expired."

### Why two URLs?

* `https://getlumos.studio/invite-onboarding` — production traffic.
* `http://localhost:5173/invite-onboarding` — local QA against a local dev
  server while pointing at the same Supabase project.

Add the URL for any other environments (staging, preview deploys) the same way.

---

## 2. Apply the new RLS migration (REQUIRED)

Apply migration:

```
supabase/migrations/20260507130000_invited_user_self_insert.sql
```

This adds a tightly scoped INSERT policy on `public.clients`:

* Authenticated users may insert **only their own row** (`auth.uid() = id`)
* The new row must have `role = 'client'` (no admin escalation)
* Existing client SELECT/UPDATE policies and admin ALL access are unchanged

### Apply via the Supabase CLI

```bash
supabase db push
```

### Apply via the SQL Editor

1. Dashboard → SQL Editor → "New query".
2. Paste the entire contents of
   `20260507130000_invited_user_self_insert.sql`.
3. Run.

The migration is idempotent — safe to re-run.

### Verify

```sql
select policyname
from pg_policies
where schemaname = 'public'
  and tablename = 'clients'
  and policyname = 'invited client inserts own row';
```

Should return one row.

Also verify role escalation is rejected (see the verification block at the
bottom of the migration file).

---

## 3. Inviting a user

### Option A — Dashboard

**Dashboard → Authentication → Users → Invite user**

Enter the user's email and click *Send invitation*.

The invite link uses the project's **Site URL** as the default base. Override
it for the invite via the **Redirect URL** field if Supabase exposes one in
your version of the dashboard.

If the invite email lands the user on `/` instead of `/invite-onboarding`,
update the **Site URL** under *Authentication → URL Configuration* to
`https://getlumos.studio/invite-onboarding` for the duration of the invite,
or customise the **Invite User** email template (next section).

### Option B — Customise the email template (recommended)

**Dashboard → Authentication → Email Templates → Invite user**

Replace the `{{ .ConfirmationURL }}` link target so users always land on the
onboarding page. The default template usually looks like:

```html
<a href="{{ .ConfirmationURL }}">Accept the invite</a>
```

`{{ .ConfirmationURL }}` already includes the access token query/hash. As long
as the redirect URL is allow-listed (step 1), Supabase will append the token
correctly to `/invite-onboarding`.

To force the redirect, set the **Site URL** (Authentication → URL
Configuration) to `https://getlumos.studio` and customise the template:

```html
<a href="{{ .SiteURL }}/invite-onboarding?confirmation_url={{ .ConfirmationURL | urlquery }}">
  Accept the invite
</a>
```

> If you change the email template, send yourself an invite first to verify
> the link lands on `/invite-onboarding` and the user becomes signed in.

### Option C — Edge Function / admin API

If you build a server-only admin tool that calls
`supabase.auth.admin.inviteUserByEmail` from an Edge Function, pass:

```ts
await admin.auth.admin.inviteUserByEmail(email, {
  redirectTo: 'https://getlumos.studio/invite-onboarding',
});
```

The service-role key for `admin.auth.admin.*` MUST stay server-side. Never
ship it to the browser. See `SUPABASE_SECURITY_SETUP.md`.

---

## 4. End-user flow

1. Admin sends invite from the dashboard (or via Edge Function).
2. User receives the invite email.
3. User clicks the invite link.
4. Browser opens `/invite-onboarding`. The Supabase JS SDK (with
   `detectSessionInUrl: true`) auto-handles the token in the URL and
   establishes the session.
5. The page checks the session, then either:
   * Shows "Already activated, redirecting..." and bounces to `/profile` if
     the user already finished onboarding.
   * Shows the onboarding form (read-only invitation email + username, full
     name, company, phone, optional website/industry/project summary, and
     password fields).
6. User submits.
   * The page calls `supabase.auth.updateUser({ password })` to set their
     password.
   * Then it inserts/updates the matching `public.clients` row using the
     authenticated user's RLS context.
7. AuthContext refreshes; user is redirected to `/profile`.

---

## 5. Troubleshooting

**"This invitation link is invalid or has expired."**

* The redirect URL is not allow-listed in step 1.
* The user already accepted the invite from a different browser/device and
  the token was consumed.
* The token genuinely expired (default lifetime: 24h). Resend the invite.

**"We couldn't create your client profile. Please contact Lumos to activate it."**

This is the localized form of `invite.rls_blocked`. Most common causes:

* The migration in step 2 has not been applied.
* The admin pre-created a row for this user with `role = 'admin'`. The
  invitee can't update an admin row from this flow on purpose. Decide
  whether to demote them to `client` or onboard them out-of-band.

**"Username or phone number is already in use."**

`clients` has unique constraints on `username` and `phone`. Pick another
value. If the user truly is a returning client whose old account exists,
delete or rename the old row from the admin dashboard before re-inviting.

**The user lands on `/` instead of `/invite-onboarding`**

The email template still points at the default Site URL. Either change Site
URL to include `/invite-onboarding` or customise the *Invite user* template
(step 3).

---

## 6. Security notes

* No service-role key is read or sent from the browser. Every Supabase call
  on this page runs as the authenticated invitee.
* Role escalation is blocked at the database level: the new INSERT policy
  rejects any attempt to set `role = 'admin'`.
* The invitee's email is read from the auth session. The form does not
  accept email as input — it shows it read-only.
* Passwords are validated client-side (`isStrongPassword`) and again by
  Supabase Auth before they are accepted.
* No invite tokens are persisted to localStorage by this page. The Supabase
  SDK manages its own session storage; this code never reads or logs the
  token.
