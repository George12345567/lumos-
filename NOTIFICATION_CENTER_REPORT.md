# Notification Center Report — Lumos

## 1. Summary

Added a unified premium Notification Center for authenticated clients and admins. The widget appears in the public `EnhancedNavbar` when a user is logged in, in the admin topbar for `/lumos-admin`, and on `/profile` through the existing visible `EnhancedNavbar`.

The implementation uses the existing `public.notifications` table path, extends it safely, and keeps legacy pricing-request notification types compatible.

## 2. Files Created / Modified

| File | Change |
|---|---|
| `src/components/notifications/NotificationCenter.tsx` | New shared bell/dropdown widget with filters, unread badge, mark read, mark all read, refresh, and safe internal navigation. |
| `src/hooks/useNotificationCenter.ts` | New data hook for client/admin notification loading, Realtime subscription, read state, and refresh fallback. |
| `src/services/notificationService.ts` | Expanded notification creation/fetch/read APIs, added client/admin helpers, dedupe window, entity/action fields, and legacy fallback. |
| `src/types/dashboard.ts` | Expanded `Notification` type with recipient, actor, entity, and new notification categories. |
| `src/components/layout/EnhancedNavbar.tsx` | Added authenticated notification bell beside the compact profile menu. |
| `src/features/admin/components/AdminTopbar.tsx` | Replaced the old static bell button with the shared Notification Center. |
| `src/features/admin/components/AdminShell.tsx` | Added query-param navigation support for notification action URLs like `/lumos-admin?section=messages&client=<id>`. |
| `src/features/client-profile/ClientProfilePage.tsx` | Removed the old local notification popover props so `/profile` uses the shared navbar widget without duplicate bells. |
| `src/features/client-profile/hooks/useNotifications.ts` | Aligned the legacy profile activity hook with the shared `Notification` type. |
| `src/services/adminDashboardService.ts` | Added a notification when the request edit drawer changes a client-linked pricing request status. |
| `supabase/migrations/20260508110000_notification_center.sql` | Added notification schema fields, RLS, Realtime publication membership, and backend triggers. |

## 3. Database Changes

Migration: `supabase/migrations/20260508110000_notification_center.sql`

Extends `public.notifications` with:

| Column | Purpose |
|---|---|
| `recipient_user_id` | Direct authenticated recipient when applicable. |
| `client_id` | Client/account scope for ownership and admin context. |
| `actor_id` / `actor_name` | Who caused the event, without storing sensitive content. |
| `entity_type` / `entity_id` | Links notification to message, file, identity, request, order, client, etc. |
| `action_url` | Safe internal route used by the widget on click. |
| `read_at` | Timestamp for read state. |

Indexes were added for user/read lookups, client lookups, and entity lookups.

## 4. Notification Types

Supported current types:

| Type | Source |
|---|---|
| `message` | Client/admin messages. |
| `file` | Client-visible shared file uploads. |
| `identity` | Client-visible identity record/assets updates. |
| `project` | Order/project status changes. |
| `request` | New/admin request activity and direct request edit updates. |
| `account` / `security` | Safe account/security events, including temporary-password flags. |
| `system` / `general` | Generic/system compatibility. |
| `pricing_request_*` | Existing legacy pricing-request notifications. |

## 5. Realtime Behavior

The `notifications` table is added to `supabase_realtime` and `replica identity full` is enabled for update/delete events.

Client subscriptions are filtered by `user_id = current client id` and the hook also enforces `user_type === 'client'` in memory.

Admin subscriptions listen to admin-visible rows and ignore client-targeted rows in the admin widget.

If Realtime fails, the dropdown keeps a manual `Refresh` button and does not retry-loop.

## 6. Navbar Widget UX

The widget is a compact premium bell:

| UX Element | Behavior |
|---|---|
| Bell button | Small rounded glass-style icon with unread badge. |
| Header | Shows Notifications and unread count. |
| Filters | All, Unread, Messages, Files, Identity, Projects. |
| List | Icon, title, short message, time ago, unread dot, high/urgent badge. |
| Actions | Click item marks it read and navigates to safe internal `action_url`. |
| Footer | Refresh and simple activity/settings destination. |
| Empty state | “You’re all caught up.” |

Theme classes use `bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, and `border-border`.

## 7. Client Notifications

Clients can receive:

| Event | Action URL |
|---|---|
| New Lumos message | `/profile?tab=messages` |
| New client-visible file | `/profile?tab=files` |
| Identity record or asset update | `/profile?tab=identity` |
| Project/order status update | `/profile?tab=projects` |
| Pricing request status update | `/profile` |
| Temporary password/security flag | `/change-password` |

Client rows are scoped to `user_type = 'client'` and the current `auth.uid()`.

## 8. Admin Notifications

Admins can receive:

| Event | Action URL |
|---|---|
| Client sends message | `/lumos-admin?section=messages&client=<id>` |
| New pricing request | `/lumos-admin?section=requests` |

`AdminShell` now reads `section` and `client` query params so notification clicks open the correct admin section where supported.

## 9. RLS / Security

Confirmed implementation rules:

| Rule | Status |
|---|---|
| No service-role key in frontend | Confirmed. |
| No public notification access | Confirmed by RLS; no anon policies added. |
| Client sees only own rows | `user_type = 'client'` plus `auth.uid()` ownership checks. |
| Admin manages all | Uses existing `public.is_admin()` helper. |
| Client can mark own notifications read | Supported through own-row update policy and service scoping. |
| Admin-only assets notify clients | Prevented; asset trigger exits for `visibility = 'admin_only'`. |
| Sensitive password text stored | Not stored. Security notification is generic. |
| Internal identity notes notify clients | Prevented; identity trigger only checks client-visible fields. |

## 10. Integration Points

Backend triggers create notifications after successful database writes:

| Source | Trigger |
|---|---|
| `client_messages` insert | Admin or client message notification. |
| `client_assets` insert | Client file or identity asset notification, respecting visibility/downloadability. |
| `client_identity` insert/update | Client identity notification for client-visible field changes. |
| `orders.status` update | Client project status notification. |
| `pricing_requests` insert | Admin new request notification. |
| `clients.password_must_change/password_updated_by_admin_at` update | Client security notification. |

Frontend service creation remains for existing pricing-request notifications and direct admin request drawer status edits.

## 11. Commands Run

| Command | Result |
|---|---|
| `npx tsc --noEmit` | Passed. |
| `npm run lint` | Passed with 10 existing warnings; no errors. |
| `npm run build` | Passed. |
| `npm audit --audit-level=low` | Passed, 0 vulnerabilities. |
| `Get-ChildItem -Path dist -Recurse -File \| Select-String ...` | No matches for requested secret patterns. |
| `Invoke-WebRequest http://127.0.0.1:8082` | Dev server responded `200 OK`. |

Build notes: Vite reported stale `baseline-browser-mapping` and Browserslist data. This is not related to the notification work.

## 12. Manual Test Checklist

Requires applying the migration to Supabase and testing with real client/admin sessions:

- [ ] `/profile` opens for a logged-in client.
- [ ] `/lumos-admin` opens for an admin.
- [ ] Navbar bell appears for logged-in client on main site.
- [ ] Admin topbar bell appears in `/lumos-admin`.
- [ ] Client receives notification when admin sends a message.
- [ ] Admin receives notification when client sends a message.
- [ ] Client receives notification when admin uploads a file.
- [ ] Client receives notification when admin updates Identity or uploads visible identity assets.
- [ ] Client does not receive notification for `admin_only` assets.
- [ ] Client receives project/order status notification.
- [ ] Admin receives new pricing request notification.
- [ ] Notification click opens the correct tab/section.
- [ ] Mark one as read works.
- [ ] Mark all as read works.
- [ ] Refresh fallback works if Realtime is unavailable.
- [ ] Light mode text is readable.
- [ ] Dark mode text is readable.
- [ ] Mobile dropdown fits without horizontal overflow.
- [ ] No runtime console errors.

## 13. Remaining TODOs

- Apply `20260508110000_notification_center.sql` in Supabase before expecting live notifications.
- The admin “full notifications” experience is still a dropdown-first flow. The footer routes admins to Settings because there is no dedicated full notification log section yet.
- Anonymous pricing-request admin notifications depend on an existing `clients.role = 'admin'` row to receive the row safely. If the project needs guaranteed multi-admin routing for anonymous requests, add a backend recipient table or Edge Function/DB function that resolves admin recipients explicitly.
- Client update policies are scoped to owned notification rows; stricter column-level update grants for `is_read/read_at` only would further harden the database if desired.
