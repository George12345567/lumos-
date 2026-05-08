# Client Profile Compact UI & Dataflow Fix Report — Lumos

## 1. Summary

Completed a focused refinement pass for the `/profile` client profile experience.

The profile now uses a compact overview hero, smaller stat cards, clearer section switching, and restored site navigation. Signup and invite onboarding data now persist into direct `clients` columns where schema support exists, with `package_details.signup_profile` preserved as a fallback/history container. The profile page reads direct columns first and falls back to existing signup metadata only when needed.

Security constraints were preserved: no service-role key is used in frontend code, role/admin fields are not exposed for client editing, private `client-assets` files still use signed URLs, and POST/auth/admin behavior outside this feature was not weakened.

## 2. Files Created / Modified

Created:

| File | Purpose |
| --- | --- |
| `CLIENT_PROFILE_COMPACT_DATAFLOW_FIX_REPORT.md` | Documents UI, data mapping, security, commands, and remaining TODOs. |

Modified in this pass:

| File | Purpose |
| --- | --- |
| `src/features/client-profile/ClientProfilePage.tsx` | Compact profile UI, overview-only hero/stats, compact section headers, query-backed tab switching, navbar restore, profile display mapping, edit dialog safe fields. |
| `src/features/client-profile/hooks/useClientProfile.ts` | Extended empty profile shape for persisted signup/profile fields. |
| `src/components/layout/FloatingDock.tsx` | Keeps desktop dock visible on profile and intentionally hides it on mobile profile to avoid bottom navigation overlap. |
| `src/pages/SignUpPage.tsx` | Sends avatar mode/style/seed/preset/upload file and brand colors through signup payload. |
| `src/services/authService.ts` | Persists signup fields into direct `clients` columns, preserves `package_details.signup_profile`, reads direct fields back into `AuthClient`, and avoids plaintext security-answer storage. |
| `src/services/inviteOnboardingService.ts` | Preserves existing `package_details`, maps invite onboarding fields into direct client columns, and avoids role updates on existing rows. |
| `src/services/profileService.ts` | Extends profile types, sanitizes client-editable update payloads, removes `undefined`, and signs private avatar paths instead of accepting public private-bucket URLs. |

Inspected and kept compatible:

| File | Notes |
| --- | --- |
| `src/services/clientPortalService.ts` | Existing messages/files flow already uses `client_messages.sender`, orders assets by `created_at`, and creates signed URLs for `client-assets`. |
| `src/App.tsx` | `/profile` remains protected by the existing `ProtectedRoute`. |
| `src/context/AuthContext.tsx` | Current auth behavior was preserved. |
| `supabase/migrations/` | Confirmed existing schema support for direct profile/signup columns and private client asset policies. |

## 3. Compact UI Changes

Hero size:

- Full hero now appears only on `Overview`.
- Desktop cover height is compacted to roughly 150-190px through responsive height classes.
- Avatar is compacted to roughly 88-112px depending on viewport.
- Name, username, package badge, website/location, and Edit Profile action are positioned to avoid clipping and overlap.
- Hero keeps the premium cover/card direction without dominating the first screen.

Stat cards:

- Stats are reduced to compact cards around 110-130px tall.
- Icons, padding, and typography were reduced.
- Profile uses a focused four-stat row: active projects, messages/updates, shared files, and next delivery.
- Mobile uses a 2-column layout where space allows and avoids horizontal overflow.

Sidebar behavior:

- Sidebar width, padding, and vertical gaps were reduced.
- Active tab state is more obvious through contrast, accent color, and focus ring.
- Sign out remains at the bottom of the sidebar area.
- Mobile uses the existing bottom profile tab bar for section switching.

Section switching behavior:

- `Overview` shows full hero + compact stats + overview cards.
- `Projects`, `Messages`, `Files`, and `Account` use a compact section header instead of the full hero.
- The active section title changes clearly.
- Tab changes update `?tab=...` and scroll the profile content back to the top.
- Existing aliases are respected through `TAB_ALIASES`.

Navbar/dock visibility:

- `EnhancedNavbar` is rendered on `/profile`.
- Desktop `FloatingDock` remains visible as part of the site navigation.
- Mobile `FloatingDock` is intentionally hidden on `/profile` because the profile already has bottom section navigation; this prevents overlap with profile content/actions.
- No AI/Bot button was reintroduced.

## 4. Signup Data Mapping

| Signup Field | Database Table | Database Column | Profile Location | Notes |
| --- | --- | --- | --- | --- |
| `email` | `auth.users` | `email` | Account read-only | Supabase Auth source of truth. |
| `email` | `clients` | `email` | Overview, Account read-only | Mirrored for profile display and client queries. |
| Supabase user id | `clients` | `id` | Ownership/data loading | Matches `auth.users.id`; used by RLS and profile service calls. |
| `username` | `clients` | `username` | Hero, Account read-only | Client cannot edit from profile. |
| `password` | `auth.users` | Auth credential | Not displayed | Not stored in `clients`. |
| `companyName` | `clients` | `company_name` | Hero/Overview/Account | Client-editable safe field. |
| `contactName` | `clients` | `display_name`, `full_contact_name` | Hero/Account | `display_name` is primary display value. |
| `tagline` | `clients` | `tagline`, `business_tagline` | Hero, Account | Client-editable safe field. |
| `phone` | `clients` | `phone`, `phone_number` | Overview/Account | Client-editable safe field; edit validation expects E.164 when present. |
| `website` | `clients` | `website` | Hero/Overview/Account | Normalized on profile edit. |
| `industry` | `clients` | `industry` | Overview/Account | Also preserved in `package_details.signup_profile`. |
| `servicesNeeded` | `clients` | `services_needed` | Overview Project Snapshot, Account | Stored as array; labels are resolved from constants for display. |
| `budgetRange` | `clients` | `budget_range` | Overview/Account | Also preserved in signup profile JSON. |
| `timeline` | `clients` | `timeline` | Overview/Account | Also preserved in signup profile JSON. |
| `referralSource` | `clients` | `referral_source` | Overview Project Snapshot | Also preserved in signup profile JSON. |
| `projectSummary` | `clients` | `project_summary` | Overview/Account | Also preserved in signup profile JSON. |
| `brandIdentity` | `clients` | `brand_feel` | Account Brand Details, Edit Profile | Also preserved in signup profile JSON. |
| `brandColors` | `clients` | `brand_colors`, `theme_accent`, `cover_gradient` | Hero styling, Account Brand Details | Also stored in avatar config colors. |
| `avatarMode` | `clients` | `avatar_config.mode` | Hero avatar fallback | JSON config; not an admin field. |
| `avatarSeed` | `clients` | `avatar_seed`, `avatar_config.seed` | Hero generated avatar fallback | Used when no uploaded/signed avatar exists. |
| `avatarStyle` | `clients` | `avatar_style`, `avatar_config.style` | Hero generated avatar fallback | Uses existing avatar generator. |
| `avatarPresetUrl` | `clients` | `avatar_config.presetUrl` | Hero avatar fallback | Local `/avatars/...` paths are allowed; public remote private-bucket URLs are not. |
| `avatarFile` | `client-assets` storage + `clients` | storage path in `avatar_url` | Hero avatar | Uploaded only when signup returns an authenticated session; see TODOs. |
| `securityQuestion` | `clients.package_details` | `signup_profile.security_question` | Account security note only | The question can be acknowledged; answer is never shown. |
| `securityAnswer` | `clients.package_details` | `signup_profile.security_answer_hash` | Not displayed | Hashed before save; plaintext is not persisted. |
| `signupSource` | `clients` | `signup_source` | Internal/audit context | Defaults to `web_signup`; invite onboarding uses `admin_created`. |
| generated timestamp | `clients` | `signup_completed_at` | Internal/audit context | Also preserved in signup profile JSON. |

## 5. Profile Display Mapping

Hero:

- Avatar uses a signed private storage URL when `clients.avatar_url` is a storage path.
- Local preset avatars from `avatar_config.presetUrl` are allowed only for local app asset paths.
- Generated avatar fallback uses `avatar_seed`, `avatar_style`, and `avatar_config`.
- Display name uses `display_name`, then `full_contact_name`, company, username.
- Username, package name, tagline, location, website, and real `is_verified` state are displayed when present.

Overview/About:

- Company, industry, email, phone, website, location, and bio come from direct `clients` columns.
- Services needed, budget range, timeline, referral source, and project summary come from direct columns first, with `package_details.signup_profile` fallback.
- Recent activity is derived from real orders, messages, files, and notifications only.

Projects:

- Shows real `orders` data only.
- Status, delivery date, and progress are derived from real order fields.
- Empty states are explicit and do not invent projects.

Messages:

- Shows real `client_messages` only.
- Sender display is based on the existing `sender` column.
- Send/refresh actions use the current portal service.

Files:

- Shows real `client_assets` only.
- Download links are created with signed URLs from the private bucket.
- File type is derived from `file_type`, `asset_type`, or filename extension.

Account:

- Email and username are read-only.
- Safe fields such as display name, phone, company, industry, website, location, bio, tagline, brand feel, brand colors, social links, visibility, timezone, and accent color are editable.
- Package/status/admin/internal fields are not editable.

## 6. Edit Profile Data Flow

Editable from the profile:

- `avatar_url`
- `display_name`
- `tagline`
- `phone` / `phone_number`
- `company_name`
- `industry`
- `website`
- `location`
- `bio`
- `brand_feel`
- `brand_colors`
- `theme_accent`
- `cover_url`
- `cover_gradient`
- `logo_url`
- `timezone`
- `profile_visibility`
- `social_links`

Not editable from the profile:

- `role`
- `email`
- `username`
- package price
- package/status/admin workflow fields
- project status
- invoices
- audit logs
- internal/admin notes
- password flags
- RLS/admin-only fields

Profile update safety:

- `profileService.updateProfile` sanitizes payload keys against an allowlist.
- `undefined` values are removed before update.
- Empty safe payloads are treated as successful no-ops.
- Supabase update errors are returned to the caller instead of showing success blindly.
- Website and social URLs are normalized in the edit dialog.
- Phone editing validates E.164 format when a phone value is provided.

## 7. Messages / Files Compatibility

Messages:

- The portal flow uses `client_messages.sender`, not `sender_type`.
- Messages are ordered by `created_at`.
- Empty/error states are shown without fake messages.
- Refresh is preserved.

Files:

- The portal flow uses `client_assets.created_at` ordering.
- The profile display falls back from `uploaded_at` to `created_at` where needed.
- File type is derived from filename when no explicit file type column exists.
- Downloads use signed URLs from the private `client-assets` bucket.
- Public URLs are not used for private bucket objects.
- Refresh is preserved.

## 8. Security Notes

- No service-role key was added.
- No frontend code uses service-role privileges.
- No broad public policies were added.
- Role editing is not allowed in profile editing.
- Admin-only fields are not exposed in profile editing.
- Existing `ProtectedRoute` behavior for `/profile` remains in place.
- Private `client-assets` access remains signed-URL based.
- Storage upload paths use the authenticated client id path convention.
- Auth/RLS ownership remains based on the authenticated user/client id.
- Security answers are not stored as plaintext and are never displayed.
- Verified badge display is based on real profile state only.

## 9. Commands Run

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed. |
| `npm run lint` | Passed with existing warnings only. No lint errors. |
| `npm run build` | Passed. |
| `npm audit --audit-level=low` | Passed. `0 vulnerabilities`. |
| `Select-String -Path 'dist\**\*' -Pattern 'service_role\|SUPABASE_SERVICE\|VITE_SUPABASE_SERVICE\|SERVICE_ROLE\|VITE_AI\|sk_live\|sk_test\|sb_secret' -CaseSensitive` | No matches found. |
| `Invoke-WebRequest http://localhost:8081/profile` | Returned `200`; Vite server was already running on `8081`. |
| `Invoke-WebRequest http://localhost:8081/lumos-admin` | Returned `200`; route still resolves. |

Observed lint warnings were pre-existing style/hook warnings in unrelated files, including admin sections, `AiChatSidebar`, and `useAvailabilityCheck`.

## 10. Manual Test Checklist

Checked in this session:

- `/profile` route resolves on the running local Vite server.
- `/lumos-admin` route resolves on the running local Vite server.
- TypeScript compile passes.
- Production build passes.
- Lint passes with no errors.
- Audit passes.
- Built output scan found no service-role/secret-key strings from the requested list.
- Profile UI code uses compact overview hero/stats and compact non-overview headers.
- Desktop navbar/dock behavior is restored in profile code.
- Mobile dock is intentionally hidden on profile to avoid overlap with profile bottom navigation.

Still needs authenticated browser/database verification with real Supabase credentials:

- Logged-out user redirects to `/client-login`.
- New signup with all form fields persists after email confirmation/login.
- `/profile` shows the saved signup values after refresh.
- Safe profile edits persist after save and refresh.
- Avatar upload works for flows where the client has an authenticated storage session.
- Messages send/load/refresh against real `client_messages`.
- Files load/download with signed URLs against real `client_assets`.
- Sign out works from the profile sidebar.
- Light and dark mode readability pass visual QA on desktop and mobile.

## 11. Remaining TODOs

- Uploaded signup avatar files can only be saved to the private `client-assets` bucket when Supabase returns an authenticated session during signup. If email confirmation is enabled and no session is returned, the frontend cannot upload private files without weakening security or using a service-role key. Recommended fix: upload avatar after first confirmed login, or add a secure Edge Function that performs a constrained upload for the authenticated user.
- Current invite onboarding fields do not collect every web signup field. It persists the fields it asks for, but services needed, budget range, timeline, referral source, brand colors, social links, and location require invite form fields before they can be captured there.
- Current public signup does not collect location or social links, so those are only editable later from `/profile`.
- If future signup fields do not map to existing safe `clients` columns or existing safe JSON metadata, add a migration instead of silently dropping them.
- Real browser QA with an authenticated Supabase project is still required for end-to-end signup, refresh persistence, avatar upload, messages, and file downloads.
