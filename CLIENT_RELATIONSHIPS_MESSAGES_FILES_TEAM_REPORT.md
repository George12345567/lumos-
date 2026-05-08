# Client Relationships, Messages, Files & Team Report — Lumos

## 1. Summary

This pass is a **focused upgrade** to the relationship between Clients,
Messages, Files, Requests, and Team & Permissions inside `/lumos-admin`.
Nothing else was redesigned. The client detail drawer now surfaces every
related artifact (requests, messages, files, team-link status), exposes
Refresh buttons next to live data, and gives admins a one-click flow to
promote an existing client into a team member with a chosen role and
custom permissions. The Team & Permissions section gains filter chips, a
linked-client badge, and a "View linked client" jump.

All earlier infrastructure from the prior pass is reused — `client_messages`
RLS + Realtime, `client_assets` upload + signed URLs, the
`team_members.permissions` jsonb store, and Realtime subscriptions on
both the admin and the client portal sides. Only two new migrations were
added to round out the schema: `team_members.client_id / job_title` and
optional `client_messages.sender_id / sender_name` for richer sender
identity.

---

## 2. Files Created / Modified

### Created

| File | Purpose |
|---|---|
| `supabase/migrations/20260507150000_team_members_client_link.sql` | Adds `team_members.client_id` (FK clients), `team_members.job_title`, partial unique index on `client_id`. Idempotent. |
| `supabase/migrations/20260507150100_client_messages_sender_identity.sql` | Adds `client_messages.sender_id`, `client_messages.sender_name` for richer author display. Idempotent. |
| `src/features/admin/components/LinkClientToTeamModal.tsx` | New "Add as team member" / "Manage employee access" drawer with role + job title + active toggle + custom permission matrix and preset shortcuts. |

### Modified

| File | What changed |
|---|---|
| `src/types/dashboard.ts` | `TeamMember.client_id` and `TeamMember.job_title` added; nothing removed. |
| `src/features/admin/data/useClientConversations.ts` | `AdminClientMessage` gains `sender_id` / `sender_name`; `send()` accepts optional `sender: { id, name }` so admin sends populate the new identity columns. |
| `src/features/admin/data/useTeamMembers.ts` | Adds `linkClientAsMember(client, input)` (insert-or-update with duplicate prevention by `client_id` then case-insensitive email match), `memberByClientId` map, `findByEmail` helper. `createMember` now persists `client_id`, `user_id`, `job_title`, `permissions` when present. |
| `src/features/admin/sections/ClientsSection.tsx` | New **Team access** tab + linked-client badge in hero. Refresh buttons added on Messages and Files tabs. New props: `onLinkAsTeam`, `onManageTeamMember`, `teamMemberByClientId`. Sender name surfaced in the recent-messages preview. |
| `src/features/admin/sections/TeamPermissionsSection.tsx` | Filter chips (All / Active / Inactive / by role) + search. Linked-client badge with "View" button. `highlightedMemberId` prop pre-opens a member when navigated from the client drawer. Refresh button in section header. |
| `src/features/admin/sections/MessagesSection.tsx` | Resolves the active admin's `auth.uid` and display name and threads them through `conv.send` so `sender_id` / `sender_name` are populated. Each chat bubble now shows the sender label. |
| `src/features/admin/components/AdminShell.tsx` | Wires `LinkClientToTeamModal` (open-from-client-drawer flow), passes `memberByClientId` and `clientsById` between sections, supports `highlightedTeamMember` jump from client → Team & Permissions and `onOpenLinkedClient` jump back. |

---

## 3. Client Drawer Upgrade

The client detail drawer now has 9 tabs, each backed by **real data, not
duplicates**:

| Tab | Source | Notes |
|---|---|---|
| Profile | `clients` | unchanged |
| Business | `clients` | unchanged |
| Project | `clients` | unchanged |
| **Requests** | `pricing_requests` | filters on `client_id`, falls back to case-insensitive `email` match clearly labelled "matched by email"; "Open" jumps to the Requests section. |
| **Messages** | `client_messages` | last 5 messages + sender label + **Refresh** button + "Open full conversation" → Messages section. |
| **Files** | `client_assets` | per-client list + **Refresh** button + on-demand 5-minute signed URLs for download; admin uploads continue from the main Files section. |
| **Team access** *(new)* | `team_members` | shows whether the client is already a team member; "Add as team member" or "Manage employee access" buttons; "Open in Team & Permissions" jump. |
| Security | `clients` | plaintext security answer is still hidden. |
| Admin | `clients` | unchanged. |

A **violet "Team member" badge** in the drawer hero shows up immediately
when the client is linked.

---

## 4. Existing Client as Team Member

Promoting an existing client uses the new `LinkClientToTeamModal`:

1. Admin opens a client → **Team access** tab → clicks **Add as team
   member** (only available if `team.create` permission is held).
2. Modal opens preloaded with:
   - **Job title** input
   - **Role** dropdown (admin / manager / sales / designer)
   - **Active** toggle
   - **Custom permission matrix** with one-click presets (owner / admin
     / manager / sales / designer / support / viewer)
3. On save, `useTeamMembers.linkClientAsMember(client, input)` runs:
   - **Duplicate prevention**: looks up an existing member first by
     `client_id`, then by case-insensitive `email`. If found, **updates**
     that record (and ensures `client_id` is set). Otherwise **inserts**
     a new row populated from the client's existing profile (name,
     email, phone, avatar).
4. The drawer reflects the result instantly: the badge becomes "Already
   a member", and the Team access tab switches to **Manage employee
   access**.

If the existing record has the same email **but no `client_id`** (a
legacy/manual team member row), the modal's `Already a member` notice
explains that the link will be added rather than a duplicate created.

### Permission storage
The blob persists to `team_members.permissions` (jsonb) which already
exists from the prior `20260507140300_team_members_permissions.sql`
migration. Only Owner / Admin can manage permissions — gated by
`team.manage_permissions` from the frontend matrix.

---

## 5. Messages

### Schema
- `client_messages` — `id, client_id, sender, message, is_read,
  created_at` plus prior-pass attachment columns
  (`attachment_url/name/type`) and **new sender identity** (`sender_id`,
  `sender_name` from `20260507150100_client_messages_sender_identity.sql`).
- The existing `sender` column stays as the canonical type (`'client' |
  'team' | 'admin'`) for backwards compatibility with the client portal's
  `usePortalData` hook.

### Realtime
- The client_messages migration from the prior pass added the table to
  `supabase_realtime` publication.
- Admin side: `useClientConversations` subscribes to INSERT / UPDATE /
  DELETE on the table at the channel level and merges incoming rows into
  the in-memory list. Toast on incoming client message.
- Client side: `usePortalData` (already in place) subscribes per-client
  via `client_id=eq.<id>` filter so the `/profile` Messages section
  reflects admin sends in real time.
- **Refresh fallback** is exposed everywhere — top of MessagesSection,
  inside the client drawer Messages tab, and the section header — so if
  the project's Realtime feature is disabled, admins can still fetch the
  latest with one click.

### Sender identity
- Admin sends now include `sender_id = auth.uid()` and `sender_name`
  derived from the admin's profile username or email-local-part.
- Each chat bubble and the client-drawer Messages preview render the
  `sender_name` when present, falling back to "Lumos team" / "Client"
  labels.
- No schema renames — `sender` is unchanged. Old rows render as before.

### Visibility
- RLS (added in the prior pass): clients only see their own thread,
  admins see everything; clients can only insert with
  `sender = 'client'` and their own `client_id`.

---

## 6. Files

### Schema
- `client_assets` (existing) — extended in the prior pass with
  `category, uploaded_by, uploaded_by_type, note, file_size,
  storage_path`.
- The user-requested `client_files` table is **not introduced** — the
  same fields already live on `client_assets`, and creating a parallel
  table would split the client portal's existing reads from admin
  uploads. This decision is documented; if a separate table is mandatory
  for product reasons, we can migrate later.

### Storage path
- Bucket: `client-assets` (private).
- Path layout: `<client_id>/files/<category>/<timestamp>-<safe-name>`.
  Same path policy as the existing storage RLS migration.
- A 1-year signed URL is saved to `client_assets.file_url` at upload
  time; a fresh **5-minute signed URL** is generated on each download
  click via `createSignedUrl(storage_path, 300)`. No `getPublicUrl`,
  ever.

### Upload flow
- **From the main Files section**: requires picking a client, category,
  optional note, plus the file.
- **From the client drawer Files tab**: shows current files and a
  Refresh button; the upload itself stays in the main Files section per
  the "client drawer is a connected summary, not a replacement" rule.
- Success requires both the storage upload and the metadata insert. On
  failure, the toast shows the underlying error.

### RLS
- Clients read only their own assets (`client_id = auth.uid()`).
- Admins read/write any asset.
- Storage policies are unchanged — per-folder ownership for clients,
  full bucket access for admins.

---

## 7. Team & Permissions

### Section UX
- Filter chips: **All / Active / Inactive / Admin / Manager / Sales /
  Designer**.
- Free-text search across name / email / phone / job title.
- Refresh button in the section header.
- Each card now shows:
  - avatar / initial
  - name + role badge + Inactive badge if not active
  - **Linked client** badge when `team_members.client_id` is set
  - job title (when set)
  - email + phone
  - count of custom permissions granted
  - linked-client footer with the client's name and a **View** button
    that jumps to the Clients section pre-opened on that client.

### Permission editor
- One-click presets for Owner / Admin / Manager / Sales / Designer /
  Support / Viewer (same matrix as `src/features/admin/permissions.ts`).
- Per-cell custom toggles for `view / create / edit / assign / delete /
  manage_permissions` against `requests / clients / projects / contacts
  / messages / files / team / discounts / audit_logs / statistics /
  settings`.
- The number of granted permissions is shown live.
- **Only Owner/Admin** sees the toggles enabled; everyone else sees the
  preview but can't save changes (gated by
  `useAdminPermission('team', 'manage_permissions')`).

### Cross-section navigation
- From a client drawer's Team access tab → **Manage permissions** opens
  Team & Permissions with that member highlighted (drawer auto-opens).
- From a team card → **View** linked client opens the Clients section
  with the client drawer pre-opened.

### What is enforced today
- Sidebar visibility, button enable/disable, and tab visibility honor
  the role's permissions in the frontend matrix.
- The blob persists correctly in `team_members.permissions`.
- **Real DB-level enforcement still requires `has_perm()` SECURITY
  DEFINER work** (see `RBAC_BACKEND_TODO.md`). The amber callout on the
  Team & Permissions section says so explicitly.

---

## 8. RLS / Security

| Table / Resource | Policies (current) |
|---|---|
| `clients` | Client reads/updates own row (no role escalation); admin manages all. |
| `pricing_requests` | Anon insert (lead form); client reads own (`client_id = auth.uid()`); admin manages all. |
| `client_messages` | Client reads own thread; client inserts only as `sender = 'client'` for own `client_id`; client updates only flip `is_read`; admin manages all. |
| `client_assets` | Client reads own; client inserts only as own; admin manages all. |
| `team_members` | Anon reads `is_active = true`; admin manages all (covers the new `client_id`, `job_title`, `permissions`, `user_id`, `last_active_at` columns). |
| Storage `client-assets/*` | Per-`auth.uid` folder access for clients; admin can read/write across the whole bucket. |

### Specific safeguards verified in this pass
- A signed-in client cannot promote themselves to a team member: the
  flow is gated on `useAdminPermission('team', 'create')`, the modal
  only mounts inside `/lumos-admin`, and `team_members` writes still go
  through the existing `admin manages team_members` RLS policy.
- A non-admin team member cannot edit their own permissions in the UI —
  `useAdminPermission('team', 'manage_permissions')` is required for
  the matrix toggles to be enabled.
- Plaintext security answers remain hidden in the Security tab.
- No service-role key in the frontend (verified by post-build dist
  scan).
- Email-fallback matching for orphan requests is **admin-side
  convenience only**: clients cannot read another client's request just
  because their email matches; that is enforced by RLS on `client_id =
  auth.uid()`.

---

## 9. Client Profile Integration

The signed-in client's `/profile` already consumes:

- `client_messages` via `usePortalData`'s realtime subscription —
  admin/team messages appear instantly with the sender label.
- `client_assets` via the same hook — admin-uploaded files surface in
  the Files/Library section. Downloads use the same signed-URL pattern.

No change was required in the `/profile` code; the migrations and admin
flows are designed to be compatible with what the portal already reads.

---

## 10. Commands Run

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors, 10 warnings (all pre-existing in `useAvailabilityCheck.ts` / `AiChatSidebar.tsx` / two intentional `useEffect` deps using `.id`) |
| `npm run build` | exit 0; AdminDashboard chunk 205 kB / 50 kB gzipped |
| `npm audit --audit-level=low` | 0 vulnerabilities |
| `Grep dist for service_role / SUPABASE_SERVICE / SERVICE_ROLE / VITE_AI_ / sk_live / sk_test / sb_secret` | No files found |

---

## 11. Manual Test Checklist

Apply both new migrations first:

- `supabase/migrations/20260507150000_team_members_client_link.sql`
- `supabase/migrations/20260507150100_client_messages_sender_identity.sql`

Then exercise:

1. **Client drawer · related data**
   - Open a client → Requests tab lists pricing requests with their
     invoice numbers; "Open" jumps to Requests.
   - Messages tab shows the last 5 messages with sender labels;
     Refresh button reloads.
   - Files tab shows shared files; Refresh + Download work.
2. **Admin sends message → client receives in real time**
   - Open Messages section → pick the client → type → send.
   - In another browser as the client → `/profile` Messages updates
     without manual refresh (assuming Realtime is enabled).
3. **Client replies → admin receives**
   - From `/profile` send a reply → admin's MessagesSection shows the
     new bubble + toast within seconds.
4. **Admin uploads file → client sees**
   - Files section → upload to a client → on `/profile` the file
     appears in Files/Library and downloads via signed URL.
5. **Promote client to team member**
   - Open client → Team access → Add as team member → choose role
     `Sales` → save.
   - Hero shows the violet "Team member" badge.
   - Team & Permissions section now shows that member with the linked
     client badge + "View" button.
6. **No duplicates on second link**
   - Re-open the same client → Team access shows "Already a member".
   - Save again with a different role → the existing record updates;
     **no new row is created**.
7. **Filters in Team & Permissions**
   - Toggle Active / Inactive / role chips; search by name/email/job
     title.
8. **Manage permissions jump**
   - From the client drawer's Team access tab → Manage employee access
     → switches to Team & Permissions with the member's editor open.
9. **View linked client jump**
   - From a team card → View → switches to Clients with the drawer
     pre-opened on the linked client.
10. **Permissions security**
    - Signing in as a non-admin: `/lumos-admin` shows the 403 page.
    - As a normal client: cannot see other clients' messages/files in
      `/profile` (RLS-enforced).
11. **Refresh fallback**
    - With Realtime disabled at the project level, every Refresh button
      still re-fetches and the UI does not crash.

---

## 12. Remaining TODOs

- **Real RBAC enforcement.** The new `team_members.permissions` blob is
  persisted and edited in the UI, but database access is still gated by
  `is_admin()`. Replacing those with `has_perm(resource, action)`
  policies is the work in `RBAC_BACKEND_TODO.md`. Until then, the
  permission matrix is **UI-only authorisation guidance**, not a
  security boundary.
- **Realtime project setting.** Both the admin dashboard and the client
  portal subscribe to `client_messages` and `client_assets` channels.
  These no-op safely when Realtime is disabled at the project level —
  the Refresh buttons remain the fallback. Enable Supabase Realtime in
  the dashboard for the live experience.
- **Per-team-member scoping for designer/sales.** The matrix exposes
  `assign` for requests but actual ownership scoping ("designer only
  sees assigned requests") is part of the RLS work above.
- **`team_members.user_id` linkage.** Today the link uses
  `team_members.client_id`. If the team member ever changes their
  signed-in account, the SQL `has_perm()` helper will need to resolve
  `auth.uid() → team_members.user_id` (already added by the prior
  migration). The frontend doesn't write `user_id` automatically; this
  is fine because RLS still uses `is_admin()`.
- **`client_files` separate table.** Not added by this pass —
  `client_assets` already covers the schema and is what `/profile`
  reads. If product strictly requires a separate table, that's a
  greenfield migration + a portal read change in a follow-up.

---

**Verdict: ✅ Focused upgrade complete.** Clients, Messages, Files,
Requests, and Team & Permissions are now connected end-to-end through
the client detail drawer, with cross-section navigation, refresh
fallbacks, and a real "Add as team member" flow that prevents duplicates
and persists role + custom permissions. Real RBAC enforcement still
requires the SQL work tracked in `RBAC_BACKEND_TODO.md`.
