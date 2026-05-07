import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { LegalPageLayout } from "./legal/LegalPageLayout";

const LAST_UPDATED = "2026-05-07";

export default function CookiePolicy() {
  const { isArabic, t } = useLanguage();

  useEffect(() => {
    document.title = isArabic
      ? "سياسة الكوكيز — Lumos"
      : "Cookie Policy — Lumos";
  }, [isArabic]);

  return (
    <LegalPageLayout
      title={t("سياسة الكوكيز", "Cookie Policy")}
      lastUpdated={LAST_UPDATED}
    >
      {isArabic ? <ArabicContent /> : <EnglishContent />}
    </LegalPageLayout>
  );
}

function EnglishContent() {
  return (
    <>
      <section>
        <h2>1. What this policy covers</h2>
        <p>
          This Cookie Policy explains the small set of cookies and browser-storage items
          (localStorage / sessionStorage) the Lumos website uses, what each one is for,
          and how to control them. It complements our{" "}
          <a href="/privacy-policy">Privacy Policy</a>.
        </p>
      </section>

      <section>
        <h2>2. Cookies we set</h2>
        <p>
          The marketing site itself does <strong>not</strong> set advertising cookies and
          does not embed third-party trackers (no Google Analytics, no Meta Pixel, no ad
          retargeting). The only HTTP cookie the app stores is a UI-preference cookie
          used by the sidebar component to remember whether the sidebar is expanded or
          collapsed. It is first-party, does not contain personal data, and expires after
          a few days.
        </p>
      </section>

      <section>
        <h2>3. Browser storage we use</h2>
        <p>
          Most of what people call &quot;cookies&quot; on this site is actually
          first-party browser storage. We use it to keep the site fast and to remember
          UX choices. None of these are sold or shared.
        </p>
        <ul>
          <li>
            <strong>Authentication session</strong> (localStorage, key prefix
            <code>sb-…-auth-token</code>, managed by Supabase) — keeps you signed in to
            the client portal. Cleared automatically on sign-out.
          </li>
          <li>
            <strong>Pricing modal draft</strong> (localStorage) — saves a pricing request
            you started so it isn&apos;t lost on reload. May contain name / phone / email
            and selected services. Auto-expires after 30 days; you can clear it any time
            from your browser&apos;s site settings.
          </li>
          <li>
            <strong>Geolocation/currency cache</strong> (localStorage) — stores the
            country/currency we detected for you so prices render quickly. Refreshed
            every 24 hours.
          </li>
          <li>
            <strong>Language preference</strong> (localStorage,
            <code>lumos.language</code>) — remembers Arabic / English.
          </li>
          <li>
            <strong>Theme preference</strong> (localStorage) — remembers dark/light mode.
          </li>
          <li>
            <strong>UI hint flags</strong> (sessionStorage) — remembers that you have
            already seen the navigation/dock guides for the current tab.
          </li>
          <li>
            <strong>Visit counter</strong> (localStorage) — a simple per-browser visit
            counter used internally to time when to show small UX prompts. The number
            never leaves your device.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. How to control or delete this data</h2>
        <ul>
          <li>
            <strong>Sign out</strong> from the client portal to clear the Supabase
            session entry.
          </li>
          <li>
            <strong>Clear site data</strong> in your browser settings (Chrome, Edge,
            Safari, Firefox all have a per-site clear option) to remove every item
            listed above at once.
          </li>
          <li>
            <strong>Use private/incognito mode</strong> if you want a session that does
            not persist between visits.
          </li>
          <li>
            <strong>Email us</strong> at{" "}
            <a href="mailto:contact@getlumos.studio">contact@getlumos.studio</a> if you
            want a specific item deleted server-side too.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Third parties</h2>
        <p>
          Some Lumos services rely on Supabase (database, auth, storage). Supabase may
          set its own technical cookies on requests made directly to its API (for
          session refresh, for example). Those are described in{" "}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
            Supabase&apos;s privacy notice
          </a>
          .
        </p>
        <p>
          If a future feature requires an external analytics or chat provider, we will
          update this page and prompt you for consent first.
        </p>
      </section>

      <section>
        <h2>6. Changes</h2>
        <p>
          We may update this Cookie Policy. The &quot;Last updated&quot; date at the top
          will reflect the most recent change. If we ever add tracking that requires
          consent, this page will explain it before tracking starts.
        </p>
      </section>
    </>
  );
}

function ArabicContent() {
  return (
    <>
      <section>
        <h2>1. ماذا تغطّي هذه السياسة</h2>
        <p>
          توضّح هذه السياسة عناصر التخزين البسيطة التي يستخدمها موقع Lumos في متصفحك
          (الكوكيز و localStorage و sessionStorage)، وفائدة كل عنصر، وكيف تتحكّم بها. هي
          مكمّلة لـ <a href="/privacy-policy">سياسة الخصوصية</a>.
        </p>
      </section>

      <section>
        <h2>2. الكوكيز التي يضعها الموقع</h2>
        <p>
          الموقع التسويقي <strong>لا يضع</strong> كوكيز إعلانية ولا يحمّل أدوات تتبّع
          خارجية (لا Google Analytics ولا Meta Pixel ولا إعادة استهداف إعلاني). الكوكي
          الوحيد الذي يضعه التطبيق هو كوكي تفضيل واجهة يستخدمه مكوّن الشريط الجانبي
          ليتذكّر إذا كان موسَّعاً أم مطويَّاً. هو first-party، لا يحتوي بيانات شخصية،
          وينتهي خلال أيام قليلة.
        </p>
      </section>

      <section>
        <h2>3. ما يحفظه المتصفح</h2>
        <p>
          أغلب ما يشير إليه الناس بـ &quot;كوكيز&quot; على هذا الموقع هو فعلياً تخزين
          محلي داخل متصفحك. نستخدمه لجعل الموقع سريعاً ولتذكّر تفضيلاتك. لا يتم بيع أو
          مشاركة أي من ذلك.
        </p>
        <ul>
          <li>
            <strong>جلسة تسجيل الدخول</strong> (localStorage بواسطة Supabase، بادئة
            <code>sb-…-auth-token</code>) — تبقيك مسجَّلاً داخل بوابة العميل، وتُمسح عند
            الخروج تلقائياً.
          </li>
          <li>
            <strong>مسوّدة طلب التسعير</strong> (localStorage) — تحفظ طلباً بدأت في
            تحضيره حتى لا يضيع. قد تحتوي الاسم والموبايل والبريد والخدمات المختارة. تنتهي
            تلقائياً بعد 30 يوماً ويمكنك مسحها في أي وقت.
          </li>
          <li>
            <strong>كاش الدولة/العملة</strong> (localStorage) — لمدة 24 ساعة لعرض الأسعار
            بسرعة.
          </li>
          <li>
            <strong>تفضيل اللغة</strong> (localStorage،
            <code>lumos.language</code>).
          </li>
          <li>
            <strong>تفضيل الثيم</strong> (localStorage).
          </li>
          <li>
            <strong>إشارات إخفاء التلميحات</strong> (sessionStorage) — تتذكّر أنك أغلقت
            دليل التنقل خلال هذا التبويب.
          </li>
          <li>
            <strong>عدّاد الزيارات</strong> (localStorage) — عدّاد بسيط داخلي يحدّد متى
            نظهر تلميحات صغيرة. الرقم لا يغادر جهازك.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. كيف تتحكّم في هذه البيانات</h2>
        <ul>
          <li>
            <strong>سجّل الخروج</strong> من بوابة العميل لمسح جلسة Supabase.
          </li>
          <li>
            <strong>امسح بيانات الموقع</strong> من إعدادات متصفحك (تتيح كل من Chrome و
            Edge و Safari و Firefox مسحاً مخصَّصاً لكل موقع) لمسح كل ما سبق دفعة واحدة.
          </li>
          <li>
            <strong>استخدم وضع التصفح الخاص</strong> إذا أردت جلسة لا تبقى بين الزيارات.
          </li>
          <li>
            <strong>راسلنا</strong> على{" "}
            <a href="mailto:contact@getlumos.studio">contact@getlumos.studio</a> إذا
            أردت حذف عنصر معيّن من جانب الخادم أيضاً.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. الأطراف الخارجية</h2>
        <p>
          تعتمد بعض خدمات Lumos على Supabase (قاعدة بيانات، تسجيل دخول، تخزين). قد يضع
          Supabase كوكيز تقنية خاصة به على الطلبات المباشرة لخدمته (مثلاً لتجديد
          الجلسة). تجد تفاصيلها في{" "}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
            سياسة خصوصية Supabase
          </a>
          .
        </p>
        <p>
          إذا أضفنا مستقبلاً مزوّد تحليلات أو شات خارجي، سنحدّث هذه الصفحة ونطلب موافقتك
          قبل تشغيل أيّ تتبّع.
        </p>
      </section>

      <section>
        <h2>6. التحديثات</h2>
        <p>
          قد نحدّث هذه السياسة. تاريخ &quot;آخر تحديث&quot; في الأعلى يعكس آخر تعديل. عند
          إضافة أي تتبّع يحتاج موافقة سنشرحه هنا قبل تشغيله.
        </p>
      </section>
    </>
  );
}
