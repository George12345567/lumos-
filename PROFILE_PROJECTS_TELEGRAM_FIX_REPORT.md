# Profile, Projects & Telegram Fix Report — Lumos

## 1. Profile Error Flash

Cause: `ClientProfilePage` showed the missing-profile error whenever auth had a client row but `useClientProfile()` had not finished loading the profile yet. Auth initialization could also briefly mark auth loading complete before the profile fetch state was visible to the page.

Fix:
- Added a full profile skeleton state while auth/profile data is unresolved.
- Updated `useClientProfile()` to resolve cleanly when no client id is available.
- Set `profileLoading` before background profile retry starts.
- The “No client profile linked” message now only appears after loading finishes and no client/profile is truly available.

## 2. Overview Double-Click Bug

Cause: profile tab state and `?tab=` URL state could race. The sync effect ignored an empty/missing `tab`, so clicking Overview removed the URL param but the local state could be pushed back to the previous tab.

Fix:
- `ClientProfilePage` now derives the active tab from the URL directly.
- Missing/invalid `?tab=` resolves to `overview`.
- Clicking Overview once removes `tab` and immediately renders Overview.
- `/profile?tab=identity` still opens Identity directly.

## 3. Admin Projects UX

Changed `Admin -> Projects` from large dense cards to:
- top stats row;
- status filters;
- search by client, invoice, project, or service;
- compact project list/table;
- clear status badges;
- inline progress;
- client/project name;
- invoice;
- current service;
- assigned member;
- Open, Message, and Delete actions.

The existing Project Workroom drawer remains in place and still contains service workroom, deliverables, notes, status actions, uploads, and Identity publishing.

## 4. Duplicate Project Prevention

Added migration:
- `supabase/migrations/20260508183000_profile_projects_telegram_hardening.sql`

Database behavior:
- Existing duplicates for the same `pricing_request_id` are repaired by keeping the oldest project linked to the request.
- Duplicate project rows are not deleted; their `pricing_request_id` is detached and an admin note/status-history entry is added.
- `pricing_requests.converted_project_id` is backfilled to the kept project.
- Unique index is enforced: `projects_pricing_request_id_unique`.
- `create_project_from_pricing_request()` now uses an advisory transaction lock and returns an existing valid project instead of creating duplicates.

## 5. Permanent Project Delete

Added:
- `projectService.deleteProjectPermanently(projectId, invoiceConfirmation)`
- Supabase RPC: `delete_project_permanently(p_project_id, p_invoice_confirmation)`
- Admin Projects confirmation dialog requiring the exact invoice number.

Delete behavior:
- Only admin/owner or users with `projects.delete` can delete through the RPC.
- The UI does not remove the project until Supabase confirms success.
- Project services are deleted by cascade.
- Existing `client_assets`/private storage files are not made public and are not storage-deleted by this action; project links detach through DB constraints.
- Projects refetch after deletion.

## 6. Telegram Notification Settings

Added:
- `src/components/notifications/TelegramNotificationSettings.tsx`
- `src/services/telegramIntegrationService.ts`
- `supabase/functions/send-telegram-notification/index.ts`

Settings exist in:
- Admin Settings -> Notifications
- Client Profile -> Account

Behavior:
- Users can save Telegram bot token, chat ID, and enabled state.
- Saved tokens are not selected back into the UI.
- Test notification calls the Supabase Edge Function.
- `notificationService.create()` now invokes the Edge Function after the DB notification row is created.
- The frontend never calls Telegram directly.
- No service-role key is used in frontend code.

Strict note: notifications created through `notificationService` are wired to Telegram. Notifications inserted directly by SQL triggers still need a DB webhook/queue/Edge invocation to guarantee Telegram delivery when no browser service path is involved.

## 7. Database / RLS Changes

Migration `20260508183000_profile_projects_telegram_hardening.sql` adds:
- duplicate project repair/backfill;
- idempotent conversion RPC hardening;
- permanent project delete RPC;
- `notification_integrations` table;
- strict RLS policies for own-user access and admin management.

Telegram token storage:
- Uses `bot_token`.
- Encryption is not implemented in this repo migration.
- It is protected by RLS and not read by frontend selectors.

No public SELECT/INSERT/UPDATE/DELETE policy was added.

## 8. Commands Run

- `npm run lint`
  - Passed with 0 errors.
  - 11 existing warnings remain in unrelated files.
- `npx tsc --noEmit`
  - Passed.
- `npm run build`
  - Passed.
  - Vite built successfully in 34.61s.
  - Existing maintenance notices: `baseline-browser-mapping` and Browserslist data are outdated.

## 9. Manual Test Checklist

- [ ] Open `/profile` and confirm no false “No client profile linked” flash appears.
- [ ] Open `/profile?tab=identity` and confirm Identity opens directly.
- [ ] Click Overview once from another profile tab and confirm it opens immediately.
- [ ] Convert the same approved request more than once and confirm one project remains linked.
- [ ] Apply migration in Supabase and confirm duplicate `pricing_request_id` rows are repaired.
- [ ] Open Admin -> Projects and verify compact scan layout, filters, search, and Workroom drawer.
- [ ] Delete a project by typing its invoice number and confirm it disappears only after DB success.
- [ ] Confirm non-admin users cannot execute the delete RPC.
- [ ] Save Telegram settings in Admin Settings.
- [ ] Save Telegram settings in Client Profile -> Account.
- [ ] Send a test Telegram notification.
- [ ] Create a notification through `notificationService` and confirm Telegram receives it.
- [ ] Configure DB webhook/queue handling if SQL-triggered notifications must send Telegram without frontend/service involvement.

## 10. Remaining TODOs

- Telegram bot token encryption is not implemented; token is protected by strict RLS and hidden from UI reads.
- SQL-trigger-created notifications are not guaranteed to send Telegram unless routed through a webhook/queue/Edge Function trigger.
- Browser/Supabase live manual tests still need to be run against the deployed project after applying the migration and deploying the Edge Function.
