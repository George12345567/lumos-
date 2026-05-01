import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { isArabic, t } = useLanguage();

  const faqs = [
    {
      question: t("ما هي الخدمات الأساسية التي تركز عليها وكالة Lumos؟", "What are the core services Lumos Agency focuses on?"),
      answer: t("لدينا فريق متخصص من مصممي الجرافيك ومطوري الويب والبرمجيات، إلى جانب نخبة من متدربي علوم الحاسب. شغفنا الحقيقي هو بناء وتطوير الهوية الرقمية، ونقوم بتطوير أدواتنا وموقعنا يومياً لتتواكب بدقة مع احتياجات وتطلعات عملائنا.", "We have a specialized team of graphic designers, web developers, and software engineers, along with talented computer science trainees. Our true passion is building and evolving digital identities, and we continuously improve our website and tools daily to precisely match our clients' needs and aspirations."),
    },
    {
      question: t("ما الذي يميزكم عن باقي الوكالات في السوق؟", "What sets you apart from other agencies in the market?"),
      answer: t("الجودة والاحترافية هما أساس عملنا. نحن لسنا مجرد منفذين للمشاريع، بل نعتبر أنفسنا \"شركاء نجاح\". نحن نهتم بنمو أعمالك لأننا نكبر مع عملائنا وبنجاحاتهم.", "Quality and professionalism are our foundation. We are not just project executors; we are your 'success partners.' We care about your business growth because we grow alongside our clients and their successes."),
    },
    {
      question: t("كيف يتم تحديد أسعار مشاريعكم؟", "How do you price your projects?"),
      answer: t("يمكنك الاطلاع على باقاتنا وأسعارنا بوضوح من صفحة الباقات في الموقع. لدينا تسعير ثابت للخدمات، لكننا نؤمن بدعم المشاريع الطموحة. إذا كنت بحاجة حقيقية للمساعدة ولا تناسبك الباقات، تواصل معنا عبر contact@getlumos.studio وسنعمل على إيجاد الحل الأنسب.", "You can view our packages and pricing clearly in the Pricing section. We use clear fixed pricing for core services, while still supporting ambitious projects. If you need help and our listed packages are not the right fit, contact us at contact@getlumos.studio and we will help shape the best option for your case."),
    },
    {
      question: t("كم يستغرق تسليم المشروع عادةً؟", "How long does it typically take to deliver a project?"),
      answer: t("المدة التقديرية تعتمد كلياً على حجم ومتطلبات المشروع. المشاريع البسيطة قد تستغرق بضعة أسابيع، بينما الأنظمة المعقدة أو المشاريع الكبيرة قد تتطلب عدة شهور لضمان خروجها بأعلى جودة ممكنة.", "The estimated time depends entirely on the size and requirements of the project. Simpler projects might take a few weeks, while complex systems or large projects could take several months to ensure the highest possible quality."),
    },
    {
      question: t("ما هي أول خطوة للبدء في العمل معكم؟", "What is the first step to start working with you?"),
      answer: t("يمكنك البدء بأحد ثلاث طرق: التواصل معنا عبر نموذج الاتصال، أو تصفح الباقات واختيار الخدمات المطلوبة، أو ببساطة تسجيل الدخول إلى منصة العملاء الخاصة بنا وترك ملاحظة (Note) بطلبك، وسيقوم فريقنا بالتواصل معك فوراً.", "You can start in one of three ways: contact us via the contact form, browse our packages and select the services you need, or simply log in to our client portal, leave a note with your request, and our team will get in touch with you immediately."),
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-secondary/30">
      <div className="container mx-auto max-w-4xl" dir={isArabic ? 'rtl' : 'ltr'}>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 sm:mb-4 text-foreground reveal">
          {t('الأسئلة', 'Frequently Asked')} <span className="text-primary">{t('الشائعة', 'Questions')}</span>
        </h2>
        <p className="text-center text-muted-foreground mb-10 sm:mb-12 md:mb-16 text-sm sm:text-base lg:text-lg reveal">
          {t('عندك أسئلة؟ لدينا الإجابات.', 'Got questions? We\'ve got answers')}
        </p>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="reveal glass-card rounded-xl overflow-hidden border border-border hover-lift"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className={`w-full px-6 py-5 flex items-center justify-between ${isArabic ? 'text-right' : 'text-left'} hover:bg-secondary/50 transition-colors`}
              >
                <span className="text-lg font-semibold text-foreground pr-4">
                  {faq.question}
                </span>
                <span className="flex-shrink-0 text-primary">
                  {openIndex === index ? <Minus size={24} /> : <Plus size={24} />}
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${openIndex === index ? "max-h-96" : "max-h-0"
                  }`}
              >
                <div className="px-6 pb-5 text-muted-foreground">
                  {faq.answer}
                </div>
              </div>
              <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent shimmer-line" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;

