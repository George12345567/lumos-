# Client Identity Section Report — Lumos

## 1. Summary

Added a premium client-facing `Identity` section to `/profile` and connected it to the active `/lumos-admin` client drawer.

The client profile now supports a real Light Mode token set, a visible theme toggle, and a polished Identity portal for brand summary, logo kit, colors, typography, downloadable brand assets, social links, and client-visible notes. Admins can create/update the identity record and upload categorized private assets for each client without using service-role keys in frontend code.

Identity data is stored in `public.client_identity`. Official identity files use the existing private `client-assets` bucket and are linked through metadata rows in `public.client_assets`.

## 2. Files Created / Modified

Created:

| File | Purpose |
| --- | --- |
| `src/services/clientIdentityService.ts` | Shared client/admin identity queries, upsert, signed URL generation, upload, and delete helpers. |
| `src/features/client-profile/hooks/useClientIdentity.ts` | Client profile hook for identity data, refresh, and safe realtime reload. |
| `src/features/admin/components/ClientIdentityPanel.tsx` | Admin client drawer Identity management UI. |
| `supabase/migrations/20260508100000_client_identity.sql` | `client_identity` table, `client_assets` identity fields, RLS, storage read tightening, and realtime publication. |
| `CLIENT_IDENTITY_SECTION_REPORT.md` | This report. |

Modified:

| File | Purpose |
| --- | --- |
| `src/features/client-profile/ClientProfilePage.tsx` | Added Identity tab, Identity UX, copy/download actions, signed logo previews, theme toggle, and file filtering. |
| `src/features/client-profile/constants.ts` | Added `identity` tab and legacy `brand` alias mapping. |
| `src/index.css` | Added proper `html[data-theme='light']` design tokens and light color scheme. |
| `src/services/clientPortalService.ts` | Extended asset type for identity metadata compatibility. |
| `src/features/admin/sections/ClientsSection.tsx` | Added active admin drawer Identity tab. |
| `src/features/admin/sections/FilesSection.tsx` | Keeps official identity assets out of the generic Files section. |
| `src/features/admin/data/useClientFiles.ts` | Extended admin file type with identity metadata fields. |
| `src/hooks/useAdminDashboard.ts` | Added realtime refresh hook for `client_identity` changes. |

## 3. UI/UX Structure

Client `/profile` navigation now contains:

- Overview
- Projects
- Messages
- Files
- Identity
- Account
- Sign out

Identity section:

- `Brand Summary`: brand name, tagline, industry, description, mood, voice, target audience, and last updated date.
- `Logo Kit`: primary, secondary, icon/favicon, monochrome, light-background, and dark-background cards.
- `Color Palette`: swatches with hex values, usage labels, and one-tap copy.
- `Typography`: primary, secondary, heading, body font cards, plus usage notes.
- `Brand Assets`: brand guides, social avatars/covers, icons, patterns, templates, and other identity files.
- `Social Identity`: Instagram, LinkedIn, Behance, Dribbble, X/Twitter, GitHub, website.
- `Notes / Guidelines`: only public/client-visible notes and usage guidance.

Empty states are explicit and do not fake identity data.

## 4. Database Changes

Migration:

- `supabase/migrations/20260508100000_client_identity.sql`

New table:

| Table | Key Columns |
| --- | --- |
| `public.client_identity` | `id`, `client_id`, `brand_name`, `tagline`, `industry`, `brand_description`, `brand_voice`, `brand_feel`, `target_audience`, `typography`, `color_palette`, `social_links`, `usage_notes`, `public_notes`, `internal_notes`, `created_at`, `updated_at` |

Constraints/indexes:

- `client_identity.client_id` is unique.
- `client_identity.client_id` references `public.clients(id)` with cascade delete.
- `client_assets.identity_category` is constrained to the approved identity categories.
- `client_assets.visibility` is constrained to `client` or `admin_only`.

Added `client_assets` columns:

| Column | Purpose |
| --- | --- |
| `asset_type` | Asset display/type metadata. |
| `identity_category` | Logo/guide/social/template category. |
| `is_identity_asset` | Distinguishes official identity assets from generic shared files. |
| `sort_order` | Admin-controlled display ordering support. |
| `is_downloadable` | Client visibility/download gate. |
| `visibility` | `client` or `admin_only`. |

## 5. Admin Dashboard Integration

Inside `/lumos-admin` → Clients → Client Details:

- Added an `Identity` tab to the active client drawer.
- Admin can create/update the client identity record.
- Admin can edit brand name, tagline, industry, description, feel, voice, audience, colors, typography, social links, public notes, usage notes, and internal notes.
- Admin can upload identity assets for the open client.
- Upload path is generated automatically as:
  `<client_id>/identity/<identity_category>/<timestamp>-<safe-file-name>`
- Admin can set asset visibility to `client` or `admin_only`.
- Admin can open/download via signed URL.
- Admin can copy signed links.
- Admin can delete identity assets with confirmation.
- Upload success only happens after storage upload and database insert both succeed.
- If database insert fails after storage upload, the service attempts storage cleanup.

## 6. Client Profile Integration

Client can:

- View brand identity data.
- View logo previews when the file is an image.
- Download client-visible identity files through signed URLs.
- Copy signed file links.
- Copy hex color values.
- View public notes and usage guidelines.
- Refresh identity data.

Client cannot:

- Edit `client_identity`.
- Upload official identity assets.
- Delete identity assets.
- See `internal_notes`.
- See assets marked `admin_only`.

## 7. Storage

Bucket:

- `client-assets`

Identity path pattern:

- `<client_id>/identity/<identity_category>/<safe-file-name>`

Examples:

- `<client_id>/identity/logo_primary/lumos-logo-primary.svg`
- `<client_id>/identity/brand_guide/brand-guidelines.pdf`

Storage rules:

- Private bucket is preserved.
- No `getPublicUrl` is used.
- No public URLs are stored for private files.
- `file_url` stores the private storage path for compatibility, not a public URL.
- `storage_path` stores the same private path.
- Downloads/previews/copy links use `createSignedUrl`.

## 8. RLS / Security

Confirmed by implementation:

- No service-role key is used in frontend.
- No broad public policies were added.
- `client_identity` has no public access.
- Client can select only own `client_identity` row.
- Admin can manage all `client_identity` rows through `public.is_admin()`.
- Identity source-of-truth is admin-managed; clients cannot update it directly.
- Client can select only own non-identity files, or own identity files where `visibility = 'client'` and `is_downloadable = true`.
- Admin can manage all `client_assets` rows through `public.is_admin()`.
- Storage read policy was tightened for `<client_id>/identity/...` paths so client access requires matching visible/downloadable metadata.
- `admin_only` assets are hidden from client metadata queries and denied by the identity storage read condition.
- Existing general client files remain visible to their owner.

If employee/team RBAC remains UI-only, backend enforcement still uses the admin-level `is_admin()` policy. Real employee permission enforcement requires backend RBAC policies or Edge Functions.

## 9. Light Mode Fixes

Added proper `html[data-theme='light']` tokens:

- soft off-white/mint background
- white/tinted cards
- subtle mint borders
- dark readable foreground text
- readable muted text
- clean teal/emerald accents
- `color-scheme: light`

The profile top bar now includes a theme toggle using the existing `AppearanceContext`.

Profile Identity UI uses theme-safe classes:

- `text-foreground`
- `text-muted-foreground`
- `text-card-foreground`
- `bg-background`
- `bg-card`
- `border-border`

White text is used only on dark/accent backgrounds.

## 10. Commands Run

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed. |
| `npm run lint` | Passed with existing unrelated warnings only. |
| `npm run build` | Passed. |
| `npm audit --audit-level=low` | Passed, `0 vulnerabilities`. |
| `Select-String -Path 'dist\**\*' -Pattern 'service_role','SUPABASE_SERVICE','VITE_SUPABASE_SERVICE','SERVICE_ROLE','VITE_AI','sk_live','sk_test','sb_secret' -CaseSensitive` | No matches found. |
| `Invoke-WebRequest http://localhost:8081/profile` | Returned `200`; root div present. |
| `Invoke-WebRequest http://localhost:8081/lumos-admin` | Returned `200`; root div present. |

Existing lint warnings are in unrelated files:

- `src/features/admin/components/LinkClientToTeamModal.tsx`
- `src/features/admin/sections/RequestsSection.tsx`
- `src/features/admin/sections/TeamPermissionsSection.tsx`
- `src/features/ai-chat/AiChatSidebar.tsx`
- `src/hooks/useAvailabilityCheck.ts`

## 11. Manual Test Checklist

Code/build verified:

- `/profile` route resolves.
- `/lumos-admin` route resolves.
- Identity tab appears in the client profile code path.
- Identity tab appears in the admin client drawer code path.
- Build passes.
- TypeScript passes.
- Lint has no new errors.
- Audit passes.
- Secret scan passes.

Needs live authenticated Supabase/browser QA:

- `/profile` works in Light Mode.
- `/profile` works in Dark Mode.
- Identity empty state appears for a client with no identity.
- Admin opens client drawer and creates identity record.
- Admin adds colors.
- Admin adds typography.
- Admin uploads primary logo.
- Admin uploads brand guide PDF.
- Client sees Identity data after refresh.
- Client copies color hex.
- Client downloads logo via signed URL.
- Client cannot see `admin_only` assets.
- Client cannot edit identity source-of-truth.
- Admin edits identity again and client sees updated data after refresh.
- Messages/files/projects/account sections still work with real data.
- No runtime console errors.

## 12. Remaining TODOs

- Apply `supabase/migrations/20260508100000_client_identity.sql` to the Supabase project before using the Identity UI against production data.
- If employees beyond master admins need identity permissions, add backend RBAC enforcement. Current safe backend gate is `public.is_admin()`.
- Consider adding an archive column for identity assets if product wants reversible archive instead of deletion.
- Real browser QA with authenticated admin/client sessions is still required for storage uploads, signed downloads, and RLS verification.
- Existing old `client_assets` rows will remain in Files only unless an admin categorizes them with `is_identity_asset = true`.
