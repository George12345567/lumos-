# Guest Tracking Access & Admin Delete Fix Report — Lumos

## 1. Summary

Fixed guest tracking access-code handling so `/track-request` accepts either a raw guest access key or the full tracking URL. The full URL is parsed, cleaned out of the input, and still verified through the existing backend RPC.

Also split Admin request management into two separate actions:

- Cancel request: status update to `cancelled`, request remains in history.
- Delete permanently: hard delete from `pricing_requests`, owner/admin only, confirmed by typing the invoice number.

The guest security model was not changed.

## 2. Root Cause

The tracking form treated the entire Access Code input as the raw tracking key. If a guest pasted a full URL like:

`https://getlumos.studio/track-request?invoice=LUMOS-2026-0010&key=LMS-GUEST-...`

the app sent that whole URL to `verifyGuestTracking` as `trackingKey`. The RPC correctly rejected it because the database stores the hash of the raw key only, not the full URL.

## 3. Tracking Input Fix

Added `parseTrackingInput(input)` in `src/services/guestTrackingService.ts`.

It supports:

- Raw key input: treated as the tracking key.
- Full `http://` or `https://` URL: parsed with `URL`, extracting `invoice` and `key`.
- Query-string-like values containing `key=`: parsed with `URLSearchParams`.

`/track-request` now:

- Renames the field to "Access Code or Access Link".
- Uses placeholder: "Paste your access code or full tracking link".
- Extracts `invoice` and `key` when a full link is pasted.
- Auto-fills invoice number from the link.
- Replaces the pasted full URL in the input with the clean key.
- Shows a friendly missing-key error if the pasted link does not include `key`.

The missing-key error is:

"This tracking link is missing the access code. Please copy the full access link from the success screen."

## 4. Success CTA Fix

The guest success screen still builds the hidden full access URL with:

`/track-request?invoice=<invoice_number>&key=<tracking_key>`

The primary CTA, "Track and manage your request", navigates to that full URL. The copy action copies the same full URL.

The raw URL is not displayed visually. The raw tracking key is not shown by default. The optional advanced reveal shows the access code only after the user chooses to reveal it.

After `/track-request?invoice=...&key=...` verifies successfully, the page removes `key` from the browser address bar using `history.replaceState`, while keeping the key in component state for permitted guest update/cancel actions.

## 5. Admin Cancel vs Delete

Admin Dashboard request Danger Zone now has two clearly separated actions.

Cancel request:

- Uses `cancelPricingRequest`.
- Calls the existing status-update path.
- Sets status to `cancelled`.
- Appends status history with `old_status`, `new_status`, `changed_at`, `changed_by`, and note: `Admin cancelled request`.
- Refetches dashboard data after DB success.
- Keeps the request visible as cancelled.

Delete permanently:

- Uses `deletePricingRequest`.
- Performs a real Supabase `.delete()` on `pricing_requests`.
- Requires the admin to type the invoice number, or the request id if no invoice exists.
- Removes the request from UI only after DB delete succeeds.
- Refetches dashboard data after DB success.
- Closes the drawer after successful delete.
- Shows an error and keeps the request visible if DB delete fails.

Guests still cannot permanently delete requests. Guest cancellation still goes through `guestUpdateRequest` with invoice plus tracking key verification.

## 6. Database / RLS Changes

No new RLS weakening was added.

No public `SELECT`, `UPDATE`, or `DELETE` was added for `pricing_requests`.

No service-role key was added to frontend code.

Existing migration `20260507120100_enable_rls_and_policies.sql` already defines:

`admin manages pricing requests`

for authenticated users with:

`using (public.is_admin())`

and:

`with check (public.is_admin())`

Because that policy is `for all`, it already covers admin hard delete. No extra delete policy was required.

## 7. Persistence Tests

Cancel is backed by a DB update and dashboard refetch. A refresh should show the request still present with status `cancelled`.

Delete is backed by a DB delete and dashboard refetch. A refresh should not show the deleted request if the DB delete succeeded.

No UI-only success path was added.

## 8. Commands Run

- `npx tsc --noEmit` - passed
- `npm run lint` - passed with 9 existing warnings, no errors
- `npm run build` - passed
- `npm audit --audit-level=low` - passed with 0 vulnerabilities

Existing lint warnings are unrelated:

- Fast refresh warning in `LinkClientToTeamModal.tsx`
- Missing hook dependency in `TeamPermissionsSection.tsx`
- Missing hook dependency in `AiChatSidebar.tsx`
- Ref cleanup warnings in `useAvailabilityCheck.ts`

## 9. Manual Test Checklist

Guest tracking:

- Submit guest request.
- Click "Track and manage your request".
- Confirm `/track-request` auto-verifies.
- Confirm URL key disappears after verification.
- Copy access link.
- Paste full link into "Access Code or Access Link".
- Confirm app extracts invoice/key and verifies.
- Paste raw key with invoice entered manually.
- Confirm app verifies.
- Paste URL without `key`.
- Confirm friendly missing-key error appears.

Admin cancel:

- Open request in `/lumos-admin`.
- Open Danger Zone.
- Click "Cancel request".
- Confirm cancellation.
- Confirm status becomes `cancelled`.
- Refresh and confirm status remains `cancelled`.

Admin delete:

- Open request in `/lumos-admin`.
- Open Danger Zone.
- Type the invoice number.
- Click "Delete permanently".
- Confirm deletion.
- Confirm request disappears only after DB success.
- Refresh and confirm request does not return.

Security:

- Confirm guest portal has no permanent delete action.
- Confirm non-admin delete is blocked by UI permissions and RLS.
- Confirm no public `pricing_requests` read/update/delete exists.
- Confirm wrong tracking key still fails.
- Confirm localStorage alone cannot open a request.

## 10. Remaining TODOs

- Apply/test the current migrations in the target Supabase project if not already deployed.
- Manually test hard delete against production-like RLS, because foreign-key dependencies may block deletion if related rows reference the pricing request.
- If audit retention rules require preserving deleted request metadata, add a dedicated admin archive/export flow before hard deletion.
