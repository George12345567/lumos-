import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { LegalPageLayout } from "./legal/LegalPageLayout";

const LAST_UPDATED = "2026-05-07";

export default function PrivacyPolicy() {
  const { isArabic, t } = useLanguage();

  useEffect(() => {
    document.title = isArabic
      ? "سياسة الخصوصية — Lumos"
      : "Privacy Policy — Lumos";
  }, [isArabic]);

  return (
    <LegalPageLayout
      title={t("سياسة الخصوصية", "Privacy Policy")}
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
        <h2>1. Who we are</h2>
        <p>
          Lumos Agency (&quot;Lumos&quot;, &quot;we&quot;, &quot;us&quot;) is a digital
          studio based in Egypt offering web development, brand identity, and growth
          services. This Privacy Policy describes what personal information we collect
          on this website, why we collect it, and how we handle it.
        </p>
        <p>
          Contact: <a href="mailto:contact@getlumos.studio">contact@getlumos.studio</a>{" "}
          · WhatsApp <a href="https://wa.me/201279897482">+20 127 989 7482</a>.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <p>We only collect the data you actively give us through the site:</p>
        <ul>
          <li>
            <strong>Contact form:</strong> name, phone number, business name, industry,
            service of interest, and free-text message.
          </li>
          <li>
            <strong>Pricing requests:</strong> name, phone, email, company name, and the
            services or package you selected.
          </li>
          <li>
            <strong>Lead capture popup:</strong> the optional details you enter (typically
            name, contact, and what you are interested in).
          </li>
          <li>
            <strong>Account signup:</strong> username, email, phone, company name, contact
            person, optional website, optional brand colors, and any project details you
            choose to provide. Passwords are handled by Supabase Auth — we never see or
            store the plaintext password. If you set an optional security question, only
            a salted hash of the answer is stored.
          </li>
          <li>
            <strong>Profile data:</strong> the fields you choose to fill in your client
            portal (e.g. display name, bio, social links, avatar).
          </li>
          <li>
            <strong>Automatic technical data:</strong> the URL of the page you submitted
            from, your browser&apos;s user-agent string, and a timestamp. This is attached to
            form submissions to help us debug and to detect abuse.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> ask for, and do not knowingly store, payment card
          numbers on this site.
        </p>
      </section>

      <section>
        <h2>3. How we use your information</h2>
        <ul>
          <li>To respond to inquiries and prepare proposals.</li>
          <li>To deliver the services you request.</li>
          <li>To operate the client portal (login, profile, project tracking).</li>
          <li>To improve our website and detect spam or abusive submissions.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal information and we do not share it
          with third-party advertisers.
        </p>
      </section>

      <section>
        <h2>4. Where your data is stored</h2>
        <p>
          Form submissions, accounts, and project data are stored on{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
            Supabase
          </a>
          , a managed Postgres backend. Files you upload (e.g. profile avatars) are stored
          in a private Supabase storage bucket and are protected by row-level security
          policies. Email delivery for confirmation and password reset uses Supabase&apos;s
          email provider.
        </p>
      </section>

      <section>
        <h2>5. Browser storage we use</h2>
        <p>
          The site uses your browser&apos;s local storage and session storage for a small
          set of UX features. These do not require a tracking cookie banner because they
          are first-party and not used for advertising:
        </p>
        <ul>
          <li>
            <strong>Authentication session</strong> (localStorage, managed by Supabase) —
            keeps you signed in. Cleared when you sign out.
          </li>
          <li>
            <strong>Pricing modal draft</strong> (localStorage) — temporarily remembers a
            pricing request you started so you don&apos;t lose it on reload. It is kept
            for up to 30 days and can include name / phone / email / selected services.
            You can clear it any time from your browser&apos;s site settings.
          </li>
          <li>
            <strong>Geolocation cache</strong> (localStorage) — caches your detected
            country/currency for 24 hours so prices render quickly.
          </li>
          <li>
            <strong>Language and theme preferences</strong> (localStorage).
          </li>
          <li>
            <strong>UI hint flags</strong> (sessionStorage) — remembers that you have
            already dismissed the navigation/dock guides for the current tab.
          </li>
        </ul>
        <p>
          See our <a href="/cookie-policy">Cookie Policy</a> for details.
        </p>
      </section>

      <section>
        <h2>6. Analytics and tracking</h2>
        <p>
          This site does not currently load Google Analytics, Meta Pixel, or any
          third-party advertising tracker. Lightweight first-party visit counts are kept
          in your browser&apos;s localStorage only and never leave your device.
        </p>
      </section>

      <section>
        <h2>7. How long we keep data</h2>
        <ul>
          <li>Contact form / pricing request submissions: until we close the request and a reasonable retention period after.</li>
          <li>Client accounts and profile data: until you ask us to delete the account.</li>
          <li>Supabase auth sessions: until you sign out or the token expires.</li>
          <li>Pricing modal draft in your browser: 30 days, automatically.</li>
        </ul>
      </section>

      <section>
        <h2>8. Your rights</h2>
        <p>
          You can ask us to access, correct, export, or delete your personal data by
          emailing <a href="mailto:contact@getlumos.studio">contact@getlumos.studio</a>.
          Where the law in your jurisdiction grants you additional rights (for example
          GDPR for visitors from the EU), we will honour them within a reasonable time.
        </p>
      </section>

      <section>
        <h2>9. Children</h2>
        <p>
          Our services are aimed at businesses. We do not knowingly collect personal data
          from children under 16. If you believe a child has submitted information,
          contact us and we will delete it.
        </p>
      </section>

      <section>
        <h2>10. Security</h2>
        <p>
          We use Supabase&apos;s row-level security to make sure each client account can
          only read its own data, and we hash passwords and security answers. No system is
          perfectly secure — please choose a strong password and tell us right away if you
          suspect your account has been accessed without your permission.
        </p>
      </section>

      <section>
        <h2>11. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy. The &quot;Last updated&quot; date at the top
          will reflect the most recent change. Material changes will be highlighted on the
          site or sent to registered clients by email.
        </p>
      </section>
    </>
  );
}

function ArabicContent() {
  return (
    <>
      <section>
        <h2>1. من نحن</h2>
        <p>
          وكالة Lumos (&quot;Lumos&quot;، &quot;نحن&quot;) ستوديو رقمي يعمل من مصر ويقدّم
          خدمات تطوير الويب والهوية البصرية والنمو التسويقي. توضّح هذه السياسة البيانات
          الشخصية التي نجمعها من هذا الموقع، ولماذا نجمعها، وكيف نتعامل معها.
        </p>
        <p>
          للتواصل: <a href="mailto:contact@getlumos.studio">contact@getlumos.studio</a> ·
          واتساب <a href="https://wa.me/201279897482">+20 127 989 7482</a>.
        </p>
      </section>

      <section>
        <h2>2. البيانات التي نجمعها</h2>
        <p>نجمع فقط ما تختار إدخاله بنفسك في الموقع:</p>
        <ul>
          <li>
            <strong>نموذج التواصل:</strong> الاسم، رقم الموبايل، اسم النشاط، المجال،
            الخدمة المطلوبة، ورسالتك.
          </li>
          <li>
            <strong>طلبات التسعير:</strong> الاسم، الموبايل، البريد، اسم الشركة، والخدمات
            أو الباقة التي اخترتها.
          </li>
          <li>
            <strong>نافذة جذب العملاء:</strong> البيانات الاختيارية التي تدخلها (عادةً
            الاسم وبيانات التواصل واهتمامك).
          </li>
          <li>
            <strong>إنشاء الحساب:</strong> اسم المستخدم، البريد، الموبايل، اسم الشركة،
            اسم جهة الاتصال، الموقع الإلكتروني (اختياري)، ألوان العلامة (اختياري)، وأي
            تفاصيل مشروع تختار مشاركتها. كلمات المرور تُدار عبر Supabase Auth ولا نراها
            ولا نخزنها كنص. إذا اخترت تفعيل سؤال أمان فإننا نخزن هاش (تشفير اتجاه واحد)
            للإجابة فقط، ولا نخزن النص.
          </li>
          <li>
            <strong>بيانات الملف الشخصي:</strong> الحقول التي تختار ملأها داخل بوابة
            العميل (مثل الاسم الظاهر والوصف وروابط السوشيال والصورة).
          </li>
          <li>
            <strong>بيانات تقنية تلقائية:</strong> رابط الصفحة التي أرسلت منها، وسلسلة
            user-agent للمتصفح، ووقت الإرسال. ترفق هذه البيانات مع نماذج الإرسال للمساعدة
            في الدعم وكشف الإساءة.
          </li>
        </ul>
        <p>
          <strong>لا نطلب</strong> بيانات بطاقات الدفع ولا نخزّنها داخل هذا الموقع.
        </p>
      </section>

      <section>
        <h2>3. كيف نستخدم البيانات</h2>
        <ul>
          <li>للرد على استفساراتك وتجهيز عروض الأسعار.</li>
          <li>لتنفيذ الخدمات التي تطلبها.</li>
          <li>لتشغيل بوابة العميل (تسجيل الدخول، الملف الشخصي، تتبع المشروع).</li>
          <li>لتحسين الموقع واكتشاف الإرسال المسيء أو السبام.</li>
        </ul>
        <p>
          نحن <strong>لا نبيع</strong> بياناتك ولا نشاركها مع شركات إعلانات.
        </p>
      </section>

      <section>
        <h2>4. أين تُخزَّن بياناتك</h2>
        <p>
          نماذج الإرسال والحسابات وبيانات المشاريع تُخزَّن على{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
            Supabase
          </a>{" "}
          (قاعدة بيانات Postgres مُدارة). الملفات التي ترفعها (مثل الصور الشخصية) تُخزَّن
          في حاوية Supabase Storage خاصة ومحمية بسياسات RLS. إيميلات التأكيد وإعادة تعيين
          كلمة المرور تُرسل عبر مزود البريد الخاص بـ Supabase.
        </p>
      </section>

      <section>
        <h2>5. ما الذي يحفظه المتصفح</h2>
        <p>
          يستخدم الموقع localStorage و sessionStorage في عدد محدود من ميزات تجربة
          المستخدم. هذه استخدامات داخلية (first-party) ولا نستخدمها للإعلانات:
        </p>
        <ul>
          <li>
            <strong>جلسة تسجيل الدخول</strong> (localStorage عبر Supabase) — تُمسح عند
            الخروج.
          </li>
          <li>
            <strong>مسوّدة طلب التسعير</strong> (localStorage) — تحفظ مؤقتاً طلب تسعير
            بدأت في إعداده حتى لا يضيع. تُحتفظ مدة 30 يوماً وقد تتضمن الاسم والموبايل
            والبريد والخدمات المختارة. يمكنك مسحها في أي وقت من إعدادات الموقع في متصفحك.
          </li>
          <li>
            <strong>كاش تحديد الدولة/العملة</strong> (localStorage) — لمدة 24 ساعة لتسريع
            عرض الأسعار.
          </li>
          <li>
            <strong>تفضيلات اللغة والثيم</strong> (localStorage).
          </li>
          <li>
            <strong>إشارات إخفاء التلميحات</strong> (sessionStorage) — تتذكّر أنّك أغلقت
            دليل التنقل خلال هذا التبويب.
          </li>
        </ul>
        <p>
          راجع <a href="/cookie-policy">سياسة الكوكيز</a> لمزيد من التفاصيل.
        </p>
      </section>

      <section>
        <h2>6. التحليلات والتتبع</h2>
        <p>
          الموقع لا يحمّل حالياً Google Analytics أو Meta Pixel أو أيّ أداة تتبّع إعلاني
          خارجية. عدّاد الزيارات الخفيف يُحفظ داخل localStorage فقط ولا يغادر جهازك.
        </p>
      </section>

      <section>
        <h2>7. مدة الاحتفاظ</h2>
        <ul>
          <li>نماذج التواصل وطلبات التسعير: حتى إغلاق الطلب ولفترة احتفاظ معقولة بعد ذلك.</li>
          <li>حسابات العملاء: حتى تطلب حذف حسابك.</li>
          <li>جلسات Supabase: حتى تخرج أو ينتهي الـ token.</li>
          <li>مسوّدة التسعير في المتصفح: 30 يوماً تلقائياً.</li>
        </ul>
      </section>

      <section>
        <h2>8. حقوقك</h2>
        <p>
          يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو تصديرها أو حذفها بالتواصل على{" "}
          <a href="mailto:contact@getlumos.studio">contact@getlumos.studio</a>. وإذا
          كانت قوانين بلدك تمنحك حقوقاً إضافية (مثل GDPR لزوار الاتحاد الأوروبي) فإننا
          نلتزم بها خلال مدة معقولة.
        </p>
      </section>

      <section>
        <h2>9. الأطفال</h2>
        <p>
          خدماتنا موجّهة للشركات. لا نجمع عمداً بيانات من قاصرين دون 16 سنة. إذا اعتقدت أن
          طفلاً قد أرسل بيانات، تواصل معنا وسنحذفها.
        </p>
      </section>

      <section>
        <h2>10. الأمان</h2>
        <p>
          نستخدم RLS في Supabase لضمان أنّ كل عميل لا يقرأ سوى بياناته، ونخزّن كلمات المرور
          وأجوبة الأمان كهاش فقط. لا يوجد نظام آمن 100% — اختر كلمة مرور قوية وأبلغنا
          فوراً إذا اشتبهت في وصول غير مصرّح به لحسابك.
        </p>
      </section>

      <section>
        <h2>11. تحديثات السياسة</h2>
        <p>
          قد نحدّث هذه السياسة. تاريخ &quot;آخر تحديث&quot; في الأعلى يعكس آخر تعديل.
          سنُنبّه على التغييرات الجوهرية عبر الموقع أو بالبريد للعملاء المسجَّلين.
        </p>
      </section>
    </>
  );
}
