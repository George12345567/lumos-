# Production Console Errors, Schema, Telegram & CSP Fix Report — Lumos

## 1. Summary

Fixed app-owned CSP inline script usage, improved Supabase error logging for the asset/team/notification paths, hardened Telegram Edge Function auth/error handling, deployed the Telegram Edge Function, and added broken-avatar fallbacks that stop repeat image requests.

Live PostgREST schema probes accepted all requested `client_assets` and `team_members` columns. Direct SQL migration/reload could not be executed from this machine because the configured DB password failed against the linked Supabase pooler.

## 2. client_assets 400 Root Cause

Current live PostgREST schema cache accepts:
`placement_project_hub`, `placement_action_center`, `placement_files_library`, `placement_brand_kit`, `identity_publish_on_delivery`, `is_downloadable`, `visibility`, `asset_type`.

Evidence: REST schema probe returned `200 OK` for those columns.

Strict conclusion: the current live error is not reproducible as a missing-column PostgREST schema-cache error from this environment. The previous 400 was most likely caused by an unapplied/stale migration or stale PostgREST schema cache at the time it was observed. If it persists during a real upload/send flow, the new structured logs will show whether it is RLS, constraint, payload, or schema.

Added local idempotent catch-up migration:
`supabase/migrations/20260509113000_client_assets_team_members_schema_catchup.sql`

## 3. team_members 400 Root Cause

Current live PostgREST schema cache accepts:
`phone`, `job_title`, `is_active`, `client_id`, `permissions`.

Evidence: REST schema probe returned `200 OK` for those columns.

Strict conclusion: the current live error is not reproducible as a missing-column schema error from this environment. The new logging in both service and admin hook paths will expose exact PostgREST code/details/hint and payload if create/update still fails.

## 4. Telegram 403 Root Cause

Likely cause: Edge Function authorization was too narrow for admin/team-triggered client notifications. It only treated callers as admin when `public.clients.id = auth.uid()` and `is_admin`/role matched. Team members linked through `team_members.user_id`, `team_members.client_id`, or email could fail that check and get `403`.

Fix:
- Frontend now explicitly sends the active Supabase access token to the function.
- Edge Function validates JWT inside the function.
- Edge Function recognizes admin access via `is_admin`, `has_admin_permission`, `clients`, and `team_members`.
- Edge Function returns structured JSON errors.
- Telegram sends are skipped before calling Telegram when auth/integration validation fails.
- Repeated frontend Telegram failures are rate-limited to avoid console spam.
- Deployed with `--no-verify-jwt` so gateway auth errors do not replace the function’s structured JSON.

Verified unauthenticated live response:
`401 {"success":false,"error":"missing_authorization","details":"Authorization Bearer token is required."}`

Authenticated valid-settings Telegram delivery still needs a real logged-in browser/settings test.

## 5. CSP Inline Script Fix

Removed the inline theme bootstrap from `index.html`.

Moved it to bundled app code:
`src/lib/themeBootstrap.ts`, imported from `src/main.tsx`.

Verified no inline `<script>` remains in `index.html` or `dist/index.html`.

## 6. Avatar 404 Fix

Added `SafeAvatarImage` with a shared broken-URL cache. It renders initials/fallback when an avatar URL is missing or fails and avoids retrying known-broken URLs during the app session.

Applied to admin/client/profile avatar surfaces including navbar, admin topbar, client sheet, admin messages, team cards, profile hero, and avatar pickers.

## 7. Browser Extension Warnings

Searched app code for `chrome.runtime`, `browser.runtime`, runtime message listeners, and extension-style messaging. No app-owned browser extension messaging exists.

Conclusion: warnings like “A listener indicated an asynchronous response by returning true...” are external browser extension noise unless reproduced in a clean browser profile with extensions disabled.

## 8. Database / RLS Changes

No unsafe public RLS policy was added.

Local migration added only idempotent column/index/constraint catch-up statements and `notify pgrst, 'reload schema';`.

Live DB migration was not applied from this machine because:
`npx supabase migration list --linked` failed with password authentication failure for the configured pooler user.

## 9. Edge Function Changes

Updated:
`supabase/functions/send-telegram-notification/index.ts`

Deployed:
`npx supabase functions deploy send-telegram-notification --project-ref clefelmqqxnjnrrlktmo --no-verify-jwt`

No Telegram bot token is exposed to frontend. Service-role use remains only inside the Edge Function.

## 10. Commands Run

- `npm install pg --no-save`
- Live REST schema probe for `client_assets` and `team_members`: passed
- Direct DB/pooler schema query: failed due DB password/auth
- `npx supabase migration list --linked`: failed due DB password/auth
- `npx supabase functions deploy send-telegram-notification --project-ref clefelmqqxnjnrrlktmo`
- `npx supabase functions deploy send-telegram-notification --project-ref clefelmqqxnjnrrlktmo --no-verify-jwt`
- Live unauthenticated Edge Function POST: structured `401`
- `npx tsc --noEmit`: passed
- `npm run lint`: passed with 11 existing warnings
- `npm run build`: passed

## 11. Manual Test Checklist

- [ ] Open `getlumos.studio`.
- [ ] Open `/profile`.
- [ ] Open `/lumos-admin`.
- [ ] Upload/send a client asset and confirm no `client_assets` 400.
- [ ] Create/update team member and confirm no `team_members` 400.
- [ ] Send test Telegram notification with valid saved settings.
- [ ] Confirm missing Telegram settings show a clear message.
- [ ] Confirm broken avatars show fallback.
- [ ] Confirm no Lumos-owned CSP inline script error.
- [ ] Confirm Notification Center still works.
- [ ] Confirm Brand Kit / Files Library still work.

## 12. Remaining TODOs

- Apply or verify `supabase/migrations/20260509113000_client_assets_team_members_schema_catchup.sql` through Supabase SQL editor or fixed DB credentials, then run `notify pgrst, 'reload schema';`.
- Run authenticated production browser tests for asset upload, team member create/update, and valid Telegram settings.
- Fix `SUPABASE_DB_PASSWORD` / pooler password in local environment if future live SQL migration work should be done from CLI.
