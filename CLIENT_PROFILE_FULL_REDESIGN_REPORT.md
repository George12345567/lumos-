# Client Profile Full Redesign Report — Lumos

## 1. Summary

The `/profile` page was redesigned into a simpler premium client portal experience. The new UI uses a clean sidebar, a large profile hero card, four real-data stats, and focused sections for Overview, Projects, Messages, Files, and Account.

The redesign keeps the existing `ProtectedRoute`, `AuthContext`, Supabase client, profile hooks, order hooks, notification hooks, message/file services, private `client-assets` storage, and RLS assumptions. It does not add fake projects, fake messages, fake files, role editing, service-role usage, or broad public access.

## 2. Files Created / Modified

| File | Change |
| --- | --- |
| `src/features/client-profile/ClientProfilePage.tsx` | Fully rebuilt `/profile` UI into the new premium client portal layout. |
| `src/services/profileService.ts` | Added client-editable profile field sanitization and retained private signed avatar upload behavior. |
| `src/services/clientPortalService.ts` | Expanded real message/file types and added private signed file download URL helper. |
| `src/features/client-profile/hooks/usePortalData.ts` | Added duplicate-safe message merging for initial loads, realtime inserts, and optimistic inserts. |
| `CLIENT_PROFILE_FULL_REDESIGN_REPORT.md` | This implementation report. |

## 3. New UI Structure

| Area | Implementation |
| --- | --- |
| Sidebar | Desktop left sidebar with Overview, Projects, Messages, Files, Account, and Sign out. Active state uses a subtle Lumos accent. |
| Mobile Navigation | Bottom navigation with the same portal items and sign out. |
| Top Bar | Minimal greeting, real notifications popover, and avatar/name menu with sign out. |
| Hero Card | Large cover area, private signed avatar, avatar camera upload button, display name, username, package badge, tagline, location, website, verified badge only from real `is_verified`, and Edit Profile button. |
| Stats | Active Projects, Unread Messages, Project Progress, and Next Delivery, all derived from real loaded data or clean empty values. |
| Overview | About/Profile Info card, Profile Completion, Recent Activity, and Next Step. |
| Projects | Former Orders are displayed as Projects with status, progress, delivery date if present, service summary, notes, and View Details. |
| Messages | Simple Lumos Team chat using real `client_messages` data with refresh, sending state, failed send state, and empty state. |
| Files | Real `client_assets` list with file metadata and signed private download action. |
| Account | Read-only email/username, editable safe profile fields via modal, preferences, brand details, security-question status only, and sign out. |

## 4. Features Implemented

- Avatar upload to private `client-assets` bucket using `<auth.uid()>/avatars/<safe-file-name>` through the existing `profileService.uploadAvatar`.
- Signed avatar display through `profileService.getAvatarUrl`.
- Cover display support when `cover_url` exists; otherwise a soft default cover is used.
- Safe Edit Profile modal for display name, tagline, phone, company, industry, website, location, bio, timezone, visibility, accent color, brand colors, and social links.
- Profile completion based on real fields: avatar, display name, phone, company, website, bio, and brand colors.
- Projects section based on real `orders` data only.
- Messages section based on real `client_messages` data only.
- Files section based on real `client_assets` data only.
- Signed file download helper for private `client-assets` paths.
- Portal message/file/design state is cleared when the authenticated client id changes before reloading new client data.
- Clean loading, empty, retry/error, and failed-send/download states.
- Mobile single-column layout and bottom navigation.
- Light/dark readable color classes using `bg-background`, `bg-card`, `text-foreground`, `text-card-foreground`, and `text-muted-foreground`.

## 5. Data Sources Used

| Data | Source |
| --- | --- |
| Client profile | `clients` through `profileService.getProfile` and `useClientProfile`. |
| Auth client/session | Existing `AuthContext` hooks. |
| Projects | `orders` through `useOrders` / `orderService.fetchOrdersByClient`. |
| Messages | `client_messages` through `usePortalData` / `clientPortalService`. |
| Files | `client_assets` through `usePortalData` / `clientPortalService`. |
| Notifications | `notifications` through `useNotifications`. |
| Saved designs | Still loaded by `usePortalData` for existing compatibility, but not shown in the simplified Files section. |

## 6. Storage / Files

- Bucket: `client-assets`.
- Avatar path: `<auth.uid()>/avatars/<safe-file-name>`.
- Avatar display: private signed URL.
- File downloads: `getAssetDownloadUrl` creates a short-lived signed URL from `storage_path`, `file_url`, or `asset_url` only when the stored value is a private storage path.
- Public URL generation was not added to the redesigned profile.
- If an old file row only has an absolute public URL and no private storage path, the new download action refuses to create a fake secure link and shows a clean error.

## 7. Security Notes

- No service-role key was added or used in frontend code.
- `.env` variable-name check found required frontend env names present and dangerous frontend service-key names absent.
- `dist` scan found no matches for `service_role`, `SUPABASE_SERVICE`, `VITE_SUPABASE_SERVICE`, `SERVICE_ROLE`, `VITE_AI`, `sk_live`, `sk_test`, or `sb_secret`.
- Client profile updates are sanitized in `profileService.updateProfile`; role, status, package, admin notes, pricing, invoices, and other admin-only fields are not client-editable through this service.
- Email and username remain read-only in the UI.
- Security-question answer is not shown, saved, or verified in the browser.
- Messages and files still rely on Supabase RLS for ownership enforcement. The frontend queries continue to filter by the current authenticated client id.
- Admin dashboard route `/lumos-admin` was not changed. Production build still includes and compiles it.

## 8. Light/Dark Mode Fixes

- The redesigned page avoids hardcoded light-only text like white text on light cards.
- Core surfaces use theme tokens: `bg-background`, `bg-card`, `text-foreground`, `text-card-foreground`, `text-muted-foreground`, `border-border`.
- White text is only used on intentionally dark/accent message bubbles or dark buttons.
- Modal inputs, cards, sidebar, top bar, stats, and empty states use theme-aware classes.

## 9. Commands Run

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed. |
| `npm run build` | Passed. |
| `npm run lint` | Passed with 10 existing warnings, no errors. Warnings are in admin/AI/availability files outside this profile redesign. |
| `npm audit --audit-level=low` | Passed, 0 vulnerabilities. |
| `dist` secret marker scan | Passed, no matches. |
| Local dev server | Started successfully on `http://127.0.0.1:8082` because existing servers occupied earlier ports. |
| Route HTTP smoke check | `/profile`, `/lumos-admin`, `/client-login`, `/demo`, `/services/web-design` returned HTTP 200 from Vite dev server. |

## 10. Manual Test Checklist

| Check | Status |
| --- | --- |
| `/profile` route compiles and serves locally | Passed by build and HTTP 200. |
| Logged-out redirect to `/client-login` | Code-preserved through `ProtectedRoute` and page-level redirect guard; requires browser/session test for final confirmation. |
| Avatar upload | Implemented with private bucket signed URL flow; requires live authenticated Supabase test. |
| Profile edit save | Implemented through sanitized `updateProfile`; requires live authenticated Supabase test. |
| Invalid profile edit validation | Implemented for display name, phone, website, social URLs, tagline, and bio. |
| Messages load/send/refresh | Implemented through existing `client_messages` service; requires live RLS/database test. |
| Files load/download | Implemented through existing `client_assets` service and signed download URLs; requires live private-bucket test. |
| Sign out | Existing `AuthContext.logout` used in sidebar, mobile nav, account, and profile menu. |
| Mobile layout | Implemented with bottom nav, stacked hero/cards, responsive stats, and no fixed-width panels. |
| Light/dark readability | Code-verified through theme token usage. |
| `/lumos-admin` not broken | Build passed and route returns HTTP 200 from dev server. |
| Runtime console errors | Not fully verified because no browser automation was run in this environment. |
| Dialog accessibility warnings | Edit modal includes `DialogTitle` and `DialogDescription`; no profile modal without title was added. |

## 11. Remaining TODOs

- Live Supabase verification is still required for avatar upload, profile update, message send, realtime subscription, and signed file download under real RLS.
- Cover upload persistence was not added because no confirmed backend cover upload flow was requested or verified. Existing `cover_url` is displayed when present; otherwise the page uses a default cover.
- If legacy `client_assets` rows only store absolute public URLs without `storage_path`, migrate them to private storage paths for signed downloads.
- Browser-based responsive QA should still be run at mobile, tablet, and desktop widths with an authenticated client session.
- Realtime messages are subscribed and duplicate-merged, but final realtime confirmation requires a live Supabase project with Realtime enabled for `client_messages`.
