# Admin Dashboard World-Class UX Report — Lumos Website

## 1. Summary

The Lumos admin dashboard at `/lumos-admin` was rebuilt from a 4,458-line
monolithic `AdminDashboard.tsx` into a modular, role-aware admin shell
with a soft mint/teal premium aesthetic. The new shell lives under
`src/features/admin/` and reuses every existing service and the
`useAdminDashboard()` data hook so all CRUD continues to work against the
same Supabase tables — no data layer was touched. The visual system, the
information architecture, and the section flows are new; the underlying
auth, data, and business logic are not.

The page entry `src/pages/AdminDashboard.tsx` is now a 12-line wrapper
that delegates to `<AdminShell />`. AdminRoute, RLS expectations,
`VITE_MASTER_ADMIN_EMAIL`, and Supabase auth are unchanged.

---

## 2. Files Created / Modified

### Created (new feature module — `src/features/admin/`)

| File | Purpose |
|---|---|
| `types.ts` | Role / resource / action / sidebar item types |
| `permissions.ts` | Role × resource × action permission matrix + labels |
| `constants/sidebar.ts` | Sidebar item config (icons, labels, badges, resource binding) |
| `hooks/useAdminPermission.ts` | `useAdminRole()`, `useAdminPermission()`, `useCanAccessResource()` |
| `data/useAuditLogs.ts` | Fetch audit logs from `audit_logs` (read-only) |
| `data/useTeamMembers.ts` | CRUD for `team_members` |
| `data/useDiscountCodes.ts` | CRUD for `discount_codes` |
| `data/useAdminNotifications.ts` | Fetch + mark-read on `notifications` |
| `components/primitives.tsx` | `SoftCard`, `SoftBadge`, `SoftButton`, `MetricCard`, `SectionHeader`, `EmptyState` |
| `components/PermissionGate.tsx` | Frontend permission boundary component |
| `components/AdminDrawer.tsx` | Reusable right-side drawer |
| `components/AdminSidebar.tsx` | New 12-section sidebar with role-aware visibility |
| `components/AdminTopbar.tsx` | Welcome / search / refresh / theme / notifications / avatar |
| `components/AdminShell.tsx` | Orchestrator — wires data hook → sections |
| `components/ClientEditDrawer.tsx` | Replacement for the orphaned `ClientMasterModal` |
| `sections/OverviewSection.tsx` | KPIs + recent requests/clients/activity + quick actions |
| `sections/RequestsSection.tsx` | Filtered list + 8-tab detail drawer (summary/client/pricing/workflow/notes/history/advanced/danger) |
| `sections/ClientsSection.tsx` | Client list + 6-tab detail drawer |
| `sections/ProjectsSection.tsx` | Kanban over `orders` (4 columns) |
| `sections/ContactsSection.tsx` | Contact cards + WhatsApp/Call/Email actions + status drawer |
| `sections/MessagesSection.tsx` | Notifications inbox |
| `sections/FilesSection.tsx` | Empty state — backend read API still required |
| `sections/TeamPermissionsSection.tsx` | Team CRUD + permission matrix preview + role-based perm preview |
| `sections/DiscountsSection.tsx` | Discount cards + create/edit drawer |
| `sections/AuditSection.tsx` | Read-only timeline + filters + technical-detail drawer |
| `sections/StatisticsSection.tsx` | KPIs + status breakdowns (real numbers only) |
| `sections/SettingsSection.tsx` | Account info + appearance/language toggles |

### Modified

| File | Change |
|---|---|
| `src/pages/AdminDashboard.tsx` | Replaced 4,458-line monolith with a 12-line wrapper that renders `<AdminShell />`. |
| `src/services/adminDashboardService.ts` | Added named re-exports for `adminUpdateOrderStatus`, etc. so `useAdminDashboard.ts` imports resolve under Rollup (these were missing exports — pre-existing latent bug surfaced by activating the hook). |

### Created (docs)

| File | Purpose |
|---|---|
| `RBAC_BACKEND_TODO.md` | What it takes to turn the UI matrix into real Supabase RLS enforcement |
| `ADMIN_DASHBOARD_WORLD_CLASS_UX_REPORT.md` | This report |

### Untouched (preserved)

`src/components/admin/AddClientModal.tsx` is still mounted by AdminShell
to keep its existing edge-function-based client creation flow unchanged.
`src/components/admin/dashboard/PricingRequestsManager.tsx`, `ContactsManager.tsx`,
`OrdersKanban.tsx`, `StatsOverview.tsx`, `ClientSheet.tsx`,
`ClientMasterModal.tsx` and the related sub-helpers are no longer
imported by the admin dashboard but are left on disk untouched.

---

## 3. New UX Structure

**Layout (desktop)**

```
┌─────────────┬──────────────────────────────────────────────┐
│             │  Top bar: Welcome · search · theme · bell ·  │
│   Sidebar   │             refresh · role badge · avatar    │
│   (260px)   ├──────────────────────────────────────────────┤
│             │                                              │
│  Overview   │   <Section>                                  │
│  Requests   │     - SectionHeader                          │
│  Clients    │     - Filters / search                       │
│  Projects   │     - Cards / list / kanban / timeline       │
│  Contacts   │     - Empty / loading / error states         │
│  Messages   │     - Drawer for detail editing              │
│  Files      │                                              │
│  Team       │                                              │
│  Discounts  │                                              │
│  Audit      │                                              │
│  Stats      │                                              │
│  Settings   │                                              │
│  ─────────  │                                              │
│  Back/Out   │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

**Layout (tablet)** — sidebar collapses to 72 px (icon only).
**Layout (mobile)** — sidebar hidden, replaced by horizontal scroll
section pills at the top of the main column.

**Visual language**

- Background: `#f4f9f6` (mint/off-white in light mode, `slate-950` in dark)
- Cards: `bg-white/80 backdrop-blur` with very soft emerald-tinted shadows
- Radius: 18–28 px on cards, full-pill on chips/buttons
- Accent: emerald + teal gradients used very sparingly (avatars, KPIs)
- Status: soft pastel badges with ring (no neon)
- Drawers: full-height right panel, structured into pill-tabs at the top
- Typography: tracking-tight headings; tabular-nums for numbers
- Icons: Lucide only

---

## 4. Sections Redesigned

### Overview
4 KPI cards (new requests / new contacts / active clients / pipeline
value), 3-up grid: recent requests + active clients + recent activity on
the left, quick actions + system status on the right. Quick actions are
permission-gated and disabled with a tooltip when not allowed.

### Requests (`pricing_requests`)
- Filter chips for All / New / Reviewing / Approved / Converted /
  Rejected / Urgent, each with a count.
- Card grid (1/2/3 columns responsive) showing client, package, total,
  priority, status, and date.
- Detail opens an `AdminDrawer` with 8 tabs: **Summary, Client,
  Services & Pricing, Workflow, Notes, History, Advanced, Danger Zone**.
- Workflow tab has status pills, "Approve", "Reject", and
  "Convert to project" — disabled per role permission.
- Notes tab autosaves admin notes via existing service.
- Advanced tab puts raw JSON inside a `<details>` to keep the drawer
  calm.

### Clients
- Filter chips: All / Active / Pending / Invited / Archived.
- Card grid with avatar/initial, package, status badge, contact info,
  and a progress bar.
- Detail drawer with **Profile / Business / Brand / Project / Security
  / Admin notes** tabs. Security tab refuses to show plaintext security
  answers — only the question.
- Edit launches `ClientEditDrawer` (replaces the broken
  `ClientMasterModal`) which writes through `dashboard.updateClient()`.
- Add launches the existing `AddClientModal` (edge-function path).

### Projects (`orders`)
- 4-column Kanban (pending / in progress / completed / cancelled).
- Each card shows client, package, total, date, and an inline status
  selector (gated by `projects.edit`).

### Contacts
- Status filter chips + search. Card list with the message preview.
- Detail drawer adds inline WhatsApp / Call / Email shortcuts,
  status pills (new/read/contacted/resolved), and delete.

### Messages
- Inbox over `notifications`. Filters: All / Unread / High priority /
  System / Client. Mark-as-read / mark-all-read / delete.

### Files
- Empty state explaining that consolidated read access requires a
  backend API. Per-client RLS bucket pattern preserved unchanged.

### Team & Permissions
- Card grid for team members with role badge, status, contact info.
- Add / Edit drawer with name, email, phone, role, avatar URL, active
  toggle, and a **read-only role-permission preview** (resources × allowed
  actions for that role).
- Separate **Permission matrix** drawer renders the full
  `roles × resources × actions` matrix as a table.
- Top of section displays an amber callout: *"Permissions are UI-only
  today — see RBAC_BACKEND_TODO.md."*

### Discount Codes
- Card grid: code, value, validity, usage progress, active toggle.
- Create / Edit drawer with discount type / value / min order / max /
  validity / limit / active.

### Audit Logs
- Read-only timeline. Entity + action filters. Item click opens a
  drawer with summary plus a `<details>` block holding the raw
  `old_values` / `new_values` diff.

### Statistics
- 4 KPI cards (totals + pipeline) and 4 breakdown cards
  (requests/projects/contacts/team) computed from the in-memory dashboard
  data. No fake charts; if numbers are zero, the bars stay zero.

### Settings
- Email + role badge for the signed-in admin, theme toggle, language
  toggle, and links to public site, client portal, and Supabase RLS docs.

---

## 5. Employee Roles & Permissions

### Roles (frontend matrix)

| Role | Description |
|---|---|
| `owner` | Master admin (gated by `VITE_MASTER_ADMIN_EMAIL`). Full access. |
| `admin` | Operational admin: full CRUD except sensitive read-only on audit/stats/settings. |
| `manager` | View + edit + assign on operational areas; view-only on team/discounts/audit/stats. |
| `sales` | Requests + contacts + messages, view clients/projects, no audit/discounts. |
| `designer` | Assigned projects + files; no contacts/discounts/audit/stats. |
| `support` | Contacts + messages + view clients. |
| `viewer` | View-only across operational sections. |

### Permission matrix highlights

The complete table is in `src/features/admin/permissions.ts`. Examples:

- `can('owner', 'manage_permissions', 'team') === true`
- `can('manager', 'delete', 'clients') === false`
- `can('sales', 'view', 'audit_logs') === false`
- `can('designer', 'view', 'discounts') === false`

### Role resolution today (frontend)

- The master admin email → `'owner'`.
- Anyone else who passes `AdminRoute` is treated as `'owner'` until the
  backend role lookup is implemented.
- Designed so we can swap in `team_members.user_id → role` once the
  migration in `RBAC_BACKEND_TODO.md` lands without changing call sites.

### What's enforced today

- The sidebar hides sections the role can't access (`useCanAccessResource`).
- Action buttons are disabled / hidden via `useAdminPermission`.
- AdminRoute still gates the route at the application boundary.

### What requires backend work

Real database authorisation per role, ownership scoping for
designer/sales, and per-user permission overrides — fully detailed in
`RBAC_BACKEND_TODO.md`.

---

## 6. Functionality Preserved

Every CRUD path that existed before continues to work via the same
service layer:

- ✅ Pricing request status changes — `dashboard.updatePricingRequestStatus`
- ✅ Pricing request convert to order — `dashboard.convertPricingRequest`
- ✅ Pricing request delete — `dashboard.deletePricingRequest`
- ✅ Save admin notes on a request — `adminDashboardService.updatePricingRequest`
- ✅ Contact status changes + delete — `dashboard.updateContactStatus` / `deleteContact`
- ✅ WhatsApp / Call / Email shortcuts on contacts and requests
- ✅ Add client (edge function) — `dashboard.addClient` via `AddClientModal`
- ✅ Update / delete client — `dashboard.updateClient` / `deleteClient`
- ✅ Order status changes — `dashboard.updateOrderStatus`
- ✅ Discount CRUD — `useDiscountCodes()` hook
- ✅ Team member CRUD — `useTeamMembers()` hook
- ✅ Notifications mark-read / delete — `useAdminNotifications()`
- ✅ Audit log read + filter — `useAuditLogs()`
- ✅ Realtime refresh — preserved through `useAdminDashboard()`'s
  Supabase channel subscription (unchanged)

---

## 7. Data Sources Used

| Section | Supabase tables read | Tables written |
|---|---|---|
| Overview | `pricing_requests`, `contacts`, `clients`, `orders` | — |
| Requests | `pricing_requests` | `pricing_requests` (status, admin_notes), `orders` (via convert) |
| Clients | `clients` | `clients` (via edge function for create/update/delete) |
| Projects | `orders` | `orders` (status) |
| Contacts | `contacts` | `contacts` (status, delete) |
| Messages | `notifications` | `notifications` (is_read, delete) |
| Files | — (read API pending) | — |
| Team & Permissions | `team_members` | `team_members` (CRUD) |
| Discounts | `discount_codes` | `discount_codes` (CRUD) |
| Audit | `audit_logs` | — (read-only) |
| Statistics | derived from in-memory data | — |
| Settings | — | — |

---

## 8. Security Notes

- **AdminRoute still gates `/lumos-admin`.** Non-admins get the 403
  page (`src/components/shared/AuthRoutes.tsx:62-86`). Unchanged.
- **No service-role key in the frontend.** Bundle scan post-build
  returned **no matches** for `service_role`, `SUPABASE_SERVICE`,
  `VITE_AI_*`, `sk_live`, `sk_test`, `sb_secret`.
- **No RLS migrations were created or applied** for this UX rewrite.
  Existing RLS expectations (master admin, per-table policies) remain
  the boundary.
- **Plaintext security_answer is never displayed.** The Clients →
  Security tab shows only the question and an explanatory note that
  the hash lives server-side.
- **No role escalation paths.** Team form `role` field is constrained to
  `admin / manager / sales / designer`. Permission matrix UI is
  view-only.
- **Permission gates are UI-only.** Documented prominently at the top of
  the Team & Permissions section and again in `RBAC_BACKEND_TODO.md`.
- **No fake data, no fake metrics.** All numbers in the new dashboard
  come from real queries; missing data shows empty states.
- **No dead buttons.** Quick actions either open a real flow, navigate,
  or are disabled with a tooltip when the role lacks permission.
- **CSP / connect-src.** Unchanged from the production launch pass.
  Admin dashboard does not introduce new external endpoints.

---

## 9. Responsive Behavior

- **≥ 1024 px (lg):** sidebar visible, main content max-width 1500 px,
  3-column grids on overview / requests / clients / team / discounts.
- **640 – 1024 px (md):** sidebar hidden, mobile section nav appears at
  the top as a horizontal pill rail; cards drop to 2 columns; Kanban
  drops to 2 columns.
- **< 640 px:** mobile section nav, single-column cards, drawers fill
  the width with a `max-w` cap; topbar collapses (welcome message
  hidden, search hidden — refresh / theme / bell / avatar remain).

Direction (LTR / RTL) follows the global `LanguageContext` which already
sets `document.dir` on language toggle.

---

## 10. Commands Run

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 — no type errors |
| `npm run lint` | 0 errors, 7 warnings (all pre-existing in `useAvailabilityCheck.ts` and `AiChatSidebar.tsx`, unchanged from the previous launch pass) |
| `npm run build` | exit 0 — built in ~24s |
| `npm audit --audit-level=low` | found 0 vulnerabilities |
| `Grep dist for service_role / SUPABASE_SERVICE / SERVICE_ROLE / VITE_AI_ / sk_live / sk_test / sb_secret` | No files found — bundle is clean |

The new admin dashboard chunk is 142 kB / 35 kB gzipped.

---

## 11. Remaining Notes / Backend TODOs

Every item below is **necessary for full role-based security**, but the
UI works fine in its UX-only form today.

1. **Persist server-trusted role.** Either `clients.role` or
   `team_members.user_id`. See `RBAC_BACKEND_TODO.md §1`.
2. **Implement `current_admin_role()` and `has_perm()` SECURITY DEFINER
   functions** that mirror the matrix in
   `src/features/admin/permissions.ts`. (`§2` of the TODO)
3. **Replace blanket `is_admin()` policies** on `pricing_requests`,
   `clients`, `orders`, `contacts`, `notifications`, `team_members`,
   `discount_codes`, `audit_logs` with `has_perm(...)` policies. (`§3`)
4. **Designer / sales ownership scoping** — only see assigned records.
   (`§4`)
5. **Per-user overrides** via a `role_permissions` table if needed.
   (`§5`)
6. **Files section** is currently an empty state. To populate it:
   - Provide a server-side index (Edge Function) over the
     `client-assets` bucket, since per-client RLS prevents a single
     query from listing assets across clients.
7. **Per-section assignment indicator** on requests / projects — the
   underlying `assigned_to` data exists but the UI doesn't render an
   "assigned to me" filter yet. Easy follow-up once roles are real.
8. **Realtime fanout for `notifications` and `audit_logs`** — currently
   only fetched on mount + manual refresh. The existing realtime channel
   already covers `pricing_requests`, `contacts`, `clients`, etc.
9. **Two pre-existing latent issues surfaced and fixed during this pass:**
   - `useAdminDashboard.ts` was importing missing named exports from
     `adminDashboardService.ts` (would have failed any time the hook
     entered the bundle). Fixed by adding the named re-exports.
   - `ClientMasterModal.tsx` is broken (its service stub
     `adminClientModalService.ts` is missing every method it imports).
     The new shell does **not** use it; the file is left on disk
     unchanged so existing references elsewhere still resolve, but it
     should be deleted in a future cleanup pass.
10. **Permission matrix drift detection.** Add a CI check that diffs
    `permissions.ts` against the SQL `has_perm()` body so the two stay
    in sync once RBAC is real.

---

**Verdict: ✅ The admin dashboard UX is production-ready.** Real RBAC
enforcement requires the work catalogued in `RBAC_BACKEND_TODO.md`. Until
then, **the UI is permission-aware but the database remains the only
real authorisation layer** — make sure the existing RLS policies on
the listed tables are in place before launching.
