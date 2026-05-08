# Supabase Auth Redirect URLs — Pre-Launch Checklist

This is the consolidated list of redirect URLs that **must be allow-listed**
in Supabase before the password-reset and invite-onboarding flows can work.
Without these entries, Supabase rejects the redirect and the user lands on
the project's default Site URL with no session.

## Where to add them

```
Supabase Dashboard
└─ Authentication
   └─ URL Configuration
      └─ Redirect URLs   ← paste each line below
```

## Required redirect URLs

Paste **all eight** entries exactly as written:

```
https://getlumos.studio/reset-password
https://getlumos.studio/invite-onboarding
http://localhost:8080/reset-password
http://localhost:8080/invite-onboarding
http://localhost:8082/reset-password
http://localhost:8082/invite-onboarding
http://localhost:5173/reset-password
http://localhost:5173/invite-onboarding
```

### Why each port?

| Port | Why it's needed |
|---|---|
| Production `https://getlumos.studio` | Real customers. |
| `localhost:8080` | The dev server port `vite.config.ts` exposes by default in this repo. |
| `localhost:8082` | Common fallback Vite picks when 8080 is already taken. |
| `localhost:5173` | The Vite default if a contributor changes the config locally. |

If you also use a Vercel preview URL (e.g. `lumos-foo.vercel.app`), add the
two `*-onboarding` and `*-reset-password` paths under that hostname too.

## Site URL

Make sure **Authentication → URL Configuration → Site URL** is set to:

```
https://getlumos.studio
```

The Site URL is what `{{ .SiteURL }}` resolves to in email templates and
also the fallback when no specific redirect URL is supplied.

## Email templates (recommended)

Edit **Authentication → Email Templates → Invite user** so the link points
at `/invite-onboarding`. The included `INVITE_ONBOARDING_SETUP.md` has a
template snippet.

The default **Reset password** template's `{{ .ConfirmationURL }}` already
contains the access token. As long as `forgotPasswordSendReset` calls it
with `redirectTo = ${origin}/reset-password` (it does — see
`src/services/authService.ts: forgotPasswordSendReset`), Supabase will
honour that as long as the URL is allow-listed above.

## Verifying

After saving:

1. Trigger a password reset from `/forgot-password` while signed out.
2. Open the email. The reset link should look like
   `https://<project>.supabase.co/auth/v1/verify?token=...&redirect_to=https%3A%2F%2Fgetlumos.studio%2Freset-password`.
3. Click it. The browser should land on `/reset-password` and the page
   should render the "Set new password" form (not "Invalid link").
4. Repeat the equivalent for an invitation email and `/invite-onboarding`.

If either flow lands on the home page or shows "invalid / expired", a
redirect URL is missing from the allow-list (most common cause) or the
Site URL is misconfigured.

## Hard rules

- **No `*` wildcards.** Supabase used to allow them; production projects
  should not. Always list the exact URL.
- **HTTPS only for production.** Mixed-content redirects from HTTPS to
  HTTP will be blocked by browsers.
- **Don't paste any extra URL not in this file** unless you're adding a
  staging/preview environment. Extra entries widen the redirect surface.
- **Add the new URL before deploying a new environment.** The redirect
  URL must exist when the user clicks the email link, not after.
