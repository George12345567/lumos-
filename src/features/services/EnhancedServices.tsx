import { ArrowRight, Camera, Laptop, Smartphone, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";

const EnhancedServices = () => {
  const { isArabic, t } = useLanguage();
  const services = [
    {
      icon: <Laptop className="h-9 w-9" />,
      label: t("موقع", "Website"),
      title: t("تطوير الويب والأنظمة", "Web & Systems Development"),
      description: t("نبني مواقع إلكترونية، أنظمة إدارة، وتطبيقات ويب مخصصة بأحدث التقنيات لضمان أداء استثنائي وتجربة مستخدم لا تُنسى.", "We build custom websites, management systems, and web apps using the latest technologies to ensure exceptional performance and an unforgettable user experience."),
      image: "/mockups/neon-wall.png",
      features: [t("تصميم عصري متجاوب", "Modern Responsive Design"), t("أداء فائق السرعة", "Lightning Fast Performance"), t("هندسة برمجية متطورة", "Advanced Software Engineering")],
      pageSlug: "web-systems",
      category: "web",
      accent: "from-cyan-400/25 via-primary/15 to-transparent",
    },
    {
      icon: <Camera className="h-9 w-9" />,
      label: t("هوية", "Brand"),
      title: t("تصميم الهوية البصرية", "Brand & Graphic Design"),
      description: t("نبتكر هويات بصرية تعكس روح علامتك التجارية، من تصميم الشعارات والمطبوعات إلى واجهات المستخدم الجذابة والمواد التسويقية.", "We create visual identities that reflect your brand's soul, from logo and print design to engaging user interfaces and marketing materials."),
      image: "/mockups/bag-floating.png",
      features: [t("تصميم شعارات مبتكرة", "Creative Logo Design"), t("هوية بصرية متكاملة", "Complete Visual Identity"), t("تصميم واجهات المستخدم (UI/UX)", "UI/UX Design")],
      pageSlug: "brand-identity",
      category: "brand_identity",
      accent: "from-emerald-400/25 via-primary/15 to-transparent",
    },
    {
      icon: <Smartphone className="h-9 w-9" />,
      label: t("محتوى", "Content"),
      title: t("إدارة صفحات السوشيال ميديا", "Social Media Management"),
      description: t("ندير حساباتك على منصات التواصل الاجتماعي باحترافية، نصنع محتوى جذاب، ونتفاعل مع جمهورك لزيادة الولاء والنمو المستمر.", "We professionally manage your social media accounts, create engaging content, and interact with your audience to increase loyalty and continuous growth."),
      image: "/mockups/tshirt-hanging.png",
      features: [t("خطة محتوى استراتيجية", "Strategic Content Plan"), t("تصاميم يومية جذابة", "Daily Engaging Designs"), t("تحليل البيانات والمتابعة", "Data Analysis & Tracking")],
      pageSlug: "social-growth",
      category: "growth_ads",
      accent: "from-lime-400/20 via-primary/15 to-transparent",
    },
  ];

  const openPricing = (category: string) => {
    window.dispatchEvent(
      new CustomEvent("lumos:open-pricing", {
        detail: { request: { request_type: "custom", selected_services: [{ category }] } },
      })
    );
  };

  return (
    <section className="relative overflow-hidden bg-secondary/10 px-4 py-14 sm:px-6 sm:py-20 md:py-24">
      <style>{`
        @keyframes service-flow {
          0%, 100% { opacity: 0.35; transform: translateX(-8%); }
          50% { opacity: 0.9; transform: translateX(8%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .service-flow-line { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />

      <div className="container relative mx-auto max-w-7xl" dir={isArabic ? "rtl" : "ltr"}>
        <div className="mx-auto mb-10 max-w-3xl text-center reveal">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary sm:text-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {t("نظام نمو متصل", "Growth System")}
          </span>
          <h2 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
            {t("خدمات", "Services")} <span className="text-primary">{t("Lumos", "That Convert")}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base lg:text-lg">
            {t("نحن استوديو نمو رقمي يربط الهوية + الويب + المحتوى بنتيجة تجارية واضحة.", "We are a digital growth studio connecting brand, web, and content to clear business outcomes.")}
          </p>
        </div>

        <div className="relative">
          <div className="service-flow-line pointer-events-none absolute left-[12%] right-[12%] top-16 hidden h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent md:block" style={{ animation: "service-flow 4.5s ease-in-out infinite" }} />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 lg:gap-8">
            {services.map((service, index) => (
              <article
                key={service.category}
                onClick={() => openPricing(service.category)}
                className="reveal group relative cursor-pointer overflow-hidden rounded-3xl border border-border/70 bg-card/80 p-1 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${service.accent} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative overflow-hidden rounded-[1.35rem] border border-border/60 bg-background/65">
                  <div className="relative h-40 overflow-hidden sm:h-44">
                    <img
                      src={service.image}
                      alt={service.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover opacity-85 transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
                    <span className="absolute start-4 top-4 rounded-full border border-primary/25 bg-background/80 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
                      {service.label}
                    </span>
                    <div className="absolute bottom-4 end-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-background/85 text-primary shadow-lg shadow-primary/10 backdrop-blur transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
                      {service.icon}
                    </div>
                  </div>

                  <div className="p-5 text-start sm:p-6 lg:p-7">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
                      <Zap className="h-3.5 w-3.5" />
                      <span>{t("محرك تحويل", "Conversion Engine")}</span>
                    </div>
                    <h3 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">
                      {service.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {service.description}
                    </p>

                    <div className="mt-5 space-y-2.5">
                      {service.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2 text-sm text-foreground/85">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.8)]" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                      <Link
                        to={`/services/${service.pageSlug}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                      >
                        {t("تفاصيل الخدمة", "Service Details")}
                        <ArrowRight className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${isArabic ? "rotate-180 group-hover:-translate-x-0.5" : ""}`} />
                      </Link>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openPricing(service.category);
                        }}
                        className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                      >
                        {t("ابدأ", "Start")}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-center reveal sm:flex-row sm:justify-between sm:text-start">
          <p className="text-sm text-muted-foreground">
            {t("الهوية تقود الثقة، الموقع يحوّل الاهتمام، والمحتوى يحافظ على النمو.", "Brand builds trust, website converts attention, and content compounds growth.")}
          </p>
          <button
            type="button"
            onClick={() => openPricing("web")}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
          >
            {t("ابنِ نظام النمو", "Build my growth system")}
          </button>
        </div>
      </div>
    </section>
  );
};

export default EnhancedServices;
