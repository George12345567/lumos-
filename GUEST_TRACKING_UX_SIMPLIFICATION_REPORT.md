# Guest Tracking UX Simplification Report

## 1. Summary

Refined the guest pricing request success screen and `/track-request` portal without changing the security model. Guest tracking still depends on invoice number plus a long tracking key verified by backend RPCs.

No OTP, email verification, public request access, service-role frontend usage, or RLS weakening was added.

## 2. Pricing Success Screen Changes

The guest success screen now focuses on a simpler confirmation:

- Success headline: "Your request has been received" / "تم استلام طلبك بنجاح"
- Short review status: "Our team will review it soon." / "فريقنا هيراجع الطلب قريبًا."
- Clean invoice number display
- Compact selected services chips
- Primary CTA: "Track and manage your request" / "تتبع وتحكم في طلبك"
- Secondary actions for copying the access link, creating an account, and contacting Lumos

The success copy now says:

"Your request is in. We've saved your selected services and created a secure guest access link."

Arabic:

"طلبك وصل. حفظنا الخدمات اللي اخترتها وجهزنا لك رابط آمن لتتبع الطلب."

## 3. Raw Link / Key Hiding

The raw tracking URL is no longer displayed visually in the success screen.

The full tracking key is hidden by default. The screen shows a masked access code and an optional "Show access code" control for advanced recovery from the one-time success state.

Allowed behavior retained:

- The full tracking URL is used behind the primary CTA.
- The full tracking URL is copied only when the user clicks "Copy tracking access link."
- The plaintext tracking key remains frontend memory only after the RPC returns it once.

## 4. Tracking Page Simplification

`/track-request` was redesigned around two clear states.

Start state:

- Centered card
- Title: "Track your request"
- Subtitle: "Enter your invoice number and access code."
- Fields for invoice number and access code
- Primary button: "Open request"

Verified state:

- Top request summary with invoice number, package/request name, status badge, and next step
- Shared animated request status timeline
- Prominent selected services card
- Compact price summary
- Collapsed manage-request section for editing contact details, notes, and cancellation
- Collapsed activity history

When `/track-request?invoice=...&key=...` is opened, the page still auto-verifies. After successful verification, it calls `history.replaceState` and removes the key from the browser URL while keeping the key in component state for allowed guest actions.

## 5. Status Timeline Component

Added shared components:

- `src/components/requests/RequestStatusTimeline.tsx`
- `src/components/requests/requestStatus.ts`

The shared timeline maps statuses as:

- `new` -> Received
- `reviewing` -> Review
- `approved` -> Approval
- `converted` -> Project
- `completed` / `delivered` -> Delivered
- `cancelled` -> Cancelled
- `rejected` -> Rejected

It supports:

- `mode="compact"`
- `mode="full"`
- `animated`
- desktop horizontal timeline
- mobile vertical timeline
- separate cancelled/rejected state display

Used in:

- Pricing modal success screen
- Guest `/track-request`
- Client profile pricing request cards
- Admin request drawer workflow tab

## 6. Security Notes

Security model was intentionally unchanged.

Still true:

- No OTP or email verification was added.
- No public `SELECT`, `UPDATE`, or `DELETE` was added for `pricing_requests`.
- No invoice-only tracking was added.
- No localStorage authorization was added.
- No plaintext tracking key is stored in the database.
- No service-role key is exposed in frontend code.
- Guest data still loads only after backend RPC verification through `verifyGuestTracking`.
- Guest edits and cancellation still go through `guestUpdateRequest`.
- Guest request creation still goes through `createGuestPricingRequest`.

This remains possession-based guest access. The long unguessable tracking key is the guest security mechanism.

## 7. Commands Run

- `npx tsc --noEmit` - passed
- `npm run lint` - passed with 9 existing warnings, no errors
- `npm run build` - passed
- `npm audit --audit-level=low` - passed with 0 vulnerabilities

Existing lint warnings are unrelated to this UX work:

- Fast refresh warning in `LinkClientToTeamModal.tsx`
- Missing hook dependency in `TeamPermissionsSection.tsx`
- Missing hook dependency in `AiChatSidebar.tsx`
- Ref cleanup warnings in `useAvailabilityCheck.ts`

## 8. Manual Test Checklist

- Submit guest request.
- Confirm success screen shows selected services.
- Confirm success screen does not show the full tracking URL.
- Confirm success screen does not show the full tracking key by default.
- Confirm "Track and manage your request" opens `/track-request?invoice=...&key=...`.
- Confirm "Copy tracking access link" copies the access link without displaying it.
- Confirm `/track-request?invoice=...&key=...` auto-verifies.
- Confirm successful verification removes `key` from the address bar.
- Confirm status timeline appears clearly.
- Confirm selected services are easy to see.
- Confirm manage/edit/cancel section is available but lower priority.
- Confirm activity history is collapsed by default.
- Confirm wrong key still fails.
- Confirm localStorage alone cannot open a request.
- Confirm there are no console errors.
