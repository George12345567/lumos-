import { Laptop, Camera, Smartphone } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { Link } from "react-router-dom";

const EnhancedServices = () => {
  const { isArabic, t } = useLanguage();
  const services = [
    {
      icon: <Laptop className="w-12 h-12 text-primary" />,
      title: t("تطوير الويب والأنظمة", "Web & Systems Development"),
      description: t("نبني مواقع إلكترونية، أنظمة إدارة، وتطبيقات ويب مخصصة بأحدث التقنيات لضمان أداء استثنائي وتجربة مستخدم لا تُنسى.", "We build custom websites, management systems, and web apps using the latest technologies to ensure exceptional performance and an unforgettable user experience."),
      image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800",
      features: [t("تصميم عصري متجاوب", "Modern Responsive Design"), t("أداء فائق السرعة", "Lightning Fast Performance"), t("هندسة برمجية متطورة", "Advanced Software Engineering")],
      pageSlug: "web-systems",
    },
    {
      icon: <Camera className="w-12 h-12 text-primary" />,
      title: t("تصميم الهوية البصرية", "Brand & Graphic Design"),
      description: t("نبتكر هويات بصرية تعكس روح علامتك التجارية، من تصميم الشعارات والمطبوعات إلى واجهات المستخدم الجذابة والمواد التسويقية.", "We create visual identities that reflect your brand's soul, from logo and print design to engaging user interfaces and marketing materials."),
      image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&q=80&w=800",
      features: [t("تصميم شعارات مبتكرة", "Creative Logo Design"), t("هوية بصرية متكاملة", "Complete Visual Identity"), t("تصميم واجهات المستخدم (UI/UX)", "UI/UX Design")],
      pageSlug: "brand-identity",
    },
    {
      icon: <Smartphone className="w-12 h-12 text-primary" />,
      title: t("إدارة صفحات السوشيال ميديا", "Social Media Management"),
      description: t("ندير حساباتك على منصات التواصل الاجتماعي باحترافية، نصنع محتوى جذاب، ونتفاعل مع جمهورك لزيادة الولاء والنمو المستمر.", "We professionally manage your social media accounts, create engaging content, and interact with your audience to increase loyalty and continuous growth."),
      image: "https://images.unsplash.com/photo-1611926653458-09294b3142bf?auto=format&fit=crop&q=80&w=800",
      features: [t("خطة محتوى استراتيجية", "Strategic Content Plan"), t("تصاميم يومية جذابة", "Daily Engaging Designs"), t("تحليل البيانات والمتابعة", "Data Analysis & Tracking")],
      pageSlug: "social-growth",
    },
  ];

  return (
    <section id="services" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
      <div className="container mx-auto" dir={isArabic ? 'rtl' : 'ltr'}>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 sm:mb-4 text-foreground reveal">
          {t('خدمات', 'Services')} <span className="text-primary">{t('Lumos', 'That Convert')}</span>
        </h2>
        <p className="text-center text-muted-foreground mb-10 sm:mb-12 md:mb-16 text-sm sm:text-base lg:text-lg reveal">
          {t('نحن استوديو نمو رقمي يربط الهوية + الويب + المحتوى بنتيجة تجارية واضحة.', 'We are a digital growth studio connecting brand, web, and content to clear business outcomes.')}
        </p>

        <div className="flex gap-4 overflow-x-auto pb-4 md:overflow-visible md:grid md:grid-cols-3 md:gap-8 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0">
          {services.map((service, index) => {
            // Map the service title to a specific category key for the pricing modal
            const getCategoryForService = (titleStr: string) => {
              if (titleStr.includes("تطوير الويب") || titleStr.includes("Web")) return "web";
              if (titleStr.includes("الهوية البصرية") || titleStr.includes("Brand")) return "brand_identity";
              if (titleStr.includes("السوشيال ميديا") || titleStr.includes("Social")) return "growth_ads";
              return "web";
            };

            const handleServiceClick = () => {
              const category = getCategoryForService(service.title);
              // Dispatch event to EnhancedNavbar/FloatingDock to open Pricing Modal
              const event = new CustomEvent("lumos:open-pricing", {
                detail: { request: { request_type: 'custom', selected_services: [{ category }] } }
              });
              window.dispatchEvent(event);
            };

            return (
              <div
                key={index}
                onClick={handleServiceClick}
                className="reveal glass-card rounded-2xl glow-border-hover cursor-pointer group bg-background hover-lift overflow-hidden flex-shrink-0 w-[85%] sm:w-[70%] md:w-auto snap-center"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Image Section */}
                <div className="relative h-48 sm:h-56 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent pointer-events-none" />
                  <div className="absolute top-4 right-4 transform group-hover:scale-110 transition-transform duration-300 text-primary drop-shadow-lg">
                    {service.icon}
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6 sm:p-8">
                  <h3 className="text-2xl font-bold mb-3 text-foreground">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                    {service.description}
                  </p>

                  {/* Features List */}
                  <div className="space-y-2 mb-4">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 shimmer-line mb-4" />

                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/services/${service.pageSlug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs sm:text-sm font-semibold text-primary hover:underline"
                    >
                      {t('تفاصيل الخدمة', 'Service Details')}
                    </Link>
                    <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                      {t('اضغط البطاقة للتسعير', 'Tap card for pricing')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EnhancedServices;

