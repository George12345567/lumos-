# Project Creation, Client Filter & Discount Code Fix Report - Lumos

## 1. Summary

Fixed the focused admin/client pricing issues without changing auth, `/profile`, `/lumos-admin`, project workroom, or identity sync.

- Requests now show `Project created` only when `pricing_requests.converted_project_id` points to a real `projects` row.
- Project conversion is idempotent and can repair converted requests with missing/invalid project links.
- Admin Projects continues to use real `projects` and `project_services` rows.
- Clients hides only `georgehelal87@gmail.com`, case-insensitively with trim.
- Pricing Modal discount codes now validate against the real discount service/RPC path, affect totals immediately, and persist discount fields in `pricing_requests`.

## 2. Root Causes

- `Project created` appeared because Requests treated any `converted_project_id` or any local request/project hint as proof. It did not verify that the ID existed in `projects`.
- Clients with admin/team permissions disappeared because the clients fetch/UI filtered by `role`, `account_type`, and admin/team-like status instead of only hiding the root owner from the Clients list.
- Discount codes did not affect reliable totals because the modal validated only a simple active uppercase code lookup and did not send subtotal/package/service context. The old helper also incremented usage when applying a code, before any request was submitted.

## 3. Project Conversion Fix

Files changed:

- `src/services/projectService.ts`
- `src/services/adminDashboardService.ts`
- `src/hooks/useAdminDashboard.ts`
- `src/features/admin/sections/RequestsSection.tsx`

Conversion flow:

- Fetch the pricing request by ID.
- If `converted_project_id` exists, verify the project row exists.
- If valid, return the existing project and do not duplicate.
- If invalid/missing, check for an existing project by `pricing_request_id`.
- If found, ensure selected services exist and repair `pricing_requests.converted_project_id`.
- If no project exists, call `create_project_from_pricing_request`.
- Verify the created project row exists before reporting success.
- Ensure `project_services` rows exist for selected services.
- Set request `status = converted` only after project verification succeeds.
- Refetch dashboard data after conversion.

Repair behavior:

- Broken converted requests no longer show fake `Project created`.
- They show `Project repair needed`.
- The workflow button becomes `Repair / Create project`.
- The same idempotent conversion function repairs or creates the project without duplicates.

## 4. Admin Projects Fetch Fix

Admin Projects fetches real rows from `projects` through `fetchAdminProjects()`, then loads:

- related `project_services`
- related `client_assets` deliverables
- project/request linkage through `pricing_request_id`

The empty state is only shown when the real `projects` fetch returns no rows. Requests no longer drive fake project cards.

## 5. Clients Filter Fix

Files changed:

- `src/services/adminDashboardService.ts`
- `src/features/admin/sections/ClientsSection.tsx`

The only Clients-list exclusion is now:

```ts
normalizeEmail(client.email) !== 'georgehelal87@gmail.com'
```

Role, `account_type`, admin permissions, team permissions, and employee status are no longer used to hide accounts from Clients. This does not remove the root owner from auth/admin access; it only hides that email from the Clients UI list.

## 6. Discount Code Fix

Files changed:

- `src/services/discountService.ts`
- `src/components/pricing/PricingModal.tsx`
- `src/lib/pricingEngine.ts`
- `src/types/dashboard.ts`

Validation rules:

- trims whitespace
- matches case-insensitively
- validates active/inactive
- validates start date
- validates expiry date
- validates usage limit from stored `usage_count`
- validates minimum order value
- validates package/service/category restrictions when columns/data exist
- supports percentage and fixed discounts

Pricing Modal changes:

- sends subtotal, selected package, selected service IDs, and service categories to validation
- shows empty/invalid/inactive/expired/not-started/usage-limit/not-applicable messages
- shows `Discount applied.`
- recalculates totals immediately
- supports remove/reset
- saves `appliedPromoCode` and `discountBreakdown.promo_discount` into the pricing request payload

Pricing engine changes:

- percentage and fixed promo discounts are capped by `max_discount`
- promo discount is capped by the remaining total after base discounts
- final total cannot go below `0`

Admin display:

- Existing Requests cards already read `discount_breakdown` and `applied_promo_code`, so persisted promo discounts continue to show after refresh.

## 7. Database / RLS Changes

Migration created:

- `supabase/migrations/20260508170000_fix_project_conversion_clients_discount_codes.sql`

Database changes:

- Adds `discount_codes.applicable_packages text[] default '{}'`
- Adds `discount_codes.applicable_services text[] default '{}'`
- Adds a case-insensitive code lookup index
- Adds safe RPC `public.validate_discount_code(...)`

RLS/security:

- No service-role key was added to frontend.
- No public `SELECT`, `UPDATE`, `DELETE`, or table write policy was added.
- Discount validation is exposed through an RPC that returns only validation/calculation fields, not all discount code internals.
- Admin/project RLS from existing migrations is preserved.

## 8. Persistence Tests

Verified by build/typecheck and data-flow review:

- Conversion success is only reported after a real project row is verified.
- Requests and Projects refetch after conversion.
- Discount fields are saved into `pricing_requests` through the existing submit payload.
- Admin Requests reads persisted discount fields from the database snapshot.

Manual database/browser flows still need to be run against the deployed Supabase project.

## 9. Commands Run

`npx tsc --noEmit`

- Result: passed with exit code 0.

`npm run lint`

- Result: passed with exit code 0.
- Warnings: 11 existing warnings, no errors. Warnings are in `LinkClientToTeamModal.tsx`, `AdminAccessContext.tsx`, `TeamPermissionsSection.tsx`, `AiChatSidebar.tsx`, `useAdminDashboard.ts`, and `useAvailabilityCheck.ts`.

`npm run build`

- Result: passed with exit code 0.
- Vite built successfully.
- Non-failing notices: `baseline-browser-mapping` and Browserslist data are stale.

`npm audit --audit-level=low`

- Result: passed with exit code 0.
- Output: `found 0 vulnerabilities`.

## 10. Manual Test Checklist

- [ ] Convert approved pricing request.
- [ ] Confirm success toast.
- [ ] Admin -> Projects shows the created real project.
- [ ] Project Workroom opens and selected services appear.
- [ ] Browser refresh keeps project visible.
- [ ] Requests shows `Project created` only when `converted_project_id` is valid.
- [ ] Clicking conversion again does not create a duplicate.
- [ ] Broken converted request shows `Project repair needed`.
- [ ] Repair action creates/links the real project.
- [ ] `georgehelal87@gmail.com` is hidden from Clients.
- [ ] Other admin/team-permission accounts remain visible in Clients.
- [ ] Normal clients remain visible.
- [ ] Client search and filters still work.
- [ ] Active percentage discount applies in Pricing Modal.
- [ ] Fixed discount applies in Pricing Modal.
- [ ] Removing discount restores original total.
- [ ] Submitted request persists discount code and amount.
- [ ] Admin Requests shows persisted discount after refresh.
- [ ] Invalid/expired/inactive code does not change total.

## 11. Remaining TODOs

- Manual browser/Supabase testing is still required against the live database.
- Discount validation respects stored `usage_count`, but this patch does not add a new redemption ledger or guaranteed once-per-request usage counter increment.
- Package/service discount restrictions are supported by the new `applicable_packages` and `applicable_services` columns/RPC. Existing admin UI may need dedicated controls to manage those restrictions if not already present.
- Lint warnings remain existing non-blocking warnings; no lint errors remain.
