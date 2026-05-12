# RBAC, Team Routing, Verified Badge, Hero Notes & Approval Flow — Completion Report

**Date:** 2026-05-12
**Project:** Lumos Digital Ascent
**Build status:** Passing (0 lint errors, 0 type errors)

---

## Summary

Six phases of backend-enforced RBAC, client portal UX improvements, and asset approval flow wiring were completed. All changes are database-enforced (not UI-only), and the production build compiles cleanly.

---

## Phase 1 — RBAC Enforcement

**Migration:** `supabase/migrations/20260510000000_rbac_enforce_permissions.sql`

Replaced blanket `is_admin()` RLS policies with `has_admin_permission(resource, action)` on seven tables:

| Table | Old policy | New policies |
|---|---|---|
| `client_messages` | `is_admin()` | `has_admin_permission('messages', 'view')` etc. |
| `notifications` | `is_admin()` | `has_admin_permission('notifications', 'view')` etc. |
| `saved_designs` | `is_admin()` | `has_admin_permission('designs', 'view')` etc. |
| `team_members` | `is_admin()` | `has_admin_permission('team', 'view')` etc. |
| `contacts` | `is_admin()` | `has_admin_permission('contacts', 'view')` etc. |
| `pricing_requests` | `is_admin()` | `has_admin_permission('requests', 'view')` etc. |
| `orders` | `is_admin()` | `has_admin_permission('orders', 'view')` etc. |

**Kept `is_admin()`** on `audit_logs`, `discount_codes`, `workspace_settings` — these remain owner/admin-only.

`has_admin_permission()` reads `team_members.permissions` JSONB for per-user overrides, falling back to `default_role_permission()`. Unauthorized team members are blocked at the RLS layer.

---

## Phase 2 — Team Member Routing

**Files modified:**
- `src/components/shared/AuthRoutes.tsx` — Redirects team members from `/profile` → `/lumos-admin` (unless `?mode=client`)
- `src/pages/LogInPage.tsx` — Post-login redirect for team members to admin dashboard
- `src/components/layout/FloatingDock.tsx` — `showAdmin` includes `isTeamMember`
- `src/components/layout/EnhancedNavbar.tsx` — `showAdmin` check
- `src/components/layout/UserMenu.tsx` — `showAdmin` prop
- `src/features/hero/TypewriterHero.tsx` — Admin CTA link for team members
- `src/pages/InviteOnboardingPage.tsx` — Post-onboarding redirect for team members
- `src/features/client-profile/ClientProfilePage.tsx` — Team member banner with "Go to Admin Dashboard" link

---

## Phase 3 — Tab Persistence

**File:** `src/features/client-profile/ClientProfilePage.tsx`

- Tab state persisted to `localStorage` under key `lumos:lastClientProfileTab`
- Init priority: URL `?tab=` → localStorage → `'overview'`
- `handleTabChange` writes localStorage on every tab switch

---

## Phase 4 — Verified Badge

**Files modified:**
- `src/types/dashboard.ts` — Added `is_verified`, `verified_at`, `verified_by`, `verified_label` to `Client` interface
- `src/features/client-profile/ClientProfilePage.tsx` — `HeroProfileCard` accepts and renders `verifiedLabel`
- `src/features/client-profile/sections/ProfileHero.tsx` — `verifiedLabel` prop, `ShieldCheck` icon badge
- `src/features/admin/sections/ClientsSection.tsx` — Admin toggle for `is_verified` + custom `verified_label` input
- `src/features/admin/components/AdminShell.tsx` — Passes `onUpdateClient` to ClientsSection

**Migration:** `20260509200000_client_verified_hero_note_approval.sql` added `verified_by`, `verified_label` columns to `clients`.

---

## Phase 5 — Hero Notes

**Files created/modified:**
- `src/features/client-profile/components/HeroNoteBanner.tsx` — New component displaying notes with priority styling (urgent/important/normal), dismiss button, "Message us" link
- `src/features/client-profile/ClientProfilePage.tsx` — Integrated `HeroNoteBanner` into hero section
- `src/features/client-profile/sections/ProfileHero.tsx` — Renders `heroNotes` via `HeroNoteBanner`

**Data flow:**
- `clientNotesService.fetchClientHeroNotes()` — Fetches notes where `show_in_profile_hero = true`
- `ClientNote` interface includes `showInProfileHero: boolean`
- Admin `ClientNoteComposer` in `ProjectsSection.tsx` has toggle for `showInProfileHero`
- Notes create in-app notifications when `show_in_profile_hero = true`

**Migration:** Added `show_in_profile_hero` column to `client_notes` table.

---

## Phase 6 — Asset Approval Flow

**Files modified:**
- `src/features/client-profile/ClientProfilePage.tsx` — Added `handleApproveAsset` and `handleRequestChanges` handlers calling Supabase RPCs
- Prop chain: `ClientProfilePage` → `ProjectsTab` → `ProjectDetailsDialog` → `ClientActionCenter`

**RPC calls:**
- **Approve:** `supabase.rpc('client_approve_deliverable', { p_asset_id })` — Updates status to `approved`, publishes to Brand Kit identity, recalculates project progress, creates notification
- **Request Changes:** `supabase.rpc('client_request_deliverable_changes', { p_asset_id, p_message: null })` — Sets status to `changes_requested`, creates notification

**UI in `ClientActionCenter`:**
- "Approve" button with loading state (Arabic: "اعتماد" / "جارٍ الاعتماد…")
- "Request Changes" button with loading state (Arabic: "طلب تعديلات" / "جارٍ الطلب…")
- Falls back to "Approve via Messages" / message redirect when handlers not available
- "Ask Question" button always routes to Messages tab

**Migrations:**
- `20260509200000_client_verified_hero_note_approval.sql` — `client_approve_deliverable` RPC
- `20260510100000_client_request_changes.sql` — `client_request_deliverable_changes` RPC

---

## Phase 7 — Lint & Build Fixes

Three lint errors fixed:
1. **ClientProfilePage.tsx** — Stray `useState` calls leaked inside messages `.map()` callback — removed
2. **HeroNoteBanner.tsx** — `useCallback` called after early return (conditional hook) — moved hook before conditional
3. Build verified: `npm run build` passes, `npx tsc --noEmit` passes, `npm run lint` passes with 0 errors (11 pre-existing warnings)

---

## Key Architecture Decisions

| Decision | Rationale |
|---|---|
| `has_admin_permission()` over `is_admin()` | Fine-grained per-resource, per-action checks; reads `team_members.permissions` JSONB |
| `is_admin()` kept on audit_logs, discount_codes, workspace_settings | Owner-only resources that should never be accessible to non-owner roles |
| `?mode=client` URL param for team members | Allows team members to view the client perspective for support/debugging |
| `verified_label` free-text field over enum | Allows custom badge text like "Verified Lumos Client" or "Enterprise Partner" |
| `show_in_profile_hero` on `client_notes` | Reuses existing notes system; no new table needed |
| RPC calls for approve/request-changes | Server-side validation, progress recalculation, and notification creation in one transaction |
| Fallback to message redirect | Graceful degradation if RPC is unavailable or not wired |

---

## Remaining Work

| Item | Status |
|---|---|
| Audit triggers on mutations → `audit_logs` | Not started (Phase 5 in RBAC_TODO) |
| Cross-role test matrix | Not started (Phase 8 in RBAC_TODO) |
| Edge function `admin-client-update` calling `has_perm()` | Not started (Phase 6 in RBAC_TODO) |
| Per-resource ownership scoping (designer/sales) | Not started (Phase 4 in RBAC_TODO) |

---

## Files Changed (Alphabetical)

```
src/components/layout/EnhancedNavbar.tsx
src/components/layout/FloatingDock.tsx
src/components/layout/UserMenu.tsx
src/components/shared/AuthRoutes.tsx
src/features/admin/components/AdminShell.tsx
src/features/admin/sections/ClientsSection.tsx
src/features/admin/sections/ProjectsSection.tsx
src/features/client-profile/ClientProfilePage.tsx
src/features/client-profile/components/HeroNoteBanner.tsx
src/features/client-profile/sections/ProfileHero.tsx
src/features/hero/TypewriterHero.tsx
src/pages/InviteOnboardingPage.tsx
src/pages/LogInPage.tsx
src/services/clientNotesService.ts
src/services/teamMemberService.ts
src/types/dashboard.ts
supabase/migrations/20260510000000_rbac_enforce_permissions.sql
supabase/migrations/20260510100000_client_request_changes.sql
```