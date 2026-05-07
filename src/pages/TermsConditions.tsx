import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { LegalPageLayout } from "./legal/LegalPageLayout";

const LAST_UPDATED = "2026-05-07";

export default function TermsConditions() {
  const { isArabic, t } = useLanguage();

  useEffect(() => {
    document.title = isArabic
      ? "الشروط والأحكام — Lumos"
      : "Terms & Conditions — Lumos";
  }, [isArabic]);

  return (
    <LegalPageLayout
      title={t("الشروط والأحكام", "Terms & Conditions")}
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
        <h2>1. Agreement</h2>
        <p>
          These Terms & Conditions govern your use of the Lumos Agency website and any
          client portal we provide. By using the site, signing up for an account,
          submitting a contact form, or requesting a quote you agree to these terms.
        </p>
        <p>
          If you do not agree with any part of these terms, please stop using the site.
        </p>
      </section>

      <section>
        <h2>2. About Lumos</h2>
        <p>
          Lumos is a digital agency operating from Egypt offering web development,
          brand identity, and digital growth services. Specific deliverables, scope, and
          pricing are agreed in a separate proposal or written agreement between Lumos and
          the client; these Terms cover the website itself, not those custom contracts.
        </p>
      </section>

      <section>
        <h2>3. Use of the website</h2>
        <ul>
          <li>You agree to use the site only for lawful purposes.</li>
          <li>You agree not to attempt to break security, scrape data, or abuse the forms.</li>
          <li>
            You agree not to upload content that infringes intellectual property,
            contains malware, or violates the privacy of others.
          </li>
          <li>
            We may rate-limit, block, or remove submissions that look like spam or abuse.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Accounts</h2>
        <p>
          When you create a client account you are responsible for keeping your
          credentials safe and for activity carried out under your account. Tell us
          immediately at{" "}
          <a href="mailto:contact@getlumos.studio">contact@getlumos.studio</a> if you
          suspect unauthorized access. We may suspend an account that breaches these
          Terms.
        </p>
      </section>

      <section>
        <h2>5. Pricing requests and contact forms</h2>
        <p>
          Pricing requests and contact form submissions are <strong>not</strong> a
          contract. They are a request to start a conversation. Final scope and price are
          confirmed only in a separate written proposal or invoice signed by both sides.
        </p>
      </section>

      <section>
        <h2>6. Intellectual property</h2>
        <p>
          The Lumos name, logo, and the site&apos;s design, code, and copy are owned by
          Lumos or its licensors. You may not copy, redistribute, or republish any of it
          without written permission. Project deliverables produced for a paying client
          are governed by the separate engagement agreement, not by this clause.
        </p>
      </section>

      <section>
        <h2>7. Third-party services</h2>
        <p>
          The site relies on third-party services such as Supabase (database, auth,
          storage) and the email provider used by Supabase. Those services are governed
          by their own terms. If they go down, the affected features of the site may be
          temporarily unavailable.
        </p>
      </section>

      <section>
        <h2>8. Disclaimer of warranties</h2>
        <p>
          The site is provided <strong>&quot;as is&quot;</strong>. We try to keep it
          available, accurate, and secure, but we make no specific warranty that it will
          always be uninterrupted or error-free, or that any information shown (for
          example example pricing in the live preview) is final.
        </p>
      </section>

      <section>
        <h2>9. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by Egyptian law, Lumos is not liable for any
          indirect, incidental, or consequential loss caused by use of the site itself.
          Our liability for any direct, proven damages caused by our negligence is
          limited to the amounts paid (if any) for the specific service that gave rise to
          the claim.
        </p>
      </section>

      <section>
        <h2>10. Privacy</h2>
        <p>
          Your data is handled as described in our{" "}
          <a href="/privacy-policy">Privacy Policy</a>. Cookie/storage usage is described
          in our <a href="/cookie-policy">Cookie Policy</a>.
        </p>
      </section>

      <section>
        <h2>11. Changes</h2>
        <p>
          We may update these Terms. The &quot;Last updated&quot; date at the top of the
          page reflects the most recent change. Continuing to use the site after a
          change means you accept the new version.
        </p>
      </section>

      <section>
        <h2>12. Governing law</h2>
        <p>
          These Terms are governed by the laws of the Arab Republic of Egypt. Any dispute
          that cannot be resolved amicably will be referred to the competent courts of
          Cairo.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          Questions about these Terms? Email{" "}
          <a href="mailto:contact@getlumos.studio">contact@getlumos.studio</a> or
          WhatsApp <a href="https://wa.me/201279897482">+20 127 989 7482</a>.
        </p>
      </section>
    </>
  );
}

function ArabicContent() {
  return (
    <>
      <section>
        <h2>1. الموافقة</h2>
        <p>
          تحكم هذه الشروط والأحكام استخدامك لموقع وكالة Lumos وأي بوّابة عميل نقدّمها. عند
          استخدام الموقع أو إنشاء حساب أو إرسال نموذج تواصل أو طلب تسعير فإنك توافق على
          هذه الشروط.
        </p>
        <p>إذا كنت لا توافق على أي جزء منها، رجاءً توقّف عن استخدام الموقع.</p>
      </section>

      <section>
        <h2>2. عن Lumos</h2>
        <p>
          Lumos وكالة رقمية تعمل من مصر وتقدّم خدمات تطوير الويب والهوية البصرية والنمو
          الرقمي. تفاصيل النطاق والتسليمات والأسعار يتم الاتفاق عليها في عرض مكتوب أو
          عقد مستقل بين Lumos والعميل؛ هذه الشروط تخص الموقع نفسه وليس تلك العقود.
        </p>
      </section>

      <section>
        <h2>3. استخدام الموقع</h2>
        <ul>
          <li>توافق على استخدام الموقع للأغراض المشروعة فقط.</li>
          <li>توافق على عدم محاولة كسر الحماية أو سحب البيانات أو إساءة استخدام النماذج.</li>
          <li>
            توافق على عدم رفع محتوى يخل بحقوق الملكية الفكرية أو يحتوي على برامج ضارة أو
            يخالف خصوصية الآخرين.
          </li>
          <li>
            يحق لنا تقييد أو حظر أو حذف الإرسالات التي تبدو كسبام أو إساءة.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. الحسابات</h2>
        <p>
          عند إنشاء حساب عميل تكون مسؤولاً عن المحافظة على بيانات الدخول وعن أي نشاط يتم
          من حسابك. أبلغنا فوراً عبر{" "}
          <a href="mailto:contact@getlumos.studio">contact@getlumos.studio</a> إذا
          اشتبهت في وصول غير مصرَّح به. يحقّ لنا إيقاف أيّ حساب يخالف هذه الشروط.
        </p>
      </section>

      <section>
        <h2>5. طلبات التسعير ونماذج التواصل</h2>
        <p>
          طلبات التسعير ونماذج التواصل <strong>ليست عقداً</strong>. هي طلب لبدء محادثة.
          النطاق والسعر النهائيان يتم تأكيدهما فقط في عرض/فاتورة مكتوبة موقَّعة من
          الطرفين.
        </p>
      </section>

      <section>
        <h2>6. الملكية الفكرية</h2>
        <p>
          اسم Lumos وشعارها وتصميم الموقع وكوده ومحتواه ملك لـ Lumos أو مرخّصيها. لا يجوز
          نسخها أو إعادة نشرها بدون إذن مكتوب. التسليمات الناتجة عن مشاريع العملاء
          المدفوعة تخضع لاتفاقية المشروع المنفصلة وليس هذه الفقرة.
        </p>
      </section>

      <section>
        <h2>7. الخدمات الخارجية</h2>
        <p>
          يعتمد الموقع على خدمات خارجية مثل Supabase (قاعدة بيانات، تسجيل دخول، تخزين)
          ومزوّد البريد الخاص بها. هذه الخدمات تخضع لشروطها هي. عند انقطاعها قد تتوقّف
          ميزات معتمدة عليها مؤقتاً.
        </p>
      </section>

      <section>
        <h2>8. إخلاء ضمانات</h2>
        <p>
          الموقع مقدَّم <strong>&quot;كما هو&quot;</strong>. نسعى لإبقائه متاحاً ودقيقاً
          وآمناً، لكن لا نضمن أنه سيكون دائماً بلا انقطاع أو بلا أخطاء، ولا أن أي معلومة
          معروضة (مثل الأسعار التوضيحية في المعاينة) نهائية.
        </p>
      </section>

      <section>
        <h2>9. حدود المسؤولية</h2>
        <p>
          إلى أقصى حدّ يسمح به القانون المصري، Lumos غير مسؤولة عن أي خسائر غير مباشرة
          أو تبعية ناتجة عن استخدام الموقع نفسه. تقتصر مسؤوليتنا عن أي ضرر مباشر مُثبت
          ناتج عن إهمالنا على المبلغ المدفوع (إن وُجد) للخدمة المعنية بالنزاع.
        </p>
      </section>

      <section>
        <h2>10. الخصوصية</h2>
        <p>
          تُعالَج بياناتك وفق <a href="/privacy-policy">سياسة الخصوصية</a>. استخدام
          المتصفح للتخزين والكوكيز موصوف في <a href="/cookie-policy">سياسة الكوكيز</a>.
        </p>
      </section>

      <section>
        <h2>11. التعديلات</h2>
        <p>
          قد نحدّث هذه الشروط. تاريخ &quot;آخر تحديث&quot; في الأعلى يعكس آخر تعديل.
          استمرارك في استخدام الموقع بعد التحديث يعتبر موافقة على النسخة الجديدة.
        </p>
      </section>

      <section>
        <h2>12. القانون الحاكم</h2>
        <p>
          تخضع هذه الشروط لقوانين جمهورية مصر العربية. أي نزاع يتعذّر حلّه ودياً يُحال
          إلى المحاكم المختصة في القاهرة.
        </p>
      </section>

      <section>
        <h2>13. تواصل معنا</h2>
        <p>
          أسئلة عن الشروط؟ راسلنا على{" "}
          <a href="mailto:contact@getlumos.studio">contact@getlumos.studio</a> أو
          واتساب <a href="https://wa.me/201279897482">+20 127 989 7482</a>.
        </p>
      </section>
    </>
  );
}
