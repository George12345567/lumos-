# Auth Audit Report — Lumos Website

## 1. Executive Summary
النظام الحالي للـ authentication والـ client portal غير جاهز للإنتاج. أغلب تدفّق auth يعتمد على Supabase، لكن `supabaseClient` يعمل كـ stub عند غياب env، ما يجعل login/signup/reset غير فعّالة فعليًا. يوجد bypass واضح للـ admin عبر URL param و `localStorage`. كما توجد مشكلات أمنية جوهرية في تخزين البيانات الحساسة وفي منطق حماية المسارات والـ admin.

## 2. Files Inspected
- `src/App.tsx`
- `src/context/AuthContext.tsx`
- `src/components/shared/AuthRoutes.tsx`
- `src/services/authService.ts`
- `src/lib/supabaseClient.ts`
- `src/services/profileService.ts`
- `src/services/clientPortalService.ts`
- `src/services/adminDashboardService.ts`
- `src/pages/LogInPage.tsx`
- `src/pages/SignUpPage.tsx`
- `src/pages/ForgotPasswordPage.tsx`
- `src/pages/ResetPasswordPage.tsx`
- `src/features/client-profile/ClientProfilePage.tsx`
- `src/features/client-profile/ClientProfileTestView.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/lib/constants.ts`
- `src/lib/validation.ts`
- `src/components/layout/EnhancedNavbar.tsx`
- `src/components/layout/FloatingDock.tsx`
- `src/components/layout/UserMenu.tsx`
- `src/hooks/useAvailabilityCheck.ts`
- `src/features/client-profile/hooks/useClientProfile.ts`
- `src/features/client-profile/hooks/usePortalData.ts`
- `src/features/client-profile/hooks/useProfileMutation.ts`
- `src/features/client-profile/hooks/useOrders.ts`
- `src/features/client-profile/hooks/useNotifications.ts`
- `src/features/client-profile/mockData.ts`
- `src/services/orderService.ts`
- `src/main.tsx`
- `src/services/notificationService.ts`
- `src/services/designService.ts`
- `src/config/env.ts`
- `src/features/client-profile/adapters.ts`
- `src/features/client-profile/constants.ts`
- `src/features/client-profile/sections/AccountSection.tsx`
- `src/features/client-profile/sections/MessagesSection.tsx`
- `src/features/client-profile/sections/OverviewSection.tsx`
- `src/features/client-profile/sections/OrderTrackingSection.tsx`
- `src/features/client-profile/sections/BrandStudioSection.tsx`
- `src/types/dashboard.ts`
- `src/types/index.ts`

ملفات متوقعة لم يتم العثور عليها أثناء المراجعة:
- `src/hooks/useAuth.ts`

## 3. Current Auth Flow Map
**Login**
- صفحة `LogInPage` تستدعي `authService.login()` عبر `AuthContext.login`.
- إذا كانت `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` غير موجودة: `supabaseClient` يعمل كـ stub → `signInWithPassword` يرجّع خطأ "Auth not configured" → login يفشل دائمًا.

**Signup**
- صفحة `SignUpPage` تستدعي `authService.signup()`.
- في حالة stub، `signUp` يفشل دائمًا.
- في الحالة الصحيحة، يتم إنشاء user عبر Supabase ثم upsert في جدول `clients`.

**Logout**
- `AuthContext.logout()` → `authService.logout()` → `supabase.auth.signOut()`.
- لا يوجد تنظيف إضافي للـ cached data في React Query أو local state.

**Session Loading**
- `AuthContext` ينفّذ `authService.getSession()` ثم `refreshProfileWithRetry()`.
- إذا فشل `getClientProfile` يُعتبر المستخدم غير authenticated حتى لو كانت session موجودة.

**Protected Pages**
- `ProtectedRoute` يحمي `/profile` بالاعتماد على `isAuthenticated` من `AuthContext`.
- `AdminRoute` يحمي `/lumos-admin` بالاعتماد على `isAdmin` (email === `VITE_MASTER_ADMIN_EMAIL`).

**Profile Loading**
- `ClientProfilePage` يعتمد على `useClientProfile()` → `profileService.getProfile()` → Supabase.
- في وضع stub يتم إرجاع `null` وتظهر بيانات افتراضية أو loading دائمًا حسب الحالة.

**Redirects**
- بعد login يتم التوجيه إلى `/` فقط، بدون حفظ المسار الأصلي.
- صفحات Login/Signup تستخدم `GuestRoute` للمنع عند auth.

**ملاحظة**: يوجد مسار `/profile-preview` غير محمي يستخدم mock data كامل (`ClientProfileTestView`).

## 4. Critical Issues — P0
**1) Admin auth bypass via URL/localStorage**
- Severity: P0
- File path: `src/pages/AdminDashboard.tsx`
- Problem: وجود bypass كامل للـ admin عبر `?dev=true` أو `localStorage` key (`lumos_admin_dev`).
- Why it matters: أي مستخدم يمكنه الوصول للوحة الإدارة بدون أي تحقق حقيقي.
- Suggested fix: إزالة bypass تمامًا، واعتماد تحقق server-side (Supabase RLS + JWT claims أو Edge Functions).
- Exact area/function/component affected: `checkAuth` داخل `useEffect` (الأسطر ~1172-1205).

**2) Auth system effectively disabled when env is missing**
- Severity: P0
- File path: `src/lib/supabaseClient.ts`, `src/services/authService.ts`
- Problem: عند غياب `VITE_SUPABASE_URL` أو `VITE_SUPABASE_ANON_KEY` يتم إنشاء stub يعيد `session = null` وكل عمليات auth تفشل.
- Why it matters: login/signup/reset مستحيلين، و`ProtectedRoute` سيعيد التوجيه دائمًا.
- Suggested fix: منع التشغيل في production بدون env صحيحة، وعرض رسالة واضحة أو fallback محسوب.
- Exact area/function/component affected: `supabase` initialization block، و`authService.login/signup/getSession`.

**3) Frontend-only authorization for admin**
- Severity: P0
- File path: `src/context/AuthContext.tsx`, `src/components/shared/AuthRoutes.tsx`, `src/pages/AdminDashboard.tsx`
- Problem: اعتماد كامل على email مقارنة بـ env/hardcoded بدون server enforcement.
- Why it matters: يمكن تجاوز الحماية بتلاعب في client أو باستخدام session مزيف إن لم تكن RLS قوية.
- Suggested fix: تطبيق سياسات RLS صارمة + claims للـ admin على مستوى Supabase، واستخدام Edge Functions للتحقق.
- Exact area/function/component affected: `isAdmin` في `AuthContext`, و`AdminRoute`, و`checkAuth` في `AdminDashboard`.

**4) Security questions stored in plaintext**
- Severity: P0
- File path: `src/services/authService.ts`, `src/pages/AdminDashboard.tsx`
- Problem: `security_answer` يتم تخزينه نصًا داخل `package_details`، كما يتم التعامل مع `security_answer_hash` بطريقة تسمح باستنتاج الإجابة.
- Why it matters: تسريب قاعدة البيانات أو logs يفضح إجابات أمان حساسة.
- Suggested fix: تخزين hash فقط وعدم حفظ النص، وتدوير/تحديث schema.
- Exact area/function/component affected: `buildPackageDetails()` و`verifySecurityQuestion()`؛ وأي إنشاء/تعديل من الـ admin.

## 5. High Priority Issues — P1
**1) Admin email hardcoded in bundle**
- Severity: P1
- File path: `src/pages/AdminDashboard.tsx`
- Problem: `ADMIN_EMAIL` ثابت داخل الواجهة.
- Why it matters: كشف هوية admin والمخاطرة باستهداف الحساب. كما يسبب تضاربًا مع `VITE_MASTER_ADMIN_EMAIL`.
- Suggested fix: نقل القيمة إلى env + مقارنة claims server-side.
- Exact area/function/component affected: `const ADMIN_EMAIL = ...`.

**2) Profile update success check is wrong**
- Severity: P1
- File path: `src/features/client-profile/hooks/useProfileMutation.ts`
- Problem: `profileService.updateProfile()` يرجع `{ success: boolean }` لكن الكود يتعامل معه كـ boolean؛ `if (!ok)` لن يفشل أبدًا لأن object truthy.
- Why it matters: UI قد تعتقد أن الحفظ نجح حتى عند الفشل.
- Suggested fix: التحقق من `result.success` صراحة.
- Exact area/function/component affected: `flush()` داخل `useProfileMutation`.

**3) Admin dashboard client creation doesn’t create auth user**
- Severity: P1
- File path: `src/pages/AdminDashboard.tsx`
- Problem: إنشاء client يتم داخل جدول `clients` فقط بدون إنشاء user في Supabase Auth، وحقول password غير مستخدمة فعليًا.
- Why it matters: حسابات admin-created غير قابلة لتسجيل الدخول، وهذا يخلق تضاربًا في البيانات وسلوك مضلل.
- Suggested fix: إنشاء user في Supabase Auth عبر server/Edge Function وربط `clients.id` بـ user id.
- Exact area/function/component affected: `createClient()` و`buildClientPayload()`.

**4) Session presence without profile = forced logout**
- Severity: P1
- File path: `src/context/AuthContext.tsx`
- Problem: إذا فشل `getClientProfile()` يتم اعتباره غير authenticated حتى لو session صحيحة.
- Why it matters: users قد يفقدون الوصول بسبب خطأ مؤقت في الـ profile lookup.
- Suggested fix: فصل auth state عن profile state؛ ضع fallback لعرض رسالة خطأ بدل redirect فوري.
- Exact area/function/component affected: `syncAuthenticatedState()` و`refreshProfileWithRetry()`.

## 6. Medium Priority Issues — P2
**1) LocalStorage token exposure**
- Severity: P2
- File path: `src/lib/supabaseClient.ts`
- Problem: `persistSession: true` يعني tokens في localStorage، ما يزيد خطر XSS.
- Why it matters: أي XSS يمكنه سرقة tokens.
- Suggested fix: استخدام `persistSession: false` مع HttpOnly cookies عبر server أو حل بديل.
- Exact area/function/component affected: Supabase client init.

**2) No validation on client profile edits**
- Severity: P2
- File path: `src/features/client-profile/sections/AccountSection.tsx`, `src/features/client-profile/sections/BrandStudioSection.tsx`
- Problem: تحديث email/phone/website بدون validation أو normalization.
- Why it matters: بيانات غير صحيحة قد تدخل DB وتكسر workflows لاحقًا.
- Suggested fix: تطبيق zod schema مشابه لـ signup أو التحقق داخل `profileService`.
- Exact area/function/component affected: `EditableFieldInline` وحقول الحساب.

**3) Misleading availability check in stub mode**
- Severity: P2
- File path: `src/hooks/useAvailabilityCheck.ts`, `src/services/authService.ts`, `src/lib/supabaseClient.ts`
- Problem: في stub mode, checks ترجع `unknown` ولا تمنع التقدم → signup flow يبدو شغال بينما backend غير مهيأ.
- Why it matters: UX مضلل ويؤدي لفشل متأخر.
- Suggested fix: إذا `supabase` stub → أوقف checks وأظهر رسالة "Auth not configured".
- Exact area/function/component affected: `checkUsernameAvailable/checkEmailAvailable/checkPhoneAvailable`.

**4) Inconsistent admin identity check**
- Severity: P2
- File path: `src/context/AuthContext.tsx`, `src/pages/AdminDashboard.tsx`
- Problem: `VITE_MASTER_ADMIN_EMAIL` vs `ADMIN_EMAIL` (hardcoded) قد لا تتطابق.
- Why it matters: AdminRoute قد يسمح/يمنع بينما الصفحة نفسها تتصرف بعكس ذلك.
- Suggested fix: توحيد المصدر واستخدام claim من السيرفر.
- Exact area/function/component affected: `isAdmin` و`ADMIN_EMAIL`.

**5) Client profile preview route exposes full mock portal**
- Severity: P2
- File path: `src/App.tsx`, `src/features/client-profile/ClientProfileTestView.tsx`
- Problem: `/profile-preview` متاح للجميع ويعرض بيانات mock كاملة.
- Why it matters: قد يُفهم كبيانات حقيقية، ويمكن أن يُستغل في social engineering.
- Suggested fix: إزالته من prod أو حماية بالـ feature flag.
- Exact area/function/component affected: route `/profile-preview`.

## 7. Low Priority Issues — P3
**1) Missing return-to redirect after login**
- Severity: P3
- File path: `src/components/shared/AuthRoutes.tsx`, `src/pages/LogInPage.tsx`
- Problem: بعد login يتم التوجيه دائمًا لـ `/`، ولا يتم حفظ المسار الأصلي.
- Why it matters: UX ضعيف للمستخدم الذي دخل عبر صفحة محمية.
- Suggested fix: دعم `redirectTo` في query params.
- Exact area/function/component affected: `ProtectedRoute` + `LogInPage`.

**2) Duplicate type name `Order` in dashboard types**
- Severity: P3
- File path: `src/types/dashboard.ts`
- Problem: تعريفان لـ `Order` في نفس الملف.
- Why it matters: يسبب لبس في typing ويزيد مخاطر bugs في الاستخدام.
- Suggested fix: إعادة تسمية أحد التعريفين أو دمجهما.
- Exact area/function/component affected: `export interface Order` (مرتين).

**3) Reset password route not guarded**
- Severity: P3
- File path: `src/App.tsx`
- Problem: `/reset-password` ليس داخل `GuestRoute`.
- Why it matters: مستخدم مسجل يمكنه فتح flow غير مناسب، UX فقط.
- Suggested fix: حماية بالـ GuestRoute أو فحص session.
- Exact area/function/component affected: Route definition in `App.tsx`.

## 8. Missing Auth Features
- Password reset success flow يعتمد على Supabase session، لكنه يفشل بالكامل في stub mode.
- Email verification flow يعتمد على Supabase ولا يوجد fallback واضح عند غياب env.
- Server-side role-based access (RLS + JWT claims) غير مُثبت في الكود.
- Session refresh/rotation verification على السيرفر غير واضح.
- Logout cleanup (clearing cached data, query cache) غير موجود.
- Multi-factor authentication غير موجود.
- Rate limiting / captcha غير موجود في UI أو services.

## 9. Broken / Suspicious Routes
| Route | Status | Page/File | Problem | Recommendation |
| --- | --- | --- | --- | --- |
| `/client-login` | موجود | `src/pages/LogInPage.tsx` | يعتمد على Supabase؛ يفشل في stub mode | عرض رسالة "Auth not configured" أو تعطيل الزر | 
| `/client-signup` | موجود | `src/pages/SignUpPage.tsx` | signup يفشل في stub mode؛ UX مضلل | نفس التوصية أعلاه | 
| `/forgot-password` | موجود | `src/pages/ForgotPasswordPage.tsx` | reset email يفشل في stub mode | إظهار حالة واضحة أو تعطيل | 
| `/reset-password` | موجود | `src/pages/ResetPasswordPage.tsx` | يعتمد على session من Supabase؛ غالبًا invalid | حماية بـ GuestRoute + توضيح | 
| `/profile` | موجود (Protected) | `src/features/client-profile/ClientProfilePage.tsx` | لا يعمل إذا auth غير مهيأ | منع فتحه بدون تهيئة auth | 
| `/profile-preview` | موجود | `src/features/client-profile/ClientProfileTestView.tsx` | صفحة mock مفتوحة للجميع | إزالته في production أو حماية | 
| `/lumos-admin` | موجود (AdminRoute) | `src/pages/AdminDashboard.tsx` | bypass بـ `?dev=true` و localStorage | إزالة الباك دور | 
| `/clients/dashboard` | غير موجود | `src/lib/constants.ts` | مسار معرّف بدون route | إزالة أو إضافة route | 

## 10. Security Findings
| Risk | Severity | File | Explanation | Fix |
| --- | --- | --- | --- | --- |
| Admin bypass via `?dev=true` | P0 | `src/pages/AdminDashboard.tsx` | يسمح لأي مستخدم بالدخول للوحة الإدارة | إزالة الباك دور + تحقق server-side | 
| Auth disabled when env missing | P0 | `src/lib/supabaseClient.ts` | كل auth calls stubbed | فشل build بدون env أو fallback صريح | 
| Security answers stored plaintext | P0 | `src/services/authService.ts` | تخزين إجابة أمان كـ نص | تخزين hash فقط + re-migrate | 
| Frontend-only admin check | P0 | `src/components/shared/AuthRoutes.tsx` | لا توجد حماية server-side | RLS/claims | 
| Hardcoded admin email | P1 | `src/pages/AdminDashboard.tsx` | يكشف admin identity في bundle | استخدام env + server validation | 
| LocalStorage tokens | P2 | `src/lib/supabaseClient.ts` | tokens معرضة لـ XSS | استخدام HttpOnly cookies | 
| Profile update without validation | P2 | `src/features/client-profile/sections/AccountSection.tsx` | بيانات غير موثوقة | validate + sanitize | 
| Mock profile preview accessible | P2 | `src/features/client-profile/ClientProfileTestView.tsx` | قد يضلل أو يُستغل | إزالته أو feature flag | 

## 11. UX Findings
| Area | Problem | Impact | Suggested Fix |
| --- | --- | --- | --- |
| Login | لا يوجد redirect للصفحة المطلوبة | user يرجع لـ `/` دائمًا | حفظ `redirectTo` query param | 
| Signup | availability check لا يعكس الحقيقة في stub mode | UX مضلل | إظهار رسالة عدم تهيئة backend | 
| Reset password | غالبًا يظهر "Invalid Link" | user يفشل بدون سبب واضح | عرض حالة backend + توجيه واضح | 
| Admin access | رسالة رفض غير واضحة (redirect إلى `/`) | UX سيئ للمستخدم الشرعي | صفحة 403 | 
| Client profile | لا توجد empty/error state واضحة عند فشل profile fetch | user يرى loading مستمر | إضافة error/empty UI | 

## 12. TypeScript / Build / Lint Results
لم أتمكن من تشغيل الأوامر التالية لأن أدوات التشغيل غير متاحة في بيئة المراجعة:
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npx tsc --noEmit`

إذا رغبت، شغّلها محليًا وشارك النتائج لأضيفها للتقرير.

## 13. Recommended Fix Plan
1. **Must fix before launch**
   - إزالة admin bypass (`?dev=true` و `localStorage`).
   - تفعيل Supabase الحقيقي أو منع التشغيل بدون env.
   - تطبيق RLS/claims للتحقق من roles.
   - إزالة تخزين `security_answer` النصي واستبداله بـ hash فقط.
2. **Should fix soon**
   - توحيد admin identity (env واحدة) وإزالة hardcoded.
   - إصلاح `useProfileMutation` للتحقق من `success`.
   - إضافة validation للـ profile updates.
3. **Nice to have later**
   - تحسين UX للـ redirects و403 pages.
   - إزالة أو حماية `/profile-preview`.
   - تنظيف type duplication في `src/types/dashboard.ts`.

## 14. Final Verdict
- **Is the auth system production-ready?** لا.
- **Is the client profile production-ready?** لا، يعتمد على backend غير مهيأ ويحتوي على أخطاء حفظ.
- **Can these pages be publicly launched?** لا، خصوصًا admin والـ profile.
- **Minimum required before launch:** تفعيل Supabase بشكل صحيح، إزالة bypass، تطبيق RLS/roles، وإصلاح تخزين البيانات الحساسة ونجاح التحديثات.
