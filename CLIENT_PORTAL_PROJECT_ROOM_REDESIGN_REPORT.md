# Client Portal & Project Room Redesign Report — Lumos

## 1. Summary

Implemented the client portal/navigation redesign, a cleaner client Home, persisted verified project badge support, persisted client-visible pinned notes, shared file placement rules, Brand Kit filtering, Files Library filtering, and a simplified admin Project Room with five tabs.

The database source of truth remains:
- `projects` for projects.
- `project_services` for service progress.
- `client_assets` for files/assets.
- `client_identity` plus published `client_assets` for Brand Kit.
- `notifications` for Notification Center entries.

## 2. Client Navigation Redesign

Client-facing tabs are now:
- Home
- Project Hub
- Brand Kit
- Files Library
- Messages
- Settings

Backward-compatible URL tab mapping remains in place:
- `?tab=identity` -> Brand Kit
- `?tab=projects` -> Project Hub
- `?tab=files` -> Files Library
- `?tab=overview` and no tab -> Home

Profile loading now continues while auth/profile fetches are active to reduce false "profile not found" flashes.

## 3. Home Experience

Home now acts as a command center:
- active project summary
- current phase
- progress
- expected delivery
- verified badge when enabled
- action-needed card
- pinned client notes
- three navigation cards
- latest notifications, delivered files, and activity

It avoids large tables and uses compact cards.

## 4. Project Hub Redesign

Project cards show:
- project name
- verified badge
- status
- progress
- current service
- next step
- action-needed count
- Open Project CTA

Project details are organized around:
- Overview
- Actions
- Services
- Project Files

Admin notes are not selected in the client project query.

## 5. Brand Kit Redesign

Brand Kit now filters identity file assets to client-visible, downloadable, published identity assets:
- `client_visible = true`
- `visibility = client`
- `is_downloadable = true`
- `is_identity_asset = true`
- `published_to_identity = true`

Admin `includeAdminOnly` identity views still load admin-only identity assets.

## 6. Files Library Redesign

Files Library uses `client_assets` only and filters to client-visible downloadable files. It includes filters for:
- All
- Needs Review
- Final Files
- Brand Assets
- Project Files
- Invoices
- Documents

Rows show placement labels such as Project Hub, Client Actions, Brand Kit, and Files Library.

## 7. Verified Project Badge

Added persisted project fields via migration:
- `client_verified_badge boolean default false`
- `project_started_at timestamptz null`
- `verified_badge_label text null`

Admin can toggle the badge in Project Room Overview. The service rejects enabling it unless the project is active/completed and has a start timestamp.

The client sees the badge on Home, Project Hub cards, and project details.

## 8. Client Pinned Notes

Added persisted `client_notes` plus RLS and `mark_client_note_read()` RPC.

Client notes support:
- title
- body
- priority
- placement
- active/inactive
- dismissible
- expiry date
- read timestamp

Admin creates notes from Project Room Overview. Client notes show on Home and linked project Actions. Internal admin notes remain separate.

## 9. Admin Project Room Redesign

Admin Open Project is now a Project Room with five tabs:
- Overview
- Services
- Files & Delivery
- Client Preview
- Activity

Services are collapsed and one service workroom is open at a time.

## 10. Send to Client Workflow

Files & Delivery includes a three-step Send to Client wizard:
- File details
- Client placement
- Client preview

It writes one `client_assets` row per file and sets placement metadata instead of duplicating files.

## 11. File Placement Rules

Added shared helper `getClientAssetPlacements(asset)` in `src/services/clientAssetPlacement.ts`.

Rules implemented:
- draft/review files: Project Hub + Files Library, Actions when review is selected
- final deliverables: Project Hub + Files Library
- final brand assets: Brand Kit + Files Library, and Project Hub when related
- invoices/receipts: Files Library by derived category/type
- admin-only files: hidden everywhere client-side

## 12. Notifications / Telegram Integration

Client notes use `createClientNotification`, which writes Notification Center entries and invokes the existing Telegram Edge Function flow.

Project badge/start updates also create client notifications through `notificationService`.

File upload/delivery/publish operations continue to rely on existing notification triggers for Notification Center rows and call the existing Telegram Edge Function helper for Telegram delivery. Telegram bot tokens remain server-side and are not exposed in UI.

## 13. Database / RLS Changes

New migration:
- `supabase/migrations/20260509100000_client_portal_project_room_redesign.sql`

RLS changes:
- tightened `client_assets` client reads to `client_visible`, `visibility = client`, and `is_downloadable`
- added `client_notes` policies:
  - admins/team with project/client edit permissions manage notes
  - clients read only their own active, unexpired notes
  - clients mark read only through `mark_client_note_read()`

No public unsafe policies or frontend service-role usage were added.

## 14. Commands Run

- `npm run build` baseline
- `npx tsc --noEmit`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Dev server:
- `http://127.0.0.1:8081/`

Port `8080` was already in use.

## 15. Manual Test Checklist

Not fully completed in-browser with real Supabase data in this pass. Required manual checks:
- Client Home opens without a profile error flash.
- `?tab=identity`, `?tab=projects`, and `?tab=files` land on the renamed sections.
- Admin toggles verified badge only on started projects.
- Client sees verified badge in Home, Project Hub, and project details.
- Admin creates a pinned note; client sees it on Home and linked Project Hub.
- Mark as read works only through the RPC.
- Brand Kit excludes draft/review/admin-only assets.
- Files Library filters work against real project/brand/invoice files.
- Admin-only files are blocked by RLS and do not render client-side.
- Telegram sends through the Edge Function when configured.

## 16. Remaining TODOs

- The admin Client Preview tab is a placement-based mini preview using the same placement helper, not a pixel-perfect desktop/mobile render of the actual client UI. Do not treat it as complete visual parity yet.
- Approval actions route clients to Messages instead of writing a dedicated approval record because no approval table/workflow exists in the current schema.
- Existing database triggers may create generic file notifications while the frontend sends Telegram through the Edge Function; real data should be checked for duplicate notification copy.
- Apply and verify the new Supabase migration in the target project before relying on pinned notes/RLS/badge columns in production.
