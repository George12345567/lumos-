# Client Profile Tabs + Verified Badge Polish Report

## 1. Summary

Fixed the Client Profile tab switching feel and redesigned the verified client badge as a reusable premium component.

Implemented:
- Stable active tab state with URL and `localStorage` sync.
- No forced scroll jump on every tab click.
- Profile hero stays mounted across tabs.
- Tab panels stay mounted and switch with a small panel-level transition.
- Client profile hooks hydrate from lightweight in-memory per-client caches.
- New reusable `VerifiedClientBadge` component.
- Premium badge usage in Client Profile hero, Admin client cards, and Admin client details.

## 2. Root Cause Of Profile Refresh Feeling

The profile was not doing a hard browser reload, but it felt like one because:
- The active tab was derived directly from `searchParams` and `localStorage` on render.
- Tab changes forced a `requestAnimationFrame` scroll to the content start.
- The overview hero and non-overview compact header swapped in and out on tab changes.
- Tab sections were conditionally mounted/unmounted.
- Data hooks initialized from empty arrays/null state after route remount, so returning to `/profile` could briefly show loading states again.

## 3. Tab Persistence/Rendering Fix

Changed `ClientProfilePage` to:
- Initialize `activeTab` once from URL first, then `localStorage`, then `overview`.
- Update active tab state immediately on click.
- Sync URL with `setSearchParams(..., { replace: true })`.
- Persist the selected tab to `localStorage`.
- Restore the stored tab when `/profile` has no `?tab=`.
- Remove the forced scroll jump on tab click.
- Keep the hero/sidebar/header mounted.
- Keep tab panels mounted and hide inactive panels instead of remounting them.

Updated profile hooks with per-client caches:
- `useClientProfile`
- `usePortalData`
- `useClientIdentity`
- `useClientProjects`
- `useClientPricingRequests`
- `useClientNotes`
- `useNotifications`

This avoids replacing existing content with broad skeleton/loading states when cached data already exists.

## 4. Verified Badge Redesign

Added:

`src/components/shared/VerifiedClientBadge.tsx`

Design behavior:
- Compact emerald glass pill.
- Premium glow border.
- Icon in a small illuminated circle.
- Subtle shimmer and pulse animation.
- Respects `prefers-reduced-motion`.
- Tooltip/title: `Verified by Lumos`.
- Uses `verified_label` when provided.
- Falls back to `Verified Lumos Client`.
- Compact admin version shows `Verified`.

Used in:
- Client Profile hero.
- Admin client cards/list.
- Admin client details hero.
- Admin client details Admin tab.
- Existing alternate `ProfileHero` section component.

Non-verified clients render no badge.

## 5. Files Changed

- `src/components/shared/VerifiedClientBadge.tsx`
- `src/index.css`
- `src/features/client-profile/ClientProfilePage.tsx`
- `src/features/client-profile/sections/ProfileHero.tsx`
- `src/features/client-profile/hooks/useClientProfile.ts`
- `src/features/client-profile/hooks/usePortalData.ts`
- `src/features/client-profile/hooks/useClientIdentity.ts`
- `src/features/client-profile/hooks/useClientProjects.ts`
- `src/features/client-profile/hooks/useClientPricingRequests.ts`
- `src/features/client-profile/hooks/useClientNotes.ts`
- `src/features/client-profile/hooks/useNotifications.ts`
- `src/features/admin/sections/ClientsSection.tsx`

## 6. Commands Run

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Results:
- `npm run lint` passed with existing warnings only.
- `npx tsc --noEmit` passed.
- `npm run build` passed.

## 7. Manual Test Checklist

Not executed with authenticated browser sessions in this environment.

Required manual checks:
- Open `/profile`.
- Switch Home -> Project Hub -> Brand Kit -> Files Library quickly.
- Confirm the full profile skeleton does not reappear.
- Confirm hero/sidebar do not blink or reset.
- Confirm tab URL sync works.
- Leave `/profile` and return.
- Confirm the last tab persists.
- Verify a client from admin.
- Open that client profile.
- Confirm the premium badge appears beside the name.
- Test light mode.
- Test Arabic/RTL.
- Confirm non-verified clients show no badge.
- Confirm Admin client cards show compact verified badges.
- Confirm Admin client details show the full badge and label editing still works.

## 8. Remaining TODOs

- Run the authenticated browser checklist against real client/admin accounts.
- If the always-mounted profile hero is considered too tall on deep tabs, add a compact sticky variant while keeping it mounted and avoiding skeleton/full-section swaps.
