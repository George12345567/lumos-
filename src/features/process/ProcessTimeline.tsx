import { CheckCircle2, Lightbulb, Rocket, Search, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const ProcessTimeline = () => {
  const { isArabic, t } = useLanguage();

  const steps = [
    {
      icon: <Search className="h-8 w-8" />,
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
      icon: <Lightbulb className="h-8 w-8" />,
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
      icon: <Rocket className="h-8 w-8" />,
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
      icon: <CheckCircle2 className="h-8 w-8" />,
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
    <section className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20 md:py-24">
      <style>{`
        @keyframes launch-path {
          0%, 100% { opacity: 0.35; background-position: 0% 50%; }
          50% { opacity: 0.95; background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .launch-path-line { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.10),transparent_48%),radial-gradient(circle_at_bottom,hsl(var(--secondary)/0.12),transparent_54%)]" />

      <div className="container relative mx-auto max-w-7xl" dir={isArabic ? "rtl" : "ltr"}>
        <div className="mx-auto mb-12 max-w-3xl text-center reveal">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary sm:text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {t("مسار الإطلاق", "Launch Path")}
          </span>
          <h2 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            {t("آلية", "Our")} <span className="text-primary">{t("العمل", "Process")}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base lg:text-lg">
            {t(
              "من التشخيص إلى الإطلاق: مسار واضح يحوّل فكرتك إلى نتائج قابلة للقياس.",
              "From audit to launch: a clear workflow that turns your idea into measurable results."
            )}
          </p>
        </div>

        <div className="relative">
          <div
            className="launch-path-line pointer-events-none absolute inset-x-[8%] top-[4.4rem] hidden h-[3px] rounded-full bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.25),hsl(var(--primary)/0.9),hsl(var(--primary)/0.25),transparent)] bg-[length:220%_100%] xl:block"
            style={{ animation: "launch-path 5.5s ease-in-out infinite" }}
          />

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <article key={step.title.en} className="reveal group relative">
                <div className="absolute start-7 top-16 bottom-[-1.25rem] w-px bg-gradient-to-b from-primary/40 to-transparent sm:hidden" />
                <div className="relative h-full overflow-hidden rounded-3xl border border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10 sm:p-6">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative z-10 mb-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_24px_hsl(var(--primary)/0.12)] transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
                        {step.icon}
                      </span>
                      <span className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-primary/70">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="hidden h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary))] xl:block" />
                  </div>

                  <div className="relative z-10 text-start">
                    <h3 className="text-lg font-bold text-foreground sm:text-xl">
                      {t(step.title.ar, step.title.en)}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {t(step.description.ar, step.description.en)}
                    </p>
                    <div className="mt-5 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-3 transition duration-300 group-hover:bg-primary/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/75">
                        {t("المخرج", "Deliverable")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {t(step.deliverable.ar, step.deliverable.en)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-9 max-w-2xl text-center text-xs leading-6 text-muted-foreground/90 sm:text-sm reveal">
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
