# Admin Final Bugfix Report — Lumos

## What was fixed

Six bug classes inside `/lumos-admin`. Nothing else was redesigned. RLS,
auth, service-role boundaries, and unrelated features are untouched.

1. **`client_assets` 400 errors and request-spam loops.** The hook ordered
   by `uploaded_at` (which may not exist on every schema variant) and
   refetched on every realtime event even after the initial fetch had
   failed.
2. **`client_messages` schema alignment + mark-read spam.** The dashboard
   already used `sender` correctly, but the `MessagesSection` `useEffect`
   depended on the entire `conv` object — which was a fresh reference on
   every render — so `markClientRead` re-fired every render against a
   client whose request had already failed.
3. **Light-mode contrast in admin headings/values.** Heavy-traffic text
   classes (`text-slate-900 dark:text-white`) were swept to theme-safe
   `text-foreground` so portals/drawers stay readable even when the
   `dark` class doesn't propagate to the rendered subtree.
4. **Radix Dialog accessibility warnings.** Every admin drawer is
   rendered via `AdminDrawer` (Sheet under the hood). Sheet was missing
   the `SheetTitle` / `SheetDescription` Radix primitives — they're now
   present (visible title + visible-or-screen-reader description).
5. **Pricing request `update` 400 errors.** The service now sanitises
   the update payload: drops unknown columns, coerces empty strings to
   `null` for UUID columns, normalises numbers, validates enum values
   for `status` / `priority`, and uppercases the currency.
6. **General request-spam prevention.** Both `useClientFiles` and
   `useClientConversations` now flip a `failedRef` on the first failure,
   surface a clean error state with a manual Refresh button, and
   suppress the realtime auto-refetch loop until the user retries.

---

## Files Changed

| File | Change |
|---|---|
| `src/features/admin/data/useClientFiles.ts` | Order by `created_at`; client-side fallback sort using whichever timestamp is present; `file_type` no longer required for insert (retry without it on schema mismatch); `error` state exposed; realtime fanout suppressed after a failure; new `fileTimestamp()` and `isImageFile()` helpers exported. |
| `src/features/admin/data/useClientConversations.ts` | Adds `error` state and `failedRef` (no auto-retry storms); `markClientRead` short-circuits while in failed state and after one update failure; uses `sender = 'client'` (already correct). |
| `src/features/admin/sections/MessagesSection.tsx` | `useEffect` for mark-read now depends only on the memoised `conv.markClientRead` callback identity (stops the per-render mark-read storm). |
| `src/features/admin/sections/FilesSection.tsx` | Renders error banner + retry button when the hook reports an error; uses `fileTimestamp` / `isImageFile` helpers; switched legacy `text-slate-...` to `text-muted-foreground`/`text-foreground`. |
| `src/features/admin/sections/ClientsSection.tsx` | Files tab uses `fileTimestamp` / `isImageFile`; `text-foreground` sweep. |
| `src/features/admin/components/AdminDrawer.tsx` | `SheetTitle` + `SheetDescription` (visible or `sr-only`) — closes the Radix accessibility warning for every admin drawer. |
| `src/services/adminDashboardService.ts` | New `sanitizePricingRequestUpdate()` — column whitelist + UUID/text/number/enum coercion. `updatePricingRequest` calls it before sending. |
| Light-mode sweep across | `primitives.tsx`, `AdminTopbar.tsx`, `AdminSidebar.tsx`, `LinkClientToTeamModal.tsx`, every section file (`OverviewSection`, `RequestsSection`, `ClientsSection`, `ProjectsSection`, `ContactsSection`, `MessagesSection`, `FilesSection`, `TeamPermissionsSection`, `DiscountsSection`, `AuditSection`, `StatisticsSection`, `SettingsSection`) — `text-slate-900 dark:text-white` → `text-foreground`. |

---

## `client_assets` schema alignment

Confirmed columns the code now uses:
`id, client_id, file_url, file_name, uploaded_by, uploaded_by_type,
category, note, file_size, storage_path, created_at`.

Optional / compatibility columns (used only if present):
`uploaded_at`, `file_type`.

What changed in the hook:

- Query orders by `created_at` (confirmed). A client-side
  `created_at || uploaded_at` fallback sort handles legacy rows whose
  `created_at` may be null.
- The select is `*` so any of the legacy columns still come through.
- Insert payload omits `file_type` when the file's MIME is unknown. If
  the insert fails with an error mentioning `file_type` (schema
  mismatch), the hook retries once **without** `file_type`.
- `isImageFile()` derives from MIME first, then from filename / URL
  extension — no crash when `file_type` is missing.
- `error: string | null` is exposed; `FilesSection` shows a rose-coloured
  banner with the underlying message + a Retry button.
- The realtime subscription stops calling `refresh()` after a failed
  initial fetch — the only way to retry is to click Refresh, which keeps
  the network log clean.

---

## `client_messages` schema alignment

Confirmed columns:
`id, client_id, sender, sender_id, sender_name, message, is_read,
attachment_url, attachment_name, attachment_type, created_at`.

Code already used `sender` (no `sender_type` references existed). What
changed:

- `markClientRead(clientId)` is short-circuited while `failedRef` is
  set, and flips the ref on its first failure so a 400 doesn't repeat
  per-render.
- The `useEffect` in `MessagesSection` was depending on the entire `conv`
  return object, which was a new reference each render — that caused the
  mark-read spam reported in the console. The dep is now the memoised
  `conv.markClientRead` callback only.
- Realtime channel is created once per `useClientConversations` mount
  and removed on unmount via `supabase.removeChannel` (already correct
  in prior pass; verified).
- Duplicate-prevention on incoming INSERT events is unchanged: the
  reducer skips messages whose `id` is already in state.

---

## Light-mode contrast fixes

All admin section titles, card values, and header text — the highest
contrast risk surfaces — switched from
`text-slate-900 dark:text-white` to `text-foreground`. The drawer
foreground is now driven by CSS custom properties (`--foreground` /
`--muted-foreground`) which are scoped on `<html>` and inherited
through portals correctly even if a portal renders outside the
explicit `dark` class subtree.

`text-white` on dark backgrounds was left intact:

- buttons with `bg-slate-900 text-white`
- avatars / badges with `bg-gradient-to-br from-emerald-400 ... text-white`
- chat bubbles with `bg-slate-900 text-white`

These cases are correct in both modes.

`text-muted-foreground` is now used in place of `text-slate-500
dark:text-slate-400` for muted preview text in `FilesSection` and the
client-drawer Files / Messages tabs.

---

## Dialog accessibility fixes

`AdminDrawer` is the single source for every admin section's right-side
drawer (Requests, Clients, Contacts, Files upload, Messages /
file-upload, Team permissions, Settings detail, Audit detail, Discount
form, Link-as-team modal). Adding `SheetTitle` (Radix primitive) and
`SheetDescription` to it removes the warning across **all** of those
drawers in one change.

Implementation detail:

- `SheetTitle` renders the visible drawer title (replaces the previous
  `<h3>`).
- `SheetDescription` renders the subtitle when present; when the drawer
  has no subtitle, it renders an `sr-only` description equal to the
  title so Radix still binds an `aria-describedby`.

The standalone `AddClientModal` already had `DialogTitle`; not in scope.

---

## Pricing request update fix

`adminDashboardService.updatePricingRequest()` now goes through
`sanitizePricingRequestUpdate(updates)` before hitting Supabase. The
sanitiser:

- Drops `undefined` values.
- Drops any key not in `UPDATABLE_FIELDS` (so the UI can't accidentally
  send a field that doesn't exist on the table — that was a likely 400
  source).
- Coerces empty strings to `null` for UUID columns
  (`client_id, assigned_to, package_id, converted_order_id`) — this is
  the most common 400 cause: PostgREST rejects `''` as a UUID.
- Coerces empty strings to `null` for nullable text columns
  (`invoice_number, package_name, guest_*, company_name, request_notes,
  admin_notes, applied_promo_code, ...`).
- Normalises numbers (`estimated_subtotal`, `estimated_total`,
  `edit_count`) — non-finite values fall back to `0`.
- Whitelists `status` and `priority` — unknown values are dropped
  (instead of being sent and triggering a CHECK violation).
- Trims and uppercases `price_currency`, defaulting to `'EGP'`.

Errors are now logged with just the message string (not the full
object), so the console stays clean.

The edit drawer's "Save changes" button surfaces the underlying error
message via toast on failure (already implemented).

---

## Commands run

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors, 10 warnings (all pre-existing in `useAvailabilityCheck.ts` and `AiChatSidebar.tsx`, plus two intentional `useEffect` deps using `.id`) |
| `npm run build` | exit 0; AdminDashboard chunk 207 kB / 51 kB gzipped |
| `npm audit --audit-level=low` | 0 vulnerabilities |
| `Grep dist for service_role / SUPABASE_SERVICE / VITE_SUPABASE_SERVICE / SERVICE_ROLE / VITE_AI / sk_live / sk_test / sb_secret` | No files found |

---

## Remaining manual checks

1. Open `/lumos-admin` as the master admin → no `client_assets?...
   uploaded_at.desc` 400 in network tab.
2. Files section → no console error spam; if the table is missing/the
   bucket is unreachable, the rose-coloured error banner appears with a
   Retry button.
3. Open Messages → pick a client → mark-read fires **once**; reload the
   page → fires again **once**; switching to another client fires once
   for that client. The console no longer shows repeated `markClientRead
   failed: 400`.
4. Light mode (`/lumos-admin` with theme toggle set to light): all
   drawer headers, card titles, KPI values are dark / readable. No more
   white-on-white.
5. Open any admin drawer → console no longer shows
   `DialogContent requires a DialogTitle` or
   `Missing Description or aria-describedby` warnings.
6. Open a request → Edit → change status / priority / fields → Save →
   no 400. Edit a request and clear the `client_id` link → empty UUID
   is now correctly serialised as `null` and the update succeeds.
7. Confirm the admin chunk in `dist/` does not contain any of the
   secret patterns above (verified by Grep above).
8. Confirm Realtime is enabled at the project level (Supabase
   dashboard → Database → Replication) for `client_messages` and
   `client_assets`. If disabled, the dashboard still works via the
   Refresh buttons; no console error storms.
