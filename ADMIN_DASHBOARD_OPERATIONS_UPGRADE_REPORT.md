# Admin Dashboard Operations Upgrade Report — Lumos Website

## 1. Summary

This pass turns the redesigned `/lumos-admin` into a real operations console.
Requests are fully editable and carry a stable invoice number, the Clients
section now surfaces the complete profile (cover, avatar, business, brand,
related requests, related messages, related files), Messages is a real
realtime conversation view between clients and the team, Files is a
working upload/download surface backed by the private `client-assets`
bucket, Team & Permissions persists a custom permission matrix per
employee, and Settings is a fully editable workspace control panel.

Every change is additive. AdminRoute, RLS expectations, the master admin
gate, and existing CRUD paths are unchanged. New tables, columns, and
policies live in five idempotent migrations that admins can apply when
ready — the UI degrades gracefully when they aren't applied yet.

---

## 2. Files Created / Modified

### Migrations (created)

| File | Purpose |
|---|---|
| `supabase/migrations/20260507140000_pricing_request_invoice_number.sql` | Adds `pricing_requests.invoice_number`, year-scoped `invoice_counters` table, `next_invoice_number()` SECURITY DEFINER function, BEFORE-INSERT trigger, and a backfill loop. |
| `supabase/migrations/20260507140100_client_messages_rls.sql` | Enables RLS on `client_messages` with own-conversation policies for clients and full access for admins, plus optional `attachment_url/name/type` columns and Realtime publication. |
| `supabase/migrations/20260507140200_client_assets_extended.sql` | Adds `uploaded_by`, `uploaded_by_type`, `category`, `note`, `file_size`, `storage_path` to `client_assets` and installs RLS (clients see own assets, admins manage all). |
| `supabase/migrations/20260507140300_team_members_permissions.sql` | Adds `team_members.user_id` (FK to `auth.users`), `team_members.permissions jsonb`, `team_members.last_active_at`. Permissions blob is the per-member custom override store. |
| `supabase/migrations/20260507140400_workspace_settings.sql` | Singleton-row `workspace_settings` table with RLS (anyone authenticated reads, admin updates). |

### Code (created)

| File | Purpose |
|---|---|
| `src/features/admin/data/useClientConversations.ts` | Loads every visible client message, exposes per-client conversation summaries, handles realtime INSERT/UPDATE/DELETE, and exposes `send`, `markRead`, `markClientRead`, `remove`. |
| `src/features/admin/data/useClientFiles.ts` | Loads `client_assets`, uploads files to `client-assets/<clientId>/files/<category>/<safe-name>`, generates 1-year signed URLs at upload time and on-demand short-lived signed URLs for download, deletes both blob and metadata. |
| `src/features/admin/data/useWorkspaceSettings.ts` | Loads `workspace_settings`, surfaces `missingTable` UX state when the migration hasn't been applied, persists updates. |

### Code (rewritten)

| File | What changed |
|---|---|
| `src/features/admin/sections/RequestsSection.tsx` | Fully editable request drawer (Edit / Pricing / Workflow / History / Advanced / Danger). Cards now show invoice number, assigned member, currency, source. Quick actions: WhatsApp, Email, Open client, inline status change. Edit form covers status, priority, assignment, invoice number, guest/company info, link to client, package, notes, totals, currency, promo. |
| `src/features/admin/sections/ClientsSection.tsx` | Cover-and-avatar card layout. Detail drawer shows 8 tabs including **Requests** (related pricing requests with invoice numbers), **Messages** (last 5 messages + open full conversation), **Files** (per-client uploads with download). Email-fallback matching for orphan requests is clearly labelled. |
| `src/features/admin/sections/MessagesSection.tsx` | 3-column real-time conversation view: list / thread / context. Auto-marks-read on open, supports text + file attachments, hooks into `useClientConversations` realtime stream. |
| `src/features/admin/sections/FilesSection.tsx` | Filterable file grid (by client, category, free-text), upload drawer that uploads to private bucket and inserts `client_assets` metadata, on-demand signed URLs for opening files. |
| `src/features/admin/sections/TeamPermissionsSection.tsx` | Permission editor with full per-member custom matrix toggles, role-preset shortcuts, and persistence to `team_members.permissions` jsonb. Member cards show count of custom-granted permissions. |
| `src/features/admin/sections/SettingsSection.tsx` | 7-tab settings panel: Workspace / Notifications / Workflow / Client portal / Files / Security / Smart controls. Persists to `workspace_settings`. Surfaces a clear `missingTable` warning when the migration isn't applied. |
| `src/features/admin/components/AdminShell.tsx` | New cross-section wiring: clicking a request's "View client" routes to Clients with that client's drawer pre-opened; Client → Messages opens the full conversation in Messages section; Smart Controls receive live counts of follow-ups and missing onboardings. |

### Types

| File | Change |
|---|---|
| `src/types/dashboard.ts` | `PricingRequest.invoice_number` added. `TeamMember.user_id`, `TeamMember.permissions`, `TeamMember.last_active_at` added. |

---

## 3. Major Features Added

### Editable requests
Every pricing request is now fully editable from the admin drawer, covering
status, priority, assignment, invoice number, guest / company contact,
client link, package name, request notes, admin notes, subtotal, total,
currency, applied promo code. Workflow tab keeps quick action buttons for
Approve / Reject / Reviewing / Convert-to-project. Advanced tab keeps the
raw JSON behind a `<details>` for transparent debugging. Danger Zone is
isolated and confirmation-gated.

### Invoice numbers
`pricing_requests.invoice_number` is added by the new migration, populated
by the BEFORE-INSERT trigger (`assign_pricing_request_invoice`) and an
idempotent backfill loop. Format: `LUMOS-<year>-<padded-sequence>`,
e.g. `LUMOS-2026-0001`. Year-scoped counter table guarantees uniqueness
even with concurrent inserts. Unique partial index prevents collisions
during manual edits. Frontend cards show the invoice number prominently;
the drawer offers a one-click copy.

### Richer request cards
Cards now display the invoice number, status, priority, total +
currency, assigned team member, created date, and inline quick-action
buttons (WhatsApp, email, open linked client, change status without
opening the drawer).

### Full client details
The client detail drawer adopts a cover + avatar hero and 8 tabs:
Profile, Business, Project, **Requests**, **Messages**, **Files**,
Security, Admin. Brand colors render as swatches. Plaintext security
answer remains hidden. The Requests tab pulls related pricing requests
either by `client_id` (preferred) or by case-insensitive email match
(clearly labelled as "matched by email").

### Real-time messages
`MessagesSection` is a real two-way chat view:
- **Conversation list** (left) shows every client with at least one
  message, unread count, and the latest preview.
- **Thread** (center) renders the chat, supports text + file
  attachments, sends with Enter (Shift+Enter for newline), shows
  delete-on-hover for admins, auto-scrolls to the newest message,
  and auto-marks the client's unread messages as read on open.
- **Context** (right) shows the client's avatar/cover, package, related
  invoice numbers, WhatsApp / email shortcuts, and "Open client".

Realtime is wired through Supabase channels (INSERT / UPDATE / DELETE on
`public.client_messages`). When realtime is unavailable, the UI falls
back to manual refresh + the postgres_changes channel will queue and
flush.

### Client file sharing
`FilesSection` lets admins upload to any client by selecting the client,
category, and file. Uploads land in
`client-assets/<clientId>/files/<category>/<timestamp>-<safe-name>` —
matching the storage RLS path policy. On insert, a 1-year signed URL is
saved to `client_assets.file_url` and the storage path is recorded in
`storage_path` so the on-demand short-lived signed URL flow can refresh
expired links. Filters: by client, by category, free-text search. Delete
removes both the storage object and the metadata row.

### Custom employee permissions
`team_members.permissions` (jsonb) now persists a fine-grained
`{ resource: { action: boolean } }` map per employee. The UI provides:

- A live matrix of toggles (resources × actions).
- One-click presets for Owner / Admin / Manager / Sales / Designer /
  Support / Viewer.
- A read-only "default permission matrix" reference drawer.

Member cards show how many custom permissions are granted. **Real
enforcement still requires Supabase RLS** — the persistence layer is in
place; the SQL `has_perm()` function is documented in
`RBAC_BACKEND_TODO.md` from the prior pass.

### Advanced settings
`SettingsSection` becomes a 7-tab control panel:

1. **Workspace** — agency name, currency, timezone, language, date format,
   default dashboard view, theme/language toggles.
2. **Notifications** — email-on-request / message / file / admin activity.
3. **Workflow** — default request status, default priority, follow-up
   days.
4. **Client portal** — allow client uploads / messages / require profile
   completion / default profile visibility.
5. **Files** — allowed file types, max upload size, default categories.
6. **Security** — read-only checklist (AdminRoute, no service-role,
   manual RLS check pointer).
7. **Smart controls** — live counts (requests needing follow-up, clients
   missing onboarding) plus manual-check items for storage privacy and
   public policies.

Persists to `workspace_settings.id = 1`. If the migration isn't applied,
the UI shows a friendly amber callout and disables saves instead of
failing silently.

---

## 4. Database / Migration Changes

| Table | Migration | Change |
|---|---|---|
| `pricing_requests` | `20260507140000` | + `invoice_number text` (nullable, unique partial index), trigger-assigned and backfilled |
| `invoice_counters` | `20260507140000` | new — per-year sequence used by `next_invoice_number()` |
| `client_messages` | `20260507140100` | + `attachment_url`, `attachment_name`, `attachment_type`; RLS enabled with own-conversation policies; added to `supabase_realtime` publication |
| `client_assets` | `20260507140200` | + `uploaded_by`, `uploaded_by_type`, `category`, `note`, `file_size`, `storage_path`; RLS enabled with own-asset policies; added to `supabase_realtime` |
| `team_members` | `20260507140300` | + `user_id` (FK auth.users, partial unique), + `permissions jsonb`, + `last_active_at` |
| `workspace_settings` | `20260507140400` | new singleton (id=1) preferences row |

All migrations are idempotent. They use `add column if not exists`,
`drop policy if exists` before `create policy`, `do $$ ... if not found
then ... end$$` for publication membership, and `on conflict do nothing`
for seed rows.

---

## 5. RLS / Security Policies

### `pricing_requests.invoice_number`
Inherits the existing pricing_requests policies — clients can only read
own requests (by `client_id`); admins manage all. The
`next_invoice_number()` function runs as `SECURITY DEFINER` so the
counter row stays admin-only while the trigger can still increment it.

### `client_messages`
- `client reads own messages` — `client_id = auth.uid()`
- `client inserts own messages` — `client_id = auth.uid() AND sender = 'client'`
- `client updates own messages` — only flips `is_read`; rejects edits to `sender`, `message`, `client_id` via subselect comparison
- `admin manages messages` — full access via `public.is_admin()`

### `client_assets`
- `client reads own assets` — `client_id = auth.uid()`
- `client inserts own assets` — `client_id = auth.uid() AND uploaded_by_type = 'client'`
- `admin manages assets` — full access via `public.is_admin()`

The bucket-level storage policies from
`20260507120300_storage_rls_client_assets.sql` already enforce that the
file blob lives at `<client_id>/...` and admins can read/write
everything, so the new metadata table doesn't widen storage access.

### `team_members.permissions`
The blob inherits the existing `admin manages team_members` policy.
Clients (anon) still see only `is_active = true` rows; admins still
manage everything.

### `workspace_settings`
- `anyone reads workspace settings` — gated to `authenticated` (not
  anon) to limit fingerprinting from public visitors.
- `admin updates workspace settings` — only admins can write.

---

## 6. Requests Section

- **Card grid** with invoice number badge (mono, emerald), name,
  package, total + currency, priority badge, assigned member, created
  date.
- **Inline quick actions** on the card: WhatsApp, email, open client,
  status `<select>`. Clicking the card body opens the drawer.
- **Drawer** with 6 tabs: Edit, Pricing, Workflow, History, Advanced,
  Danger.
  - *Edit*: status / priority / assignment / invoice / guest +
    company contact / link to existing client / package / request notes
    / admin notes.
  - *Pricing*: subtotal / total / currency / applied promo + selected
    services list (read).
  - *Workflow*: Approve / Reject / Reviewing pills + Convert-to-project
    + workflow metadata.
  - *History*: status_history timeline.
  - *Advanced*: raw JSON inside `<details>`.
  - *Danger*: delete with browser confirm.

All saves go through `adminDashboardService.updatePricingRequest`. The
shell calls `dashboard.refresh()` after edit so the realtime channel
updates merge cleanly.

---

## 7. Clients Section

- **Card** with cover gradient, avatar/initial, status badge, contact
  info, progress bar, related-request count.
- **Drawer hero** with cover + large avatar + tagline.
- **Tabs**: Profile, Business, Project, **Requests** (with invoice
  numbers + email-match indicator), **Messages** (last 5 + "Open full
  conversation"), **Files** (admin-uploaded + signed URL on click),
  Security (no plaintext answer), Admin.
- **Cross-links**: Open Request, Open Messages.

`onOpenClient` from Requests pre-opens the client in the Clients
section; `onOpenMessages` from Clients pre-opens the conversation in
Messages.

---

## 8. Messages

- Realtime via `supabase.channel('admin-client-messages')` listening to
  `INSERT`, `UPDATE`, `DELETE` on `public.client_messages`. Toast on new
  client-sent message.
- Per-client subscription helper (`subscribeToClient`) is exposed for
  per-thread experiences (used in the future for typing indicators).
- The migration adds `client_messages` to the `supabase_realtime`
  publication if it isn't already a member.
- **Fallback**: if the project hasn't enabled Realtime at the project
  level, the Refresh button reloads the conversation list and the
  channel will silently no-op without crashing the UI.
- Client side: the existing `usePortalData` already subscribes to
  `client_messages` realtime for the signed-in client and renders new
  messages in the `/profile` Messages section. Both sides update in
  real time when Realtime is enabled.

---

## 9. Files

- **Bucket**: `client-assets` (private). Existing storage RLS enforces
  per-client folder access; admin policies already allow cross-client
  read/write.
- **Path**: `<client_id>/files/<category>/<timestamp>-<safe-name>`
  matching the existing folder convention (so the storage policy still
  scopes correctly).
- **Metadata**: `client_assets` row inserted with `uploaded_by`,
  `uploaded_by_type='admin'`, `category`, `note`, `file_size`,
  `storage_path`.
- **Signed URLs**: a long-lived signed URL (1 year) is saved to
  `file_url` for convenience; an on-demand 5-minute signed URL is
  generated when the user clicks Open, falling back to the saved URL.
- **Delete**: removes both the storage object and the DB row.
- **Client side**: `/profile` Files section reads `client_assets` for
  the signed-in user via the existing `usePortalData` realtime
  subscription, so admin uploads appear immediately in the client
  portal.

---

## 10. Team & Permissions

### Roles
Owner / Admin / Manager / Sales / Designer / Support / Viewer (matrix
in `src/features/admin/permissions.ts`).

### Permission editor
- Two tabs: Profile + Permissions.
- Permissions matrix: rows = resources, columns = actions (`view`,
  `create`, `edit`, `assign`, `delete`, `manage_permissions`).
- Click a cell to toggle. Preset buttons replace the entire blob with
  the role's defaults.
- Member cards show "N custom perms" derived from the saved jsonb.

### What's enforced today
- Sidebar visibility, action button enable/disable, drawer visibility:
  enforced by `useAdminPermission` reading the role.
- The persisted blob is read/writable by admins only via existing
  `team_members` RLS.
- Per-member permissions persist correctly to the database.

### What still needs backend work
- The frontend role today is `owner` for any admin-emailed user. To
  enforce per-member permissions:
  1. Set `team_members.user_id = auth.uid()` for each member.
  2. Replace `is_admin()` policies on operational tables with
     `has_perm(resource, action)` SECURITY DEFINER helpers that read
     `team_members.permissions` for the active session.
  3. Mirror the matrix from `permissions.ts` in SQL.
- Detailed in `RBAC_BACKEND_TODO.md` (created in the prior pass).

---

## 11. Settings

7 tabs, all editable, persisted to `workspace_settings.id = 1`:

| Tab | Fields |
|---|---|
| **Workspace** | agency_name, default_currency, timezone, default_language, date_format, default_dashboard_view + theme & language toggles |
| **Notifications** | notify_email_on_request / message / file / admin_activity |
| **Workflow** | default_request_status, default_priority, follow_up_days |
| **Client portal** | allow_client_uploads / allow_client_messages / require_profile_completion + default_profile_visibility |
| **Files** | allowed_file_types, max_upload_mb, default_file_categories |
| **Security** | email + role badge, AdminRoute checklist, manual-check pointer |
| **Smart controls** | live counts: requests needing follow-up, clients missing onboarding + manual-check pointers for storage privacy and public-policy audit |

Smart controls show real numbers from the in-memory dashboard data — no
fake metrics. Anything that requires a live SQL inspection (e.g. "no
public policies on sensitive tables") is explicitly marked **Manual
check required** and points to `SUPABASE_FINAL_MANUAL_CHECKS.md`.

When the `workspace_settings` migration hasn't been applied, the UI
displays an amber warning and disables saves — no silent failures.

---

## 12. Security Notes

- **AdminRoute, master admin email, and existing RLS policies are
  unchanged.** Real authorisation continues to live in Supabase, not the
  frontend.
- **No service-role key in the frontend.** `Grep` over `dist/assets/`
  for `service_role`, `SUPABASE_SERVICE`, `SERVICE_ROLE`, `VITE_AI_*`,
  `sk_live`, `sk_test`, `sb_secret` returned **no matches**.
- **No role escalation.** Permission edits are gated by the
  `team.manage_permissions` capability and persist only to the chosen
  member's row.
- **No plaintext security answers.** Clients → Security tab still
  refuses to render the answer; only the question is shown.
- **No fake data.** Every section shows real DB counts. Empty states
  and "Manual check required" notes are used everywhere data is missing
  or unverifiable from the frontend.
- **No broad public policies introduced.** `client_messages`,
  `client_assets`, and `workspace_settings` policies all gate writes to
  `auth.uid()` ownership or `is_admin()`.
- **Open redirects, CSP, and bundle scans** unchanged from the prior
  launch pass; no new external endpoints were added.

---

## 13. Commands Run

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors, 9 warnings (2 new are intentional `useEffect` deps using `.id`; 7 are pre-existing in `useAvailabilityCheck.ts` and `AiChatSidebar.tsx`) |
| `npm run build` | exit 0 — admin chunk 187 kB / 46 kB gzipped |
| `npm audit --audit-level=low` | 0 vulnerabilities |
| `Grep dist for service_role / SUPABASE_SERVICE / SERVICE_ROLE / VITE_AI_ / sk_live / sk_test / sb_secret` | No files found |

---

## 14. Manual Test Checklist

Smoke-test order for a deploy:

1. Apply the 5 migrations in order:
   - `20260507140000_pricing_request_invoice_number.sql`
   - `20260507140100_client_messages_rls.sql`
   - `20260507140200_client_assets_extended.sql`
   - `20260507140300_team_members_permissions.sql`
   - `20260507140400_workspace_settings.sql`
2. Open `/lumos-admin` as the master admin → all 12 sections render, no
   console errors.
3. Open `/lumos-admin` as a non-admin email → 403 page.
4. **Requests**: open a request → invoice number visible → edit any
   field → Save → toast confirms → list refreshes with new value.
5. **Clients**: open a client → cover + avatar hero render → Requests
   tab lists related pricing requests with invoice numbers → Messages
   tab shows last messages → Files tab lists per-client uploads.
6. **Messages**: select a conversation → unread badge clears → type a
   message → it appears in `/profile` for that client without manual
   refresh (Realtime).
7. **Messages**: from `/profile`, send a client message → admin sees the
   toast and the new bubble immediately.
8. **Files**: upload a file for a client → admin sees it in Files
   section → client sees it in `/profile` Files immediately.
9. **Team & Permissions**: toggle a permission for a member → Save → row
   reloads with the matrix preserved → "N custom perms" updates.
10. **Settings**: change agency name → Save → toast confirms → reload
    page → value persists.
11. **/profile**: signed-in client can read/write own messages and read
    own files (no cross-client leakage).
12. **/client-login** and **/invite-onboarding**: still work; no
    regressions from the new code.
13. Console: no `Bot is not defined`, no fake AI buttons, no broken
    quick actions, no silent failures.

---

## 15. Remaining Backend TODOs

These items are flagged so nothing is silently UI-only:

1. **Real per-member RBAC enforcement.** The custom permission matrix
   persists to `team_members.permissions`, but RLS still uses
   `is_admin()`. To enforce per-member permissions in the database, add
   a `has_perm(resource, action)` SECURITY DEFINER function that reads
   `team_members.permissions` for the active session, then replace
   blanket `is_admin()` policies with calls to that function. See
   `RBAC_BACKEND_TODO.md` for the full plan.
2. **Realtime project setting.** The `client_messages` and
   `client_assets` migrations add the tables to the `supabase_realtime`
   publication, but Realtime must be **enabled at the project level**
   (Supabase dashboard → Database → Replication) for the dashboard's
   live updates to work. If it's disabled, the dashboard still works
   via Refresh — but the realtime UX advertised here won't fire.
3. **Email delivery for notifications.** The Settings → Notifications
   toggles are persisted, but actual email dispatch requires a Supabase
   Edge Function wired to a transactional email provider. The toggles
   are settings, not implementations.
4. **Client message attachments storage.** Today an admin attaching a
   file goes through the same `client-assets` upload + signed URL flow,
   then sends the message with an `attachment_url`. There is no
   separate "messages bucket" and no automatic expiry handling — the
   1-year signed URL is the contract. Rotate by deleting the file (the
   metadata row is already cascade-deleted by the file delete flow).
5. **Per-user permission overrides via dedicated table.** If product
   needs row-level overrides finer than `team_members.permissions`,
   create the `role_permissions` table from `RBAC_BACKEND_TODO.md §5`.
6. **Audit triggers.** Mutations through the new admin flows do not
   automatically emit `audit_logs` entries. The schema is in place but
   triggers/Edge-function wrappers still need to be added so audit
   logging is consistent across UI and SQL paths.
7. **Workspace settings → app-wide effects.** Settings like
   `default_currency`, `default_language`, `allow_client_uploads`, etc.
   persist correctly but are not yet read by every consumer (e.g. the
   marketing site still uses its own defaults). Wire the setting
   readers feature-by-feature as needed.
8. **Files preview.** Today admins click "Open" to view a file in a new
   tab. A first-class image/PDF preview drawer is straightforward
   follow-up work but isn't shipped here.

---

## Verdict

**The admin dashboard is now a working operations console.** Requests
are editable end-to-end with stable invoice numbers, Clients show the
full picture (profile, business, brand, requests, messages, files),
Messages is a real two-way realtime conversation surface, Files is a
working private file-sharing surface, Team & Permissions persists
custom per-employee permissions, and Settings is a fully editable
workspace control panel. Five idempotent migrations carry the schema
work; UI degrades gracefully when they aren't applied.

**Real per-member RBAC enforcement still requires the SQL work in
`RBAC_BACKEND_TODO.md`.** The frontend permission matrix is now
persistent and editable, but Supabase RLS continues to be the only real
authorisation layer until `has_perm()` lands.
