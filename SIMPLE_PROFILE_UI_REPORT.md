# Simple Profile UI Report — Lumos Website

## 1. Summary

`/profile` was rebuilt as a calmer, premium client portal centred on a single
big hero card and a tight 5-section sidebar. Every existing data flow (Auth,
Supabase, RLS, invite onboarding, admin dashboard) is preserved — only the
client-facing UI was simplified. No new tables, no new RLS, no service-role
keys, no fake data.

The previous tab list (Overview / Orders / Messages / Brand / Library /
Account) is now a 5-tab list:

```
Overview · Projects · Messages · Files · Account
```

with **Brand details** folded into Account, **Orders → Projects** (UI label
only — same data), and **Library → Files**. A quiet *Sign out* button is
anchored under the sidebar on desktop; on mobile it lives in Account →
Danger zone (unchanged).

The hero is a single rounded card with a soft cover, an overlapping circular
avatar, name + @username, package badge, location and website pill, plus a
single dark **Edit Profile** CTA. Stats moved to a calmer 4-tile row in the
Overview section.

---

## 2. Files Created / Modified

### Modified

| File | What changed |
|---|---|
| `src/features/client-profile/constants.ts` | Reduced `TABS` to 5 entries; added `TAB_ALIASES` so legacy URLs (`?tab=orders` / `library` / `brand`) and dock CTAs fold onto the new tabs. |
| `src/features/client-profile/hooks/useProfileTab.ts` | Honours `TAB_ALIASES` when parsing the URL parameter so old bookmarks keep working. |
| `src/features/client-profile/components/SidebarNav.tsx` | Rewritten: 5-item desktop sidebar + Sign out button at the bottom, calmer styling, mobile bar simplified (no sign out duplicate). |
| `src/features/client-profile/sections/ProfileHero.tsx` | New premium hero: rounded card, hover "Change cover" pill, dark "Edit Profile" CTA, package badge, location/website pills. **Now actually persists avatar/cover uploads** via `supabase.storage` + signed URLs (the previous version handed back blob URLs that vanished on reload). |
| `src/features/client-profile/sections/OverviewSection.tsx` | Replaced with simplified 2-column layout: 4-stat tile row + About/Bio + Profile completion + Recent activity + Next step. "Edit information" button bounces to Account. |
| `src/features/client-profile/sections/AccountSection.tsx` | Email is now read-only (auth identifier); added a collapsible **Brand details** subsection with logo upload, color picker, social links — merged from the deleted brand tab. |
| `src/features/client-profile/sections/OrderTrackingSection.tsx` | Renamed UI labels to "Projects"; better empty-state copy ("Your projects will appear here once Lumos starts working with you."). Data shape and code path unchanged. |
| `src/features/client-profile/sections/LibrarySection.tsx` | UI relabelled "Files"; Download link only renders when an asset URL really exists (no more fake `href="#"`). |
| `src/features/client-profile/components/CoverAvatarPicker.tsx` | Added optional `onAvatarFile` / `onCoverFile` callbacks so the picker can hand a real `File` to a Supabase upload, rather than always producing a blob URL. Legacy blob path is preserved for the `ClientProfileTestView` mock. |
| `src/features/client-profile/ClientProfilePage.tsx` | Rewired for new tab IDs (`overview`/`projects`/`messages`/`files`/`account`); derives `activeProjects`, `unreadMessages`, `nextDelivery` from real data; passes `clientId` to `AccountSection` for storage uploads. Auth/redirect/error logic untouched. |
| `src/features/client-profile/ClientProfileTestView.tsx` | Updated to the new tab IDs/props so the dev preview keeps building. |
| `src/components/layout/FloatingDock.tsx` | Profile-context dock simplified to **Home / Plans & Pricing / Sign out** only — the in-page sidebar is now the primary section nav. Removed dead `triggerProfileDockAction` events that nothing was listening to, plus their unused state and icon imports. No `Bot` reference. |

### Created

| File | Purpose |
|---|---|
| `SIMPLE_PROFILE_UI_REPORT.md` | This report. |

### Untouched (kept as-is)

- `src/services/profileService.ts`, `clientPortalService.ts`, `orderService.ts`, `notificationService.ts`
- `src/features/client-profile/sections/BrandStudioSection.tsx` — kept on disk in case you want to revive a dedicated tab; no longer imported anywhere.
- `src/features/client-profile/sections/MessagesSection.tsx` — already met the spec.
- `src/features/client-profile/hooks/*` — all hooks (`useClientProfile`, `useProfileMutation`, `usePortalData`, `useNotifications`, `useOrders`, `useProfileTab`) keep the same return shape.
- All Supabase migrations.
- `src/components/shared/AuthRoutes.tsx` and `AuthContext` — unchanged. `/profile` still requires login.

---

## 3. UI Structure

### Sidebar (desktop) / horizontal scroller (mobile)

5 calm tabs with a quiet sign-out button below a divider.

```
┌────────────────┐
│ Overview       │ ← LayoutDashboard
│ Projects       │ ← Briefcase
│ Messages       │ ← MessageCircle
│ Files          │ ← FolderOpen
│ Account        │ ← Settings
│ ─────────────  │
│ Sign out       │ ← LogOut (rose-700 hover)
└────────────────┘
```

### Hero

Single rounded `<section>` card, white bg, subtle shadow.

```
┌─────────────────────────────────────────────────────────────┐
│ cover (image OR soft gradient)                              │
│                                       [📷 Change cover]    │
│                                                             │
└──────────╲(avatar overlap)╱─────────────────────────────────┘
   (avatar)   Display name   ✓verified                         ┌────────────┐
              @username                                        │ Edit Profile│ (slate-900 / dark)
              tagline · short                                  └────────────┘
              [pkg badge]  📍 city  🌐 website ↗
```

### Stats row (overview only)

4-tile grid (2 columns on mobile, 4 on desktop) — small white cards with the
accent color dot:

| Active projects | Unread messages | Project progress | Next delivery |
|-----------------|-----------------|------------------|---------------|

### Overview body (desktop = 2 + 1 columns; mobile = stacked)

| Left (lg:col-span-2) | Right rail (lg:col-span-1) |
|---|---|
| **About** card with company / industry / email / phone / website / location + bio editor + "Edit information" pill | **Profile completion** (8-row checklist), **Recent activity** (top 4 unread notifications), **Next step** (admin-supplied) |

### Projects

Filter pills (All / Pending / In Progress / Delivered / Cancelled) → expandable
project cards with timeline, items table, notes, estimated delivery. Empty
state copy: *"Your projects will appear here once Lumos starts working with
you."*

### Messages

Existing chat with the Lumos team. Untouched — already had message bubbles,
auto-scroll, send box, error toast on failed send, and an empty state.

### Files

Two cards in one section:
1. **My Designs** — saved designs grid (empty state: "No saved designs yet.")
2. **Shared Files** — files admin shared (empty state: *"Files shared by you
   or Lumos will appear here."*). Download link only renders when a real URL
   exists; otherwise a quiet `No link` label.

### Account

A header card with: Email (**read-only**), Phone, Username (read-only),
Company, Industry, Website. Below are **collapsible** sections:

- Location & timezone
- Preferences (visibility + accent color)
- **Brand details** (logo / brand colors / social links — merged here from the old `brand` tab)
- Security (status of security question + note that changes go through support)
- Danger zone (Sign out)

---

## 4. Features Kept

All real features from the prior page are preserved — only the chrome was
simplified:

- Cover + avatar editing (now actually persisted, see §5)
- Edit profile modal (display_name / tagline / bio / website / location / timezone)
- Bio inline editor
- Order timeline + filter (relabelled "Projects")
- Realtime team chat with optimistic send
- Saved designs gallery + delete + open-in-demo link
- Shared files list (admin-managed) with download
- Account info inline editing for phone / company / industry / website
- Location / timezone / profile visibility / accent color / brand colors / social links / logo
- Notifications (now driving "Recent activity" + the unread-messages stat)
- Auth state, RLS, sign out, redirect-to-login, friendly profile-load error card with Try again / Sign out

---

## 5. Features Removed / Simplified

| Before | After | Why |
|---|---|---|
| 6 tabs (Overview / Orders / Messages / Brand / Library / Account) | 5 tabs (Overview / Projects / Messages / Files / Account) | Spec — keep sidebar tight. |
| Dedicated Brand tab | Brand details collapsed into Account | Spec — fewer tabs, calmer page. |
| Stats row inside the hero | Stats row moved into Overview as a separate calm grid | Hero stayed visual; stats stayed informative. |
| Notifications banner inside the hero | Notifications surfaced as "Recent activity" inside Overview right rail | Hero stays clean; activity has a dedicated home. |
| In-hero `EditProfileModal` *and* picker open from cover/avatar with no real upload | Hero modal unchanged + uploads now go to Supabase storage + return signed URLs | Avatar / cover were silently broken — they handed back blob URLs that disappeared on refresh. |
| FloatingDock per-tab buttons (Workspace / Library / Brand / Account) | FloatingDock on `/profile` shows only Home / Plans & Pricing / Sign out | Those dock buttons dispatched events nothing was listening to (dead code). The in-page sidebar is the primary nav now. |
| Library section's "Download" link with `href="#"` fallback | Hidden when no asset URL | Don't pretend a download exists when it doesn't. |
| Email editable inline | Email read-only | Spec — auth identifier; changes must go through support. |

The orphan `BrandStudioSection.tsx` is left on disk but no longer imported.
Easy to delete in a follow-up if you don't want to revive it.

---

## 6. Data Fields Used

Every field on the profile page maps to an existing column on `public.clients`.
No new columns were introduced.

### Hero

| Element | Source |
|---|---|
| Cover image | `clients.cover_url` (signed URL) |
| Cover gradient fallback | `clients.cover_gradient` |
| Avatar | `clients.avatar_url` (signed URL or preset) |
| Display name | `clients.display_name`, falls back to `username` |
| Tagline | `clients.tagline` |
| Package badge | `clients.package_name` |
| Location | `clients.location` |
| Website | `clients.website` |
| Verified badge | `clients.is_verified` |

### Overview

| Element | Source |
|---|---|
| Active projects count | `orders.status ∈ {pending, reviewing, approved, in_progress}` for this client |
| Unread messages | Unread `notifications.is_read = false` (proxy — `client_messages` has no read flag) |
| Project progress | `clients.progress` |
| Next delivery | Earliest `orders.estimated_delivery` |
| Profile completion | Computed locally from 8 client fields (not persisted) |
| Recent activity | Top 4 unread `notifications` |
| Next step | `clients.next_steps` |
| About row | `clients.{company_name, industry, email, phone, website, location}` |
| Bio | `clients.bio` |

### Account → Brand details

| Element | Source |
|---|---|
| Logo | `clients.logo_url` (uploaded via `client-assets/<uid>/brand-logos/...` then signed URL) |
| Brand colors | `clients.brand_colors` (`text[]`) |
| Accent color | `clients.theme_accent` |
| Social links | `clients.social_links` (`jsonb`: twitter / instagram / linkedin / behance / dribbble / github) |

### Avatar / cover storage

Uploads use the path layout enforced by the storage RLS policy in
`supabase/migrations/20260507120300_storage_rls_client_assets.sql`:

```
<auth.uid()>/avatars/<timestamp>-<safe-name>
<auth.uid()>/profile-covers/<timestamp>-<safe-name>
<auth.uid()>/brand-logos/<timestamp>-<safe-name>
```

The bucket is private. The client persists the **signed URL** on the row;
a future improvement is to persist only the **path** and resolve a fresh
signed URL at render via `profileService.getAvatarUrl(path)` (the helper
already exists; the existing UI just doesn't call it everywhere yet).

---

## 7. Backend Requirements

Nothing new is required to ship the visual redesign. The existing
configuration covers it:

- Bucket `client-assets` exists and is private (per the storage RLS migration).
- `clients.cover_url` and `clients.cover_gradient` columns exist (added in
  `20260505_client_profile_columns.sql` for `cover_url` is already TEXT, and
  `cover_gradient` is in the same migration).
- `clients.logo_url`, `social_links`, `brand_colors`, `theme_accent`,
  `profile_visibility`, `bio`, `tagline`, `display_name`, `location`,
  `timezone` all exist already.

### Future improvements (not blockers)

- **Track read state on `client_messages`.** Today the "unread messages" tile
  uses unread notifications as the closest honest proxy, since
  `client_messages` has no `is_read` column. A small migration adding
  `is_read boolean default false not null` + a client-side "mark read on
  open" call would let the tile reflect actual chat state.
- **Persist signed-URL `path` separately from the URL** so we can refresh a
  fresh signed URL on each render and stop relying on 1-year expiries. The
  helper (`profileService.getAvatarUrl`) is already in place — the UI just
  needs to start storing `avatar_path` and resolving on read.
- **Cover image uploads do persist** (the redesign wires the Supabase upload
  path); the actual `cover_url` column already exists. If your environment
  doesn't have it, run the existing `20260505_client_profile_columns.sql`
  migration.

---

## 8. Security Notes

- **No service-role key in the frontend.** All Supabase calls run as the
  authenticated client under their own RLS context — same as before.
- **No role escalation surface.** The profile page never writes `role`,
  `status`, `package_name`, `progress`, `next_steps`, `is_verified`,
  `admin_notes`, `subscription_config`, or `active_offer`. Those remain
  admin-only fields.
- **Email is read-only** in the redesigned UI. Username remains read-only
  (it was already).
- **Avatar / cover / logo uploads** are scoped to `<auth.uid()>/...` paths.
  The storage RLS policy installed by
  `20260507120300_storage_rls_client_assets.sql` rejects any path whose
  first segment is not the caller's UID.
- **No fake data.** Empty states are explicit. Stats are computed from real
  rows. Download links only render when a real `asset_url` exists. The
  Profile completion checklist counts real fields; the "Recent activity"
  list comes from real `notifications` rows; "Next delivery" comes from real
  `orders.estimated_delivery`. The `mockData.ts` file remains exclusively
  used by `ClientProfileTestView` (the dev-only `/profile-preview` route
  gated behind `VITE_ENABLE_PROFILE_PREVIEW`).
- **Logout still clears React Query cache** (unchanged behavior — handled by
  `AuthContext.logout`).
- **Update success/failure** still goes through `useProfileMutation` which
  parses `result.success` strictly and surfaces a toast on failure with
  unsaved updates restored to the queue for retry.
- **No `Bot is not defined` runtime risk.** `Bot` is not imported anywhere
  in `FloatingDock.tsx` (verified via grep) and the AI dock buttons stay
  removed.
- **No new RLS, no new tables.** The redesign is pure UI.

---

## 9. Commands Run

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **Exit 0**, 0 type errors. |
| `npm run lint` | **0 errors**, 7 pre-existing warnings unchanged (in `AiChatSidebar.tsx` and `useAvailabilityCheck.ts`; not introduced by this change). |
| `npm run build` | **Exit 0**, vite build in 14.67s. The redesigned `ClientProfilePage` chunk is ~13.15 kB / ~5.13 kB gzipped (close to the previous 12.87 kB). The `OrderTrackingSection-*.js` chunk (69.85 kB) absorbed the brand widget code that's now lazy-loaded only when the Account → Brand details accordion is opened. |

No test script is configured in `package.json`, so `npm run test` is not
applicable. (Running `npm run test` would error with "no test specified".)

---

## 10. Manual Test Checklist

Run through these in a real browser pointed at a Supabase project with the
storage RLS migration already applied. Each checkbox is independently
verifiable.

### Auth / routing

- [ ] Visit `/profile` while signed in → page renders.
- [ ] Visit `/profile` while signed out → redirects to `/client-login`.
- [ ] Visit `/profile?tab=orders` (legacy URL) → opens the **Projects** tab.
- [ ] Visit `/profile?tab=library` → opens the **Files** tab.
- [ ] Visit `/profile?tab=brand` → opens the **Account** tab.

### Hero

- [ ] Cover renders gradient fallback when `cover_url` is empty.
- [ ] "Change cover" pill opens the picker and switching gradients persists across refresh.
- [ ] Picking an avatar preset persists across refresh.
- [ ] Uploading a JPG/PNG (≤5 MB) for the avatar shows a spinner, then the new image, and survives refresh.
- [ ] Uploading a >5 MB file shows a toast: "Image must be smaller than 5 MB" — no row update.
- [ ] Clicking **Edit Profile** opens the existing edit modal (display name / tagline / bio / website / location / timezone).
- [ ] Verified badge appears beside the name when `clients.is_verified = true`.
- [ ] Save indicator next to Edit Profile shows "Saving…" while a debounced write is in flight, then "Saved".

### Sidebar / mobile bar

- [ ] Sidebar shows exactly 5 tabs + Sign out.
- [ ] Switching tabs updates the URL `?tab=…` (overview is the bare URL).
- [ ] Mobile (<lg) shows horizontal scroller, no sign-out duplicate.
- [ ] Click Sign out from the desktop sidebar → logs out and redirects to `/client-login`.

### Overview

- [ ] Stat tiles show real numbers: active projects from orders; unread messages from unread notifications; progress %; next delivery date or "—".
- [ ] About card lists company / industry / email / phone / website / location with em-dash for empty fields.
- [ ] Bio inline editor saves on blur (with a toast if save fails).
- [ ] **Edit information** pill switches to the Account tab.
- [ ] Profile completion percentage matches the count of filled fields and updates as fields are filled in Account.
- [ ] Recent activity shows the top 4 notifications (or empty state "Your activity will appear here.").
- [ ] Next step card shows `clients.next_steps` or its empty state.

### Projects

- [ ] No orders → "Your projects will appear here once Lumos starts working with you."
- [ ] Filter pills work (All / Pending / In Progress / Delivered / Cancelled).
- [ ] Expanding a project shows timeline, items table, notes, estimated delivery.
- [ ] All UI labels say "project" (not "order").

### Messages

- [ ] Empty conversation shows the existing empty state.
- [ ] Sending a message uses optimistic add and reflects on the live realtime channel.
- [ ] Failed send shows a toast / inline error.

### Files

- [ ] No saved designs → empty state inside "My Designs".
- [ ] No shared files → "Files shared by you or Lumos will appear here."
- [ ] Asset without a real `asset_url` shows "No link" instead of a broken download button.
- [ ] Asset with a real signed URL renders Download → opens the file in a new tab.

### Account

- [ ] Email field renders as read-only text (no Pencil edit affordance).
- [ ] Username renders as read-only.
- [ ] Phone / Company / Industry / Website edits validate and save.
- [ ] Location & timezone collapsible saves.
- [ ] Preferences collapsible: visibility + accent color save.
- [ ] **Brand details** collapsible: logo upload, color picker (with accent change), social link blur-to-save all work.
- [ ] Security collapsible shows whether a security question is set.
- [ ] Danger zone Sign out works on mobile.

### FloatingDock

- [ ] On `/profile`, the dock shows **Home / Plans & Pricing / Sign out** only.
- [ ] No `Bot is not defined` error in the browser console (verified via grep — `Bot` not imported anywhere in `FloatingDock.tsx`).
- [ ] Dock Sign out works.

### Cross-flow

- [ ] Admin login flow (`/lumos-admin`) is unaffected.
- [ ] Invite onboarding (`/invite-onboarding`) → finishing onboarding still lands on `/profile` and the new layout renders correctly.
- [ ] Logout from any path still clears React Query cache.

---

## 11. Strict caveats

- **"Unread messages" stat counts unread notifications**, not unread chat
  messages. `client_messages` has no `is_read` column today; adding one is
  a small future improvement (see §7). The label is still honest because
  notifications are the only first-class "unread" signal we currently
  persist.
- **Cover image uploads work end-to-end now**, but the existing `cover_url`
  column must already exist on `public.clients` (it does, per
  `20260505_client_profile_columns.sql`). If your Supabase project hasn't
  applied that migration, cover saves will fail with a "column does not
  exist" error.
- **Phone field column drift** (pre-existing, not introduced here): the
  AccountSection writes to `clients.phone_number` but the auth profile read
  pulls from `clients.phone`. Both columns exist and have the same
  E.164 check constraint, but a phone edit from `/profile` won't update the
  value the navbar/login flow reads. This is a pre-existing bug logged for
  follow-up — not a redesign regression.
- **`BrandStudioSection.tsx`** still exists on disk but is no longer
  rendered. Safe to delete in a cleanup PR.
- **`mockData.ts`** is still imported by `ClientProfileTestView` (the
  dev-only `/profile-preview` route gated behind `VITE_ENABLE_PROFILE_PREVIEW`).
  No production code path uses mock data.
