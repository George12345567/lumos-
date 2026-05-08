# Guest Tracking Without OTP Report — Lumos

## 1. Summary

Implemented a guest request tracking flow without email verification and without OTP, as requested. Guests can submit pricing requests, receive an invoice number plus a one-time displayed tracking key/link, and later open `/track-request` to view or manage the request.

The implementation does not rely on localStorage for authorization. Request access is granted only after validating the invoice number and long guest tracking key through safe Supabase RPCs.

## 2. Security Model

No OTP or email verification was implemented by product decision.

This is not 100% identity-proof ownership verification. Email and phone uniqueness checks reduce duplicate requests, but they do not prove the person submitting or tracking the request owns that email address or phone number.

Guest access depends on possession of a long unguessable tracking key generated when the request is created. The plaintext tracking key is returned once to the guest and is not stored in the database. The database stores only a hash of the tracking key.

If a guest loses the tracking key, Lumos cannot automatically recover guest tracking access without email verification. The guest must create an account or contact Lumos support.

localStorage is used only as a convenience cache for non-authoritative fields such as invoice number and contact snapshot. It cannot unlock request data by itself.

## 3. Guest Flow

1. Guest opens the pricing modal and enters contact details.
2. The frontend calls a safe duplicate-check RPC before guest submission.
3. If the contact details are already connected to a prior request or account, the guest sees only a generic privacy-preserving message.
4. If allowed, the frontend calls `create_guest_pricing_request`.
5. The RPC creates the request, generates the invoice number and tracking key, stores only the tracking hash, and returns the invoice number plus plaintext tracking key once.
6. The success screen shows invoice number, request status, tracking key/link, copy action, create-account action, and a warning to save the tracking link.
7. The guest later opens `/track-request` with invoice number and tracking key.
8. No request data is shown until `verify_guest_tracking` validates both values.

## 4. Duplicate Email/Phone Check

Duplicate checks are handled through `check_guest_contact_available`, not direct public table reads.

The RPC checks normalized guest email and phone against:

- `public.clients.email`
- `public.clients.phone`
- `public.clients.phone_number`
- `public.pricing_requests.guest_email`
- `public.pricing_requests.guest_phone`
- `public.pricing_requests.contact_email`
- `public.pricing_requests.contact_phone`

The UI does not reveal whether the match is an account or a guest request. It shows the generic message:

EN: "These details are already connected to a previous request or account. Please sign in, use another contact method, or contact Lumos support."

AR: "البيانات دي مرتبطة بطلب أو حساب سابق. من فضلك سجّل الدخول، استخدم بيانات تواصل مختلفة، أو تواصل مع فريق Lumos."

The UI offers sign in, track existing request, and contact Lumos options without exposing private details.

## 5. Database / Migration Changes

Added migration files:

- `supabase/migrations/20260508122900_add_cancelled_pricing_request_status.sql`
- `supabase/migrations/20260508123000_guest_tracking_no_otp.sql`

The guest tracking migration adds these fields to `public.pricing_requests`:

- `guest_tracking_hash`
- `guest_tracking_created_at`
- `guest_tracking_last_used_at`
- `guest_tracking_revoked_at`
- `guest_last_accessed_at`

It also adds indexes for guest tracking hash uniqueness, invoice/hash lookup, and guest last-access reporting.

The `cancelled` status was added to the pricing request status enum so guest cancellation is represented as a soft status change, never as permanent deletion.

## 6. Edge Functions / RPCs

This implementation uses safe Supabase RPCs instead of Edge Functions:

- `check_guest_contact_available(p_guest_email, p_guest_phone)`
- `create_guest_pricing_request(p_request jsonb)`
- `verify_guest_tracking(p_invoice_number, p_tracking_key)`
- `guest_update_request(p_invoice_number, p_tracking_key, p_updates jsonb)`

The RPCs are `SECURITY DEFINER` functions with explicit grants to `anon` and `authenticated`. They return safe response data only and do not expose unrestricted `pricing_requests` reads or writes.

`create_guest_pricing_request` generates a long tracking key, hashes it with `pgcrypto`, stores only the hash, and returns the plaintext key once.

`verify_guest_tracking` validates invoice number plus tracking key hash, rejects revoked tracking access, updates guest access timestamps, and returns only guest-safe request fields.

`guest_update_request` validates the same credentials, enforces status restrictions, allowlists guest-editable fields, performs uniqueness checks for changed email/phone, and appends guest activity to `status_history`.

## 7. Guest Portal UX

Added `/track-request`.

Start state:

- Invoice Number
- Tracking Code / Tracking Key
- Optional prefill from URL and localStorage

Verified state:

- Invoice number
- Status
- Package/request type
- Selected services
- Subtotal
- Discount code
- Discount amount
- Final total
- Currency
- Created date
- Status history
- Notes
- Next step
- Contact details

Actions:

- Edit contact details
- Edit notes
- Cancel request
- Copy tracking link
- Create account
- Contact Lumos

Request data is not rendered until invoice number and tracking key are validated by the backend RPC.

## 8. Allowed Guest Actions

Allowed only while status is `new` or `reviewing`:

- Update `guest_name`
- Update `guest_phone`
- Update `guest_email` if uniqueness check passes
- Update `request_notes`
- Cancel the request by setting status to `cancelled`

Guest changes append entries to `status_history` so admins can see activity.

## 9. Blocked Guest Actions

Guests cannot:

- Permanently delete a request
- Directly change status
- Change priority
- Change assignment
- Change admin notes
- Change estimated totals
- Change discounts
- Change invoice number
- Change client ownership
- Change internal tracking fields
- Access another guest request without the matching tracking key
- Use localStorage alone to access request data

Requests in later statuses such as `approved`, `converted`, `delivered`, `rejected`, or `cancelled` become read-only in the guest portal.

## 10. Admin Dashboard Integration

Admin request views now include guest-tracking context:

- Guest/client badges
- Tracking enabled badge
- Invoice number
- Guest name/email/phone
- Status including `cancelled`
- Selected services
- Promo/discount fields
- Total
- Last guest access timestamp
- Guest cancellation visibility

Permanent deletion from the pricing request service was replaced with cancellation. Admin-facing text now uses cancel/cancelled language instead of claiming a request is deleted.

## 11. Account Conversion

The guest portal includes a "Create account to manage all requests" action.

Full automatic linking of a guest request to `client_id` after signup is not implemented. This must not be treated as complete account conversion.

Correct future behavior:

- Link only after the user is authenticated.
- Link only when the authenticated account email matches the guest request email under the product's account verification rules.
- Preserve the original guest snapshot.
- Then show the request in `/profile` projects.

## 12. RLS / Security

No public `SELECT`, public `UPDATE`, or public `DELETE` policies were added for `pricing_requests`.

No `using(true)` policy was added for this guest tracking feature.

No service-role key is used in frontend code.

The feature relies on safe RPCs for guest actions. The RPCs perform their own validation and return only safe fields.

Existing unrelated broad policies and server-side service-role usage were found elsewhere in the project during scan, including old migrations and an admin Edge Function. They were not added by this work and should be reviewed separately if the project is being hardened end to end.

## 13. Commands Run

- `npm run build` - passed before changes and after implementation.
- `npm run lint` - passed with existing warnings unrelated to this guest tracking work.
- `npx tsc --noEmit` - passed.
- `npm audit --audit-level=low` - passed with 0 vulnerabilities.
- Dist secret scan for `service_role`, `SUPABASE_SERVICE`, `VITE_SUPABASE_SERVICE`, `SERVICE_ROLE`, `VITE_AI`, `sk_live`, `sk_test`, and `sb_secret` - no matches in `dist`.

Current lint warnings are pre-existing:

- Fast refresh export warning in `LinkClientToTeamModal.tsx`
- Missing hook dependency in `TeamPermissionsSection.tsx`
- Missing hook dependency in `AiChatSidebar.tsx`
- Ref cleanup warnings in `useAvailabilityCheck.ts`

## 14. Manual Test Checklist

Guest new request:

- Log out.
- Submit pricing request as guest.
- Confirm duplicate email/phone check runs.
- Confirm success screen shows invoice number and tracking key/link.
- Copy tracking link.
- Open `/track-request`.
- Confirm request only loads with correct invoice number and key.

Guest duplicate:

- Try the same email/phone again.
- Confirm generic duplicate message appears.
- Confirm the UI does not reveal whether the match is an account or a request.

Guest control:

- Edit notes while status is `new`.
- Confirm admin sees updated notes.
- Cancel request.
- Confirm status becomes `cancelled`.
- Confirm admin sees cancellation and history.

Security:

- Wrong tracking key returns a generic error.
- Invoice number alone cannot read request.
- localStorage alone cannot read request.
- Guest cannot update status, totals, discounts, admin notes, assignment, or internal fields.
- No public `SELECT`/`UPDATE`/`DELETE` policy is required for `pricing_requests`.

Logged-in client:

- Existing logged-in client request flow still works.
- Request links to `client_id`.
- Request appears in `/profile` projects.

## 15. Remaining TODOs

- Apply and test the Supabase migrations against the target Supabase project.
- Perform browser manual testing against a real Supabase environment.
- Implement verified account conversion/linking after signup.
- Decide whether guest-selected services should be editable later; this implementation keeps pricing-sensitive fields blocked.
- Review pre-existing broad RLS policies outside this feature.
- Review pre-existing server-side service-role Edge Functions as part of a broader security hardening pass.
