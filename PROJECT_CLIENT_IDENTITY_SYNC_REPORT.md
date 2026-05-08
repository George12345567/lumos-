# Project Client Experience & Identity Sync Report — Lumos

## 1. Summary

Upgraded the Lumos project flow so accepted pricing requests can become real `projects`, each project owns `project_services`, and client-visible project deliverables are linked through `client_assets`.

The admin Project Workroom now supports service status/progress updates, assignments, deliverable uploads, client-visible notes, delivery actions, and Identity publishing options. The client `/profile → Projects` tab now reads real project data instead of legacy order cards.

## 2. Client Projects UX

`/profile → Projects` now shows real rows from `projects`, `project_services`, and client-visible `client_assets`.

Client project cards show:
- project name, invoice number, package name, overall status, total progress
- expected delivery date
- selected service count
- current active service
- deliverable count
- next step
- `View Project` CTA

Project details open in a clean dialog with:
- overview summary
- package, invoice, start date, expected delivery
- total progress
- current phase and next step
- project journey timeline
- client action center
- service checklist/progress cards
- download center with signed private URLs

The client UI does not render internal admin notes, staff assignment details, payment internals, or admin-only files.

## 3. Admin Project Workroom

`/lumos-admin → Projects` is now a project execution workspace.

Admin can:
- update project status, payment status, expected delivery, assigned team member, and notes
- update each service status, progress, assigned employee, admin notes, and client-visible notes
- mark services in progress, review, completed, or delivered
- upload project deliverables
- choose project-only, publish now to Identity, publish to Identity on delivery, or admin-only
- deliver individual files
- publish existing deliverables to Identity
- open client messages for project communication

All admin project changes refresh from the database after successful mutations.

## 4. Identity Sync

Project deliverables stay in `client_assets`; files are not duplicated.

Identity publishing behavior:
- `Also publish to Identity` sets `is_identity_asset = true`, `published_to_identity = true`, `visibility = client`
- `Publish to Identity when delivered` stores `identity_publish_on_delivery = true` and publishes automatically when the service becomes `delivered`
- published assets appear in `/profile → Identity` through the same `client_assets` row

Added Identity asset categories:
- `color_palette`
- `typography`
- `social_media_kit`

Identity placement:
- logo categories show in Logo Kit
- `color_palette` files show in Color Palette
- `typography` files show in Typography
- `brand_guide` and other assets show in Brand Assets
- social media assets show in Social Identity

Structured colors and fonts still come from `client_identity.color_palette` and `client_identity.typography`. Uploaded files are linked as assets; they are not parsed automatically into structured color/font JSON.

## 5. Database Changes

Existing project migration adds:
- `projects`
- `project_services`
- `pricing_requests.converted_project_id`
- project/service RLS
- project progress recalculation
- `client_assets.project_id`
- `client_assets.project_service_id`
- `client_assets.is_deliverable`
- `client_assets.deliverable_status`
- `client_assets.published_to_identity`
- `client_assets.published_to_identity_at`
- `client_assets.client_visible`
- employee permission helper functions
- `clients.account_type`

New migration `20260508153000_project_identity_sync_notifications.sql` adds:
- `client_assets.identity_publish_on_delivery`
- expanded `client_assets_identity_category_check`
- deferred Identity publishing trigger on service delivery
- client notifications for delivered files, Identity updates, and project completion
- employee RLS policies for `client_identity`

## 6. Notifications

Implemented through database triggers when migrations are applied:
- project started during request-to-project conversion
- service status updated
- file delivered
- identity updated
- project completed

Not implemented:
- client viewed deliverable tracking
- client downloaded file tracking
- feedback requested notification flow

## 7. Security / RLS

Implemented:
- clients read only their own `projects`
- clients read only their own `project_services`
- clients read only client-visible `client_assets`
- admin/owner access uses `is_admin()`
- team access uses `has_admin_permission(resource, action)`
- admin/team accounts are filtered out of the Clients section using `clients.account_type` and `clients.role`
- client project fetch selects only client-safe project/service columns

Strict note:
The client UI does not request or render admin notes. However, the existing `projects` and `project_services` tables still physically contain `admin_notes` columns. True column-level backend secrecy for those columns requires moving internal notes into an admin-only table or switching clients to sanitized RPC/views and revoking direct table selects. This is a remaining security-hardening TODO.

Employee RBAC is backed by RLS helper policies for the tables covered in the project migration, assuming the migrations are applied. UI permission gates alone should not be treated as security.

## 8. Files Created / Modified

Created:
- `src/features/client-profile/hooks/useClientProjects.ts`
- `supabase/migrations/20260508153000_project_identity_sync_notifications.sql`
- `PROJECT_CLIENT_IDENTITY_SYNC_REPORT.md`

Modified:
- `src/features/client-profile/ClientProfilePage.tsx`
- `src/features/admin/sections/ProjectsSection.tsx`
- `src/features/admin/sections/ClientsSection.tsx`
- `src/features/admin/components/AdminShell.tsx`
- `src/services/projectService.ts`
- `src/services/adminDashboardService.ts`
- `src/services/clientIdentityService.ts`

Related existing migration:
- `supabase/migrations/20260508140000_projects_employee_access_client_account_type.sql`

## 9. Commands Run

- `npm run build` — passed before changes
- `npx tsc --noEmit` — passed
- `npm run lint` — passed with 11 existing warnings, 0 errors
- `npm run build` — passed
- `npm audit --audit-level=low` — passed, 0 vulnerabilities

Build warnings:
- baseline/browser mapping data is old
- Browserslist/caniuse-lite data is old

## 10. Manual Test Checklist

- [ ] Apply Supabase migrations.
- [ ] Client submits pricing request with selected services.
- [ ] Admin approves request.
- [ ] Admin creates project from request.
- [ ] Project creates `project_services` from selected services.
- [ ] Admin marks Logo Design in progress.
- [ ] Client sees Logo Design in progress in `/profile → Projects`.
- [ ] Admin uploads primary logo deliverable.
- [ ] Admin marks Logo Design delivered.
- [ ] Client sees logo file in project Download Center.
- [ ] Admin publishes logo to Identity.
- [ ] Client sees logo in `/profile → Identity`.
- [ ] Admin adds color/typography structured data in Client Identity panel.
- [ ] Client sees colors/typography in Identity.
- [ ] Refresh `/profile`.
- [ ] Project, services, deliverables, and Identity assets persist.

## 11. Remaining TODOs

- Move internal project/service admin notes into an admin-only table or sanitized RPC/view model for true column-level secrecy.
- Add real deliverable feedback workflow if desired.
- Add download/view tracking if desired.
- Add structured color/typography extraction from uploaded files only if a parser or admin confirmation flow is introduced.
- Review and resolve existing lint warnings unrelated to this upgrade.
