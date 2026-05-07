# Final Launch Audit Report — Lumos Website

Audit date: May 7, 2026  
Auditor mode: launch-readiness, security, frontend QA, Supabase/RLS review  
Scope: repository code, config, env variable names, Supabase migrations/docs, build/lint/typecheck/audit, and local HTTP route smoke test.  
Source-code changes made during this audit: none. This report file is the only file intentionally created.

## 1. Executive Verdict

| Surface | Verdict | Summary |
| --- | --- | --- |
| Public marketing site readiness | ⚠️ Ready with conditions | Build and HTTP route fallback work, but lint fails, npm audit reports high vulnerabilities, legal pages are missing, OG image is placeholder, and browser console/visual testing was not completed. |
| Auth readiness | ⛔ Not ready | Frontend auth gates are much improved, but production RLS/application, admin promotion, and real Supabase smoke tests are not confirmed. |
| Client profile readiness | ⛔ Not ready | Requires applied RLS, confirmed storage bucket/policies, and upload path alignment. |
| Admin dashboard readiness | ⛔ Not ready | Admin UI gate is UX-only; do not launch until RLS is applied/tested and master admin promotion is confirmed. |
| Backend readiness | ⛔ Not ready | Migrations are prepared in repo but not confirmed applied. Edge Functions are not deployed. Supabase CLI is not installed here to verify remote state. |

Strict conclusion: the project is not ready for full production launch. A limited public marketing-only launch is possible only after accepting or fixing the listed conditions; auth/profile/admin must wait.

## 2. What Was Tested

Files/docs read first or inspected: `AUTH_AUDIT_REPORT.md`, `AUTH_FIX_REPORT.md`, `AUTH_FINAL_VERIFICATION_REPORT.md`, `SUPABASE_SECURITY_SETUP.md`, `SUPABASE_BACKEND_READY_REPORT.md`, `SUPABASE_PRODUCTION_DEPLOY_CHECKLIST.md`, `SUPABASE_EDGE_FUNCTIONS_TODO.md`, `package.json`, `vite.config.ts`, `tailwind.config.ts`, `index.html`, `vercel.json`, `public/_headers`, `src/App.tsx`, `src/main.tsx`, `src/config/env.ts`, `src/config/auth.ts`, `src/lib/supabaseClient.ts`. `README.md` is missing.

Project areas inspected: `src/pages`, `src/components`, `src/features`, `src/context`, `src/hooks`, `src/lib`, `src/services`, `src/data`, `src/types`, `src/utils`, `public`, `supabase/migrations`, root config files, package scripts, and generated `dist`.

Routes checked in code and via local Vite HTTP fallback: `/`, `/demo`, `/services/web-systems`, `/services/web-design`, `/client-login`, `/client-signup`, `/forgot-password`, `/reset-password`, `/profile`, `/profile-preview`, `/lumos-admin`, `/privacy-policy`, `/terms-and-conditions`, `/cookie-policy`, `/random-404-path`.

Commands run: `npx tsc --noEmit`, `npm run build`, `npm run lint`, `npm run typecheck --if-present`, `npm run test --if-present`, `npm audit --audit-level=low`, `where.exe supabase`, local `npm run dev` on port `5173`, HTTP route requests with `Invoke-WebRequest`, and dist string scan for service-role/service-key indicators.

Limitations: no real browser automation or console capture tool was available. The smoke test confirms Vite served the SPA shell for routes, not that each React route rendered without runtime console errors. Supabase remote state was not verified because Supabase CLI is not installed.

## 3. Critical Blockers — Must Fix Before Launch

| ID | Severity | Area | Problem | Evidence/File | Required Fix |
| --- | --- | --- | --- | --- | --- |
| C-01 | Critical | Supabase/RLS | RLS is prepared but not confirmed applied. Auth/profile/admin cannot be trusted until the production DB has the new role, RLS, cleanup, and storage migrations applied and tested. | `SUPABASE_BACKEND_READY_REPORT.md`; `supabase/migrations/20260507120000_*` through `20260507120300_*`; `where.exe supabase` found no CLI. | Apply migrations to production, confirm policies in dashboard/CLI, run anon/client/admin smoke tests, and document applied migration status. |
| C-02 | Critical | Admin security | Admin dashboard remains protected only by frontend UX gates until RLS is verified. A frontend email check is not authorization. | `src/config/auth.ts`, `src/components/shared/AuthRoutes.tsx`, `src/pages/AdminDashboard.tsx`; setup docs explicitly say frontend gate is UX-only. | Confirm `clients.role`, `public.is_admin()`, master admin promotion, and admin-only RLS for all admin-touched tables before enabling `/lumos-admin`. |
| C-03 | Critical | Dependency security | `npm audit --audit-level=low` failed with 12 vulnerabilities: 9 high and 3 moderate, including React Router XSS/open redirect advisory, Vite dev-server file read/path traversal advisories, Rollup arbitrary file write, lodash prototype pollution/code injection, and ReDoS issues. | Command output from `npm audit --audit-level=low`; `package.json` uses `react-router-dom` `^6.30.1`, `vite` `^7.2.4`. | Upgrade vulnerable dependencies and rerun `npm audit`; do not ship until high vulnerabilities are resolved or formally risk-accepted with compensating controls. |
| C-04 | Critical | Build quality gate | `npm run lint` fails with 7 errors. Launch gates should not pass while lint is red. | `src/components/layout/EnhancedNavbar.tsx:407`, `src/hooks/useCurrency.tsx:28`, `src/hooks/useCurrency.tsx:38`, `src/services/db.ts:46`, `src/services/submissionService.ts:75`, `src/services/submissionService.ts:83`. | Fix lint errors and rerun `npm run lint` to exit 0. |
| C-05 | Critical | Frontend env safety | `.env` contains additional `VITE_AI_*` key variables beyond the allowed frontend env list. Any `VITE_*` API key is bundled to browsers if referenced. No `VITE_SUPABASE_SERVICE_*` variable is currently present. | `.env` variable-name check; `src/services/aiChatService.ts` reads `VITE_AI_API_KEY` and `VITE_AI_FALLBACK_KEY`. | Remove browser-exposed AI keys or move AI calls behind a backend/Edge Function. Keep frontend env limited to `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MASTER_ADMIN_EMAIL` unless explicitly risk-accepted. |

## 4. High Priority Issues

| ID | Severity | Area | Problem | Evidence/File | Recommended Fix |
| --- | --- | --- | --- | --- | --- |
| H-01 | High | Legal/trust | Legal pages requested for verification are not registered: `/privacy-policy`, `/terms-and-conditions`, `/cookie-policy`. Footer also does not link legal pages. | `src/App.tsx` routes only public/auth/profile/admin/wildcard; `src/components/layout/Footer.tsx`. | Add legal page routes and footer links before public launch, especially because analytics/geolocation/localStorage/sessionStorage are used. |
| H-02 | High | SEO/social | OG and Twitter image point to `/placeholder.svg`, not a production social preview asset. | `index.html`. | Add a real branded OG image with absolute URL and correct dimensions. |
| H-03 | High | Client storage | Storage migration requires `client-assets/<auth.uid>/...`, but avatar upload uses `profile-avatars/<clientId>-<timestamp>-<name>` and calls `getPublicUrl` despite bucket checklist requiring private bucket. | `src/services/profileService.ts`; `supabase/migrations/20260507120300_storage_rls_client_assets.sql`. | Align upload path to `<clientId>/avatars/<filename>` and use signed URLs/private bucket flow. |
| H-04 | High | Auth/backend UX | Admin-created clients are profile-only and cannot log in until an auth user is invited manually or an Edge Function exists. | `SUPABASE_EDGE_FUNCTIONS_TODO.md`; `src/pages/AdminDashboard.tsx` client modal/create flow. | Deploy `admin-create-client` Edge Function or keep admin creation disabled/clearly marked as profile-only. |
| H-05 | High | AI feature | Floating dock shows AI buttons, but `AiChatSidebar` is not mounted anywhere, so the custom event has no listener in the active app. If mounted later, it uses browser-exposed AI keys. | `src/components/layout/FloatingDock.tsx`; search shows no import of `AiChatSidebar` outside its own feature. | Remove/hide AI CTA or mount a safe backend-backed chat intentionally. |
| H-06 | High | Form correctness | Lead capture popup reports success even if `saveContact` fails; `saveLeadCapture` ignores the return value and catches silently. | `src/features/lead-capture/LeadCapturePopup.tsx`. | Surface backend failure or do not show success unless insert succeeds. |
| H-07 | High | Supabase storage/manual | `client-assets` bucket existence/private status is not confirmed. Migrations cannot create it. | `SUPABASE_PRODUCTION_DEPLOY_CHECKLIST.md`; storage migration comments. | Create bucket, set private, confirm policies, and test upload/read as client/admin. |

## 5. Medium / Low Issues

| ID | Severity | Area | Problem | Evidence/File | Recommendation |
| --- | --- | --- | --- | --- | --- |
| M-01 | Medium | Project hygiene | `README.md` is missing, despite being listed as a required launch/audit file. | Root listing. | Add a concise production README with setup, env, deploy, and smoke-test steps. |
| M-02 | Medium | Dead/suspicious files | Dead or suspicious files remain: `src/main.js` WebStorm starter code, `src/components/pricing/PricingModal. copy. txt`, old cleanup/fix scripts, `backup/`, duplicate avatar source folders. | Project file listing. | Remove or archive dead files outside the production repo after verifying no needed artifacts. |
| M-03 | Medium | Forms/data | Contact form labels `businessName` but treats values containing `@` as email, which can misclassify company names/emails. | `src/features/contact/EnhancedContact.tsx`; `src/services/db.ts`. | Split business name and email fields or stop overloading one field. |
| M-04 | Medium | Privacy | Pricing modal stores guest name/phone/email and request details in `localStorage` for 30 days. | `src/components/pricing/PricingModal.tsx`. | Document in privacy policy and consider session storage or shorter retention. |
| M-05 | Medium | Console/debug | Production bundle contains console calls from app code, including contact save success/errors and logger output. | Security search; `src/features/contact/EnhancedContact.tsx`, `src/lib/logger.ts`, generated `dist`. | Keep error logs if intentional, but remove success/debug logs from production. |
| M-06 | Medium | Accessibility/visual QA | HTTP smoke test did not verify keyboard navigation, focus order, color contrast, modal trapping, or mobile visual layout. | Tooling limitation. | Run Playwright/Lighthouse/manual browser QA on mobile/tablet/desktop before launch. |
| M-07 | Low | SEO route behavior | Unknown service slugs such as `/services/web-design` navigate home in React rather than showing a service 404. | `src/pages/ServicePage.tsx`. | Consider rendering `NotFound` for invalid slugs instead of redirecting to `/`. |
| M-08 | Low | Browser data freshness | Build warns `baseline-browser-mapping` and Browserslist/caniuse data are stale. | `npm run build` output. | Update browser data during dependency maintenance. |

## 6. Auth / Admin / Profile Verdict

| Flow | Verdict | Notes |
| --- | --- | --- |
| Login | ⚠️ Ready with conditions | Uses zod validation, disabled submit when Supabase config is missing, and safe internal `redirectTo`. Requires real Supabase/RLS smoke test. |
| Signup | ⚠️ Ready with conditions | Uses validation, availability checks, disabled final submit when not configured, and hashes security answer before saving. Requires RLS and email confirmation test. |
| Reset password | ⚠️ Ready with conditions | Email reset path is used; browser-side security question verification is disabled. Must test Supabase recovery links in production. |
| Profile | ⛔ Not ready | Route is protected and profile fetch failure does not log out, but client data safety depends on applied RLS and storage alignment. |
| Admin dashboard | ⛔ Not ready | No dev bypass found in source; legacy `lumos_admin_dev` is only removed defensively. Still UX-only until RLS/admin role is applied and tested. |
| RLS status | ⛔ Not ready | Migrations exist, but application to production is not confirmed. |
| Service key exposure status | ⚠️ Partial | No `VITE_SUPABASE_SERVICE_*` in `.env` or source. Dist scan found no service-role/service-key strings. Browser-exposed `VITE_AI_*` keys remain a separate risk. |

Checks confirmed:
- No `?dev=true` admin bypass in `src`.
- No active localStorage admin bypass; only `localStorage.removeItem('lumos_admin_dev')`.
- No hardcoded personal admin email found in `src`; admin email comes from `VITE_MASTER_ADMIN_EMAIL`.
- Admin frontend gate is documented as UX-only.
- Login/signup/reset do not fake success when Supabase env is missing.
- Session state is separated from profile state.
- Logout clears React Query cache.
- Plaintext `security_answer` is not intentionally persisted by current frontend code.

Remaining strict blockers:
- Supabase RLS not confirmed applied.
- Master admin promotion not confirmed.
- Edge Functions not deployed.
- Real anon/client/admin smoke tests not run.

## 7. Supabase / Backend Verdict

| Item | Status | Verdict | Notes |
| --- | --- | --- | --- |
| Required frontend env names | Present locally | ⚠️ | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MASTER_ADMIN_EMAIL` are present by name. Values were not printed. |
| Dangerous frontend Supabase service vars | Not present locally | ✅ | No `VITE_SUPABASE_SERVICE_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`, `VITE_SERVICE_ROLE_KEY`, or `VITE_*_SERVICE_*` found in `.env` variable names. |
| Extra frontend key vars | Present | ⛔ | `VITE_AI_API_KEY` and fallback AI variables are present by name and are browser-exposed if used. |
| Backend-only vars | Present locally | ⚠️ | `DATABASE_URL` and `SUPABASE_DB_PASSWORD` are present by name. Keep them out of frontend hosting env. |
| Migrations created | Yes | ✅ | New role/RLS/cleanup/storage migrations exist. |
| Migrations applied | Not confirmed | ⛔ | Supabase CLI not installed; reports also state migrations were created, not applied. |
| `clients.role` | Migration exists | ⚠️ | `20260507120000_add_clients_role_and_is_admin.sql` tightens role and creates `public.is_admin()`. |
| `public.is_admin()` | Migration exists | ⚠️ | Uses `SECURITY DEFINER`, `auth.uid()`, and role lookup. Must be applied/tested. |
| RLS policies | Migration exists | ⚠️ | Covers `clients`, `pricing_requests`, `orders`, `contacts`, `audit_logs`, `notifications`, `team_members`, `discount_codes`, `saved_designs`, `signup_requests`, `password_reset_requests`. |
| Storage bucket/policies | Policies exist, bucket not confirmed | ⛔ | Bucket creation/private status is a manual step. |
| Admin promotion | Not confirmed | ⛔ | Must update `clients.role = 'admin'` for master admin after signup. |
| Edge Functions | Specs only | ⚠️ | `admin-create-client` and `verify-security-answer` are not deployed. |

Strict backend verdict: RLS is prepared but not confirmed applied. Backend is not production-ready.

## 8. Route Verification Table

| Route | Expected Access | Actual/Code Status | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `/` | Public | Registered in `src/App.tsx`; HTTP returned SPA shell. | ⚠️ | Needs browser visual/console QA; includes lazy live preview. |
| `/demo` | Public | Registered; HTTP returned SPA shell. | ⚠️ | Needs browser render QA. |
| `/services/:slug` | Public valid slugs | Registered. Valid slugs are `web-systems`, `brand-identity`, `social-growth`. | ⚠️ | `/services/web-design` is not valid and React redirects home. |
| `*` | Public 404 | Registered `NotFound`. | ⚠️ | HTTP fallback always returns 200 SPA shell; React 404 not browser-verified. |
| `/privacy-policy` | Public legal | Not registered. | ⛔ | Missing. |
| `/terms-and-conditions` | Public legal | Not registered. | ⛔ | Missing. |
| `/cookie-policy` | Public legal | Not registered. | ⛔ | Missing. Cookie/storage/tracking behavior exists. |
| `/client-login` | Guest only | Registered through `GuestRoute`. | ⚠️ | Requires real Supabase test. |
| `/client-signup` | Guest only | Registered through `GuestRoute`. | ⚠️ | Requires real Supabase test. |
| `/forgot-password` | Guest only | Registered through `GuestRoute`. | ⚠️ | Requires recovery email test. |
| `/reset-password` | Token/session-based | Registered public, page validates Supabase session/config. | ⚠️ | Should test with actual recovery link. |
| `/profile` | Authenticated client | Registered through `ProtectedRoute`. | ⛔ | Do not launch until RLS/storage confirmed. |
| `/profile-preview` | Dev/feature-flag only | Registered only when dev or `VITE_ENABLE_PROFILE_PREVIEW=true`. | ✅ | In dev HTTP shell loads; production build should omit unless flag is set. |
| `/lumos-admin` | Admin only | Registered through `AdminRoute`; 403 for non-admin in code. | ⛔ | Do not launch until backend RLS/admin role confirmed. |
| `/clients/dashboard` | If referenced | No route and no current route constant. | ✅ | No active route found. |

Open redirect status: no obvious open redirect found. `ProtectedRoute` and `LogInPage` reject non-internal paths, protocol-relative paths, and backslashes.

## 9. Forms Verification Table

| Form | Validation | Submit State | Backend Destination | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Contact form | Required name/phone/business/industry/service/message; phone format check. | Disabled while submitting. | `contacts` via `saveContact`. | ⚠️ | Works only if anon insert RLS applied. Business/email overloading should be fixed. |
| Pricing request modal | Internal validation for name/phone/email and flow state. | Disabled while sending. | `pricing_requests`, optional `contacts`, localStorage request tracking. | ⚠️ | Needs RLS confirmation and privacy disclosure for localStorage PII. |
| Lead capture popup | All fields optional via zod. | Disabled while submitting. | `contacts` via `saveContact`. | ⛔ | Shows success even if save fails. |
| Login | zod schema. | Duplicate submit guarded; disabled when auth not configured. | Supabase Auth. | ⚠️ | Requires production Supabase test. |
| Signup | zod schema, multi-step validation, availability checks. | Disabled when submitting/not configured. | Supabase Auth + `clients` upsert. | ⚠️ | Requires RLS/email confirmation test. |
| Forgot password | zod email validation. | Duplicate submit guarded; disabled when not configured. | Supabase reset email. | ⚠️ | Security-question path disabled intentionally. |
| Reset password | zod password schema. | Duplicate submit guarded; disabled when not configured. | Supabase `updateUser`. | ⚠️ | Must test recovery link session. |
| Profile edit forms | Field-level validation in account section; autosave queue. | Save state indicator present. | `clients` update. | ⛔ | Requires RLS and upload storage fix. |
| Admin client/team/discount forms | Required-field checks and disabled saving state. | Disabled while saving. | Supabase tables. | ⛔ | Requires admin RLS and Edge Function/manual invite process. |
| Demo/live preview forms | Local validation for add item/save; design save requires auth. | Save state present. | `saved_designs` for authenticated save. | ⚠️ | Requires saved_designs RLS and browser QA. |

## 10. SEO / Social / Legal Checklist

| Checklist item | Status | Notes |
| --- | --- | --- |
| Title | ✅ | `Lumos Agency | Brand, Web & Growth Studio`. |
| Meta description | ✅ | Present and relevant. |
| OG title | ✅ | Present. |
| OG description | ✅ | Present. |
| OG image | ⛔ | Uses `/placeholder.svg`; not production-ready. |
| Twitter card | ⚠️ | Present, but image is placeholder. |
| Favicon | ✅ | `/favicon.png` exists and is linked. |
| robots.txt | ✅ | Present and references sitemap. |
| sitemap.xml | ⚠️ | Present, but only includes `/` and three service routes; no legal/auth/demo pages. |
| Canonical URL | ✅ | Present in `index.html`; service pages update canonical dynamically. |
| Page titles | ⚠️ | Service and 404 update title; many SPA pages rely on default title. |
| Important image alt text | ⚠️ | Some decorative/team images use empty alt intentionally; full image QA not completed. |
| 404 page | ✅ | React 404 exists. |
| Privacy Policy | ⛔ | Missing. |
| Terms & Conditions | ⛔ | Missing. |
| Cookie Policy | ⛔ | Missing. |
| Footer copyright | ✅ | Dynamic year renders `© 2026 Lumos Agency. All rights reserved.` in 2026. |
| Contact info | ✅ | Email, phone, WhatsApp, Facebook present. |

## 11. Security Search Results

| Search area | Finding | Verdict |
| --- | --- | --- |
| service role keys | No `VITE_SUPABASE_SERVICE_*` in `.env` names. No service-role/service-key strings found in `dist`. Docs mention prohibited names as warnings. | ✅ for Supabase frontend service-key exposure. |
| `VITE_*` service variables | None matching `VITE_*_SERVICE_*` found locally. | ✅ |
| Extra frontend API keys | `VITE_AI_API_KEY`, `VITE_AI_FALLBACK_KEY`, and related vars exist by name and are used by `aiChatService`. | ⛔ Browser-exposed key risk. |
| Admin bypass | No active `dev=true` in `src`; `lumos_admin_dev` only appears as defensive removal in admin page and old docs/dist from prior build. | ✅ |
| `security_answer` | Current frontend strips plaintext and uses hash. Legacy schema/docs/data mention it. Cleanup migration exists but application not confirmed. | ⚠️ |
| localStorage/sessionStorage | Used for Supabase tokens, language/appearance, geo cache, pricing pending request, lead/dock/nav guide flags. | ⚠️ PII in pricing localStorage and token-XSS risk should be documented. |
| XSS risks | No `eval(` found. `dangerouslySetInnerHTML` exists in chart CSS generation; values come from chart config. `main.tsx` writes static fallback HTML on root render failure. | ⚠️ No obvious exploit found, but keep CSP and sanitize any future dynamic chart config. |
| `document.cookie` | Sidebar UI preference cookie only. | Low risk. |
| Hardcoded secrets | No actual secret values printed or found in source review. `.env` values were not displayed. | ✅ |
| Console logs | Production app includes several `console.error/warn/log` statements. | ⚠️ Remove nonessential logs before launch. |

## 12. Build / Lint / Typecheck Results

| Command | Result | Notes |
| --- | --- | --- |
| `npx tsc --noEmit` | ✅ Pass | Exit 0. |
| `npm run build` | ✅ Pass | Vite built successfully; stale browser data warnings. |
| `npm run lint` | ⛔ Fail | 7 errors, 7 warnings. Errors in `EnhancedNavbar`, `useCurrency`, `db`, `submissionService`. |
| `npm run typecheck --if-present` | ✅ No-op/pass | No script exists in `package.json`; command exited 0 due `--if-present`. |
| `npm run test --if-present` | ✅ No-op/pass | No test script exists in `package.json`; command exited 0 due `--if-present`. |
| `npm audit --audit-level=low` | ⛔ Fail | 12 vulnerabilities: 9 high, 3 moderate. |
| `npm run dev -- --host 127.0.0.1 --port 8080` | ⛔ Fail | Could not bind 8080: permission denied/port unavailable. |
| `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` | ✅ Pass | Dev server started; stopped after HTTP smoke test. |
| HTTP route smoke test | ⚠️ Partial pass | All tested URLs returned Vite SPA shell HTTP 200. This does not prove React route render correctness. |
| `where.exe supabase` | ⛔ Not installed | Supabase CLI not found. |
| `supabase db lint` | Not run | CLI unavailable. |
| `supabase migration list` | Not run | CLI unavailable. |
| `supabase db diff` | Not run | CLI unavailable. |
| Dist service-key scan | ✅ Pass | No service-role/service-key matches in `dist`. |

## 13. Performance Notes

Build output highlights:
- Largest JS chunk: `dist/assets/index-DTZ7Th1U.js` at 314.49 kB raw / 89.75 kB gzip.
- CSS bundle: `dist/assets/index-BqSoitm4.css` at 214.65 kB raw / 31.57 kB gzip.
- `react-vendor`: 163.22 kB raw / 53.52 kB gzip.
- `EnhancedNavbar`: 140.39 kB raw / 36.62 kB gzip.
- `AdminDashboard`: 136.18 kB raw / 31.69 kB gzip.
- `animation-vendor`: 123.35 kB raw / 41.07 kB gzip.
- `Index`: 75.50 kB raw / 23.06 kB gzip.
- `SignUpPage`: 73.83 kB raw / 19.70 kB gzip.

Good progress:
- Main route components are lazy-loaded.
- Live preview tool and several studio tabs/QRCode are lazy-loaded.
- Hero animation count is reduced and mousemove is requestAnimationFrame-throttled.
- Floating dock timers/listeners have cleanup.

Remaining performance risks:
- Initial app still ships a 314 kB main chunk plus a large CSS file.
- `EnhancedNavbar` includes `PricingModal` and `FloatingDock`, making navigation expensive.
- AI feature code/env remains even though the chat component is not mounted.
- Browser data warnings should be resolved during dependency upgrades.

## 14. Manual Supabase Steps Still Required

These are mandatory before auth/profile/admin production launch:

1. Confirm no dangerous frontend env vars in hosting: remove any `VITE_*_SERVICE_*`; remove or backend-proxy `VITE_AI_*` API keys.
2. Apply all Supabase migrations, especially:
   - `20260507120000_add_clients_role_and_is_admin.sql`
   - `20260507120100_enable_rls_and_policies.sql`
   - `20260507120200_cleanup_plaintext_security_answer.sql`
   - `20260507120300_storage_rls_client_assets.sql`
3. Promote the master admin by role after the admin auth user/client row exists.
4. Create `client-assets` bucket, set it private, and verify storage policies.
5. Fix frontend avatar upload path to match storage RLS before profile uploads launch.
6. Deploy `admin-create-client` Edge Function or keep manual Supabase invites as the only admin-created login path.
7. Keep `verify-security-answer` disabled or deploy a server-side verifier; never verify answers in browser.
8. Run Supabase CLI checks from a machine with CLI access: `supabase db lint`, `supabase migration list`, `supabase db diff`.
9. Run three-session smoke tests: anonymous, normal client, promoted admin.
10. Redeploy after dependency/security fixes, then retest `dist` for service-role/service-key strings.

## 15. Final Launch Decision

1. Can we launch the public marketing site now?  
   ⚠️ Only as a limited/conditional launch. It builds and serves, but high dependency vulnerabilities, failing lint, missing legal pages, placeholder OG image, and incomplete browser QA should be fixed first for a proper production launch.

2. Can we launch auth pages now?  
   ⛔ No. Frontend behavior is improved, but production Supabase RLS/application and real auth smoke tests are not confirmed.

3. Can we launch client profile now?  
   ⛔ No. It depends on RLS, private storage bucket verification, and upload path fixes.

4. Can we launch admin dashboard now?  
   ⛔ No. Frontend admin gates are UX-only until backend RLS/admin role is applied and tested.

5. What exact steps remain before full production?  
   Fix `npm audit` high vulnerabilities, fix lint, add legal pages and real OG image, remove/backend-proxy browser AI keys, apply/test Supabase migrations, promote admin, create private storage bucket, align upload paths, run Supabase CLI checks, run anon/client/admin browser smoke tests, and redeploy.

Public Marketing Site: ⚠️  
Auth Pages: ⛔  
Client Profile: ⛔  
Admin Dashboard: ⛔  
Full Production Launch: ⛔
