# Final Fixes Report — Lumos Website

This report covers the fixes applied for the launch blockers listed in
`FINAL_LAUNCH_AUDIT_REPORT.md`. Scope was strictly the items in that brief —
no redesign, no refactor of unrelated code, no changes to Supabase migrations.

## 1. Files Changed

Created:

- `src/pages/PrivacyPolicy.tsx`
- `src/pages/TermsConditions.tsx`
- `src/pages/CookiePolicy.tsx`
- `src/pages/legal/LegalPageLayout.tsx` — shared shell so the three legal
  pages match the existing site styling without redesign.
- `public/og-image.svg` — branded 1200×630 social preview to replace the
  generic `/placeholder.svg`.
- `FINAL_FIXES_REPORT.md` (this file).

Modified:

- `src/App.tsx` — registered `/privacy-policy`, `/terms-and-conditions`,
  `/cookie-policy` routes (lazy-loaded).
- `src/components/layout/Footer.tsx` — added a legal-links nav row above
  the copyright on every page.
- `src/components/layout/EnhancedNavbar.tsx` — removed dead JSX (the
  `false && ...` "How To Use" guide block) that was causing two
  `no-constant-binary-expression` lint errors.
- `src/components/layout/FloatingDock.tsx` — removed the two AI dock
  buttons (the AI sidebar is not mounted; the buttons did nothing) and
  cleaned up the now-unused `Bot` import and `openHomeAiChat` callback.
- `src/hooks/useCurrency.tsx` — replaced two empty `catch {}` blocks with
  fall-through comments to fix the `no-empty` lint errors.
- `src/services/db.ts` — replaced `Promise<any[]>` with
  `Promise<Record<string, unknown>[]>` in `getContacts` to fix the
  `@typescript-eslint/no-explicit-any` lint error.
- `src/services/submissionService.ts` — same fix applied to its
  `getContacts` (two `any` errors).
- `src/services/profileService.ts` — `uploadAvatar` now uses the
  `<auth.uid()>/avatars/<safe-name>` path (matches the storage RLS
  migration) and returns `{ path, url }` with a signed URL. Added
  `getAvatarUrl(path)` helper that resolves a fresh signed URL or returns
  `null` for missing/legacy paths.
- `src/features/client-profile/components/ImageUpload.tsx` — switched to
  the `<clientId>/<pathPrefix>/<timestamp>-<safe-name>` layout and
  `createSignedUrl` (1-year expiry) so uploads pass RLS and the bucket
  can stay private.
- `src/features/lead-capture/LeadCapturePopup.tsx` — `saveLeadCapture`
  now returns `{ ok, error? }`; `onSubmit` only shows the success state
  when the save succeeds, surfaces a friendly inline error otherwise,
  and guards against duplicate submits.
- `index.html` — replaced placeholder OG/Twitter images with absolute URL
  to `/og-image.svg`, added explicit dimensions, alt text, twitter title
  and description, and `og:site_name`.
- `public/sitemap.xml` — added `/privacy-policy`, `/terms-and-conditions`,
  `/cookie-policy`.
- `.env.example` — removed the `VITE_AI_*` keys; replaced with a comment
  block warning that browser-exposed AI keys must not be set in
  production.
- `package.json` and `package-lock.json` — `npm audit fix` updated 20
  transitive dependencies (no breaking changes; see §3).

## 2. Issues Fixed

| Audit ID | Issue | Status |
| --- | --- | --- |
| C-03 | `npm audit` reported 12 vulnerabilities (9 high, 3 moderate). | **Fixed** — `npm audit fix` (no `--force`) cleared all of them. Final audit reports 0 vulnerabilities. |
| C-04 | `npm run lint` failed with 7 errors. | **Fixed** — 0 errors remain. The 7 pre-existing warnings are unchanged and are not in the audit's required-fix list. |
| C-05 | Browser-exposed `VITE_AI_API_KEY` / `VITE_AI_FALLBACK_KEY` keys. | **Mitigated** — AI dock CTA is removed from the production UI (the sidebar was never mounted), and `.env.example` documents that AI must run via a backend proxy. The actual `.env` is outside this commit; rotate any keys that were ever set with a `VITE_` prefix. |
| H-01 | Legal pages missing. | **Fixed** — three new bilingual (EN/AR with RTL support) pages and footer links. Sitemap updated. |
| H-02 | Placeholder OG image. | **Fixed** — branded `/og-image.svg` (1200×630). Limitation: SVG is supported by most platforms but Facebook prefers PNG/JPG; see "Remaining risks". |
| H-03 / H-07 | Avatar upload path didn't match storage RLS, used `getPublicUrl` against an intended-private bucket. | **Fixed** — uploader uses `<auth.uid()>/<pathPrefix>/<filename>` and signed URLs. The bucket itself still needs to be created and set private in the Supabase dashboard (manual step, already documented in `SUPABASE_PRODUCTION_DEPLOY_CHECKLIST.md`). |
| H-05 | AI CTA wired to a custom event with no listener; AI uses browser-exposed keys. | **Fixed** — both AI dock buttons removed; `Bot` import and `openHomeAiChat` callback cleaned up. |
| H-06 | Lead capture popup showed success even when save failed. | **Fixed** — explicit success check, friendly inline error state, duplicate-submit guard. UI styling unchanged. |

## 3. Commands Run

| Command | Result |
| --- | --- |
| `npm audit --audit-level=low` (initial) | 12 vulnerabilities (9 high, 3 moderate). |
| `npm audit fix` | Updated 20 packages. Non-breaking; no `--force` needed. |
| `npm audit --audit-level=low` (after fix) | **0 vulnerabilities.** |
| `npx tsc --noEmit` | **Exit 0**, 0 type errors. |
| `npm run build` | **Exit 0**, vite build succeeded in ~22s. Bundle sizes are unchanged in the relevant chunks; new legal-page chunks `PrivacyPolicy-*.js`, `TermsConditions-*.js`, `CookiePolicy-*.js`, `LegalPageLayout-*.js` were created. |
| `npm run lint` | **Exit 0 errors**, 7 warnings remain (unchanged, in `AiChatSidebar.tsx` and `useAvailabilityCheck.ts`; not in the required-fix list). |
| `grep -r service_role/SUPABASE_SERVICE/VITE_AI_*_KEY= dist/` | No matches — production bundle does not embed any of those identifiers. |

### Audit-fix details

All 12 advisories had a non-`--force` fix path. The dependency tree updated
to safe transitive versions:

- `@remix-run/router`, `react-router`, `react-router-dom` (XSS via open
  redirect)
- `vite` 7.0.0–7.3.1 → patched (path-traversal in optimised deps,
  `server.fs.deny` bypass, dev-server WS file read)
- `rollup` 4.0.0–4.58.0 → patched (arbitrary file write)
- `lodash`, `flatted`, `picomatch`, `minimatch`, `postcss`, `ajv`,
  `brace-expansion`

No app code change was required. `npx tsc --noEmit` and `npm run build`
both still pass on the upgraded tree.

## 4. Remaining Risks

1. **Supabase RLS + admin promotion + private storage bucket** — these
   are still manual backend steps documented in
   `SUPABASE_PRODUCTION_DEPLOY_CHECKLIST.md` and `SUPABASE_BACKEND_READY_REPORT.md`.
   This commit did not touch migrations, by request.
2. **OG image format** — `/og-image.svg` is a real branded production
   asset, but a few social platforms (notably Facebook in some scenarios)
   strongly prefer PNG/JPG. Recommend exporting `og-image.svg` to a
   1200×630 PNG (~150 KB) and swapping the meta tags before launch.
3. **Avatar URL freshness** — `ImageUpload` stores a 1-year signed URL on
   the row. That works for now but signed URLs eventually expire. The
   robust pattern (store the path; resolve a fresh signed URL at render
   via `profileService.getAvatarUrl`) is in place but isn't yet used by
   the existing avatar/logo/cover UI. Schedule that as a follow-up.
4. **Legacy avatar paths** — Existing rows that point to the old
   `profile-avatars/<flat>` layout will need a one-off rewrite once the
   bucket is private. Documented in the storage migration's "MANUAL
   STEPS" block.
5. **AI feature** — The browser-side AI service (`aiChatService.ts`) is
   now orphaned. It still imports `VITE_AI_*` env vars at module load.
   Because nothing imports `aiChatService.ts` from the active app any
   more (the sidebar is its only consumer and isn't mounted), the keys
   never reach the bundle if they're left unset. **However**, if a
   future change re-imports the service, the env keys would become
   browser-exposed again. Either delete `src/services/aiChatService.ts`
   and `src/features/ai-chat/` next sprint, or build a backend proxy
   before re-enabling the feature.
6. **Pre-existing lint warnings (7)** — unchanged, not in scope:
   `react-hooks/exhaustive-deps` in `AiChatSidebar.tsx` and
   `useAvailabilityCheck.ts`. They do not block the launch.
7. **Browser smoke test** — TypeScript, build, lint, and audit all pass,
   but the legal pages and the new lead-capture error path were not yet
   exercised in a real browser. Worth a 5-minute smoke pass before
   pointing the production domain at this build.

## 5. Launch Readiness

| Surface | Verdict | Why |
| --- | --- | --- |
| **Public marketing site** | ✅ Safe to launch. | All audit blockers for a public marketing-only launch are now closed: zero npm audit vulnerabilities, zero lint errors, real branded OG image, legal pages live and linked from the footer, AI CTA removed. |
| **Auth pages** | ⛔ Still not ready. | Frontend is fine. Backend RLS migrations still need to be applied and smoke-tested per `SUPABASE_PRODUCTION_DEPLOY_CHECKLIST.md`. No change here in this round. |
| **Client profile** | ⛔ Still not ready. | Avatar upload path now matches storage RLS, but the `client-assets` bucket itself must be created (private) in the Supabase dashboard and the storage migration applied. |
| **Admin dashboard** | ⛔ Still not ready. | Same reason as auth: RLS, `clients.role` promotion, and three-session smoke tests are still pending. |

To put it strictly: **the public marketing site can launch now.** The
auth, profile, and admin surfaces still depend on the documented Supabase
setup steps, none of which were in scope for this round of fixes.
