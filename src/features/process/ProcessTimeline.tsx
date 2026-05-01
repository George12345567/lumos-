import { Search, Lightbulb, Rocket, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const ProcessTimeline = () => {
  const { isArabic, t } = useLanguage();

  const steps = [
    {
      icon: <Search className="w-12 h-12" />,
      title: {
        ar: "الاكتشاف والتحليل",
        en: "Discovery & Audit",
      },
      description: {
        ar: "نبدأ بفهم نشاطك، أهدافك، وجمهورك، ثم نراجع وضعك الرقمي الحالي لاكتشاف نقاط القوة والفرص.",
        en: "We start by understanding your business, goals, and audience, then audit your current digital presence to uncover strengths and opportunities.",
      },
      deliverable: {
        ar: "ملخص تشخيصي واضح",
        en: "Clear Audit Snapshot",
      },
    },
    {
      icon: <Lightbulb className="w-12 h-12" />,
      title: {
        ar: "بناء الاستراتيجية",
        en: "Strategy Blueprint",
      },
      description: {
        ar: "نحوّل الأفكار إلى خطة عملية تشمل الأولويات، الرسائل، القنوات، والجدول الزمني المناسب للتنفيذ.",
        en: "We turn ideas into an actionable plan covering priorities, messaging, channels, and a realistic execution timeline.",
      },
      deliverable: {
        ar: "خارطة طريق تنفيذية",
        en: "Execution Roadmap",
      },
    },
    {
      icon: <Rocket className="w-12 h-12" />,
      title: {
        ar: "التنفيذ والإنتاج",
        en: "Build & Execute",
      },
      description: {
        ar: "ننفذ التصميم والمحتوى والتطوير وفق الخطة، مع متابعة دقيقة للجودة والاتساق في كل مرحلة.",
        en: "We execute design, content, and development according to plan, with strict quality control and consistency at every stage.",
      },
      deliverable: {
        ar: "نسخة جاهزة للمراجعة",
        en: "Review-Ready Delivery",
      },
    },
    {
      icon: <CheckCircle2 className="w-12 h-12" />,
      title: {
        ar: "الإطلاق والتحسين",
        en: "Launch & Optimize",
      },
      description: {
        ar: "نطلق المشروع بثقة، نقيس النتائج، ونطبق تحسينات مستمرة لضمان نمو مستدام وعائد أفضل.",
        en: "We launch with confidence, track performance, and apply continuous improvements to ensure sustainable growth and better returns.",
      },
      deliverable: {
        ar: "خطة تطوير مستمرة",
        en: "Continuous Growth Plan",
      },
    },
  ];

  return (
    <section
      id="process"
      className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_55%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_50%)]"
    >
      <div className="container mx-auto" dir={isArabic ? "rtl" : "ltr"}>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 sm:mb-4 text-foreground reveal">
          {t("آلية", "Our")} <span className="text-primary">{t("العمل", "Process")}</span>
        </h2>
        <p className="text-center text-muted-foreground mb-10 sm:mb-12 md:mb-16 text-sm sm:text-base lg:text-lg reveal">
          {t(
            "من التشخيص إلى الإطلاق: مسار واضح يحوّل فكرتك إلى نتائج قابلة للقياس.",
            "From audit to launch: a clear workflow that turns your idea into measurable results."
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8 relative">
          <div className="hidden xl:block absolute top-20 left-10 right-10 h-[2px] bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20 pointer-events-none" />

          {steps.map((step, index) => (
            <div key={index} className="relative reveal">
              <div className="glass-card h-full p-5 sm:p-6 md:p-7 rounded-2xl text-center hover:shadow-xl hover-lift relative z-10 bg-background/90 border border-border/60 overflow-hidden">
                <span className="block h-1 w-10 sm:w-14 md:w-16 mx-auto mb-4 sm:mb-5 rounded-full bg-primary/30 shimmer-line" />
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-primary mb-4 sm:mb-5 relative">
                  <div className="scale-75 sm:scale-90 md:scale-100">
                    {step.icon}
                  </div>
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-primary text-white text-[10px] sm:text-xs md:text-sm font-bold flex items-center justify-center shadow-md">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 text-foreground">
                  {t(step.title.ar, step.title.en)}
                </h3>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-4">
                  {t(step.description.ar, step.description.en)}
                </p>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs sm:text-sm text-primary font-medium">
                  <span>{t("المخرج", "Deliverable")}</span>
                  <span className="opacity-70">•</span>
                  <span>{t(step.deliverable.ar, step.deliverable.en)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs sm:text-sm text-muted-foreground/90 mt-8 sm:mt-10 reveal">
          {t(
            "كل مرحلة لها مخرجات واضحة قبل الانتقال للمرحلة التالية لضمان جودة أعلى وسرعة قرار أفضل.",
            "Each phase has a clear output before moving forward, ensuring higher quality and faster decisions."
          )}
        </p>
      </div>
    </section>
  );
};

export default ProcessTimeline;

