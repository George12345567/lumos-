import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Users, Code, Sparkles, Mail, HeartHandshake } from "lucide-react";

const AboutStats = () => {
  const { t, isArabic } = useLanguage();
  const [counts, setCounts] = useState({ satisfaction: 0, support: 0, projects: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateCounters();
          }
        });
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const animateCounters = () => {
    const duration = 2000;
    const steps = 60;
    const increment = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;

      setCounts({
        satisfaction: Math.floor(100 * progress),
        support: Math.floor(24 * progress),
        projects: Math.floor(5 * progress),
      });

      if (step >= steps) {
        clearInterval(timer);
        setCounts({ satisfaction: 100, support: 24, projects: 5 });
      }
    }, increment);
  };

  return (
    <section
      ref={sectionRef}
      id="about"
      className="py-16 sm:py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden bg-background"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-orb pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px] animate-orb-delayed pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none opacity-50 dark:opacity-0" />

      <div className="container mx-auto relative z-10 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: About Text */}
          <div className="reveal space-y-6 lg:pr-8" dir={isArabic ? 'rtl' : 'ltr'}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-2">
              <Sparkles className="w-4 h-4" />
              {t("شركاء في النمو", "Partners in Growth")}
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              {t("من هي", "Who is")} <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">Lumos؟</span>
            </h2>

            <div className="space-y-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
              <p>
                {t(
                  "نحن أكثر من مجرد وكالة رقمية؛ نحن شريكك الاستراتيجي في رحلة النمو. نؤمن بأن نجاحك هو نجاحنا، ولذلك نضع الجودة والاحترافية في صميم كل ما نقدمه، مع التركيز الأكبر على الويب لجعله واجهة تعكس هوية علامتك التجارية بأرقى صورة.",
                  "We are more than just a digital agency; we are your strategic partner in growth. We believe your success is our success, which is why quality and professionalism are at the core of everything we do, with a strong focus on the web to make it a premium reflection of your brand."
                )}
              </p>

              <div className="flex gap-4 items-start p-5 rounded-2xl bg-secondary/20 border border-border/50 backdrop-blur-sm">
                <Users className="w-8 h-8 text-primary shrink-0 mt-1" />
                <p className="text-sm sm:text-base text-foreground/90">
                  {t(
                    "يضم فريقنا نخبة من مصممي الجرافيك، مطوري الويب والبرمجيات، وطلبة علوم الحاسب المتدربين، الذين يجمعهم الشغف بتطوير الهويات البصرية وبناء منصات رقمية تتطور يوماً بعد يوم لتلبي احتياجات عملائنا المتجددة.",
                    "Our team consists of elite graphic designers, web & software developers, and intern computer science students, all united by a passion for developing brand identities and building digital platforms that evolve every day to meet our clients' changing needs."
                  )}
                </p>
              </div>

              <p>
                {t(
                  "ليس لدينا قوالب ثابتة، بل نصنع حلولاً مخصصة تناسب حجم طموحك. وإذا كنت في بداية طريقك وتحتاج إلى مساعدة حقيقية، فنحن هنا لدعمك. لا تتردد في التواصل معنا.",
                  "We don't offer rigid templates; we craft custom solutions that fit your ambitions. And if you are just starting out and need a real helping hand, we are here for you. Feel free to reach out to us."
                )}
              </p>
            </div>

            <div className="pt-4 flex flex-wrap gap-4">
              <a
                href="mailto:contact@getlumos.studio"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold transition-all hover:scale-105"
              >
                <Mail className="w-5 h-5" />
                contact@getlumos.studio
              </a>
              <button
                onClick={() => {
                  const contactSection = document.getElementById('contact');
                  if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-semibold transition-all hover:scale-105"
              >
                <HeartHandshake className="w-5 h-5" />
                {t("فلنبدأ معاً", "Let's Start Together")}
              </button>
            </div>
          </div>

          {/* Right: Modern Stats & Values Grid */}
          <div className="grid gap-4 sm:gap-6 lg:pl-10 relative">
            {/* Center glowing orb behind cards */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {/* Stat Card 1 */}
              <div className="glass-card p-6 sm:p-8 rounded-3xl text-center reveal hover-lift glow-ring border border-white/10 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl flex flex-col justify-center transform translate-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 border border-primary/20">
                  <Code className="w-6 h-6 text-primary" />
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-foreground mb-1">
                  {counts.projects}+
                </div>
                <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("مشاريع", "Projects")}
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="glass-card p-6 sm:p-8 rounded-3xl text-center reveal hover-lift glow-ring border border-white/10 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-xl flex flex-col justify-center transform -translate-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-4 border border-emerald-500/20">
                  <Users className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-foreground mb-1">
                  {counts.satisfaction}%
                </div>
                <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("رضا العملاء", "Satisfaction")}
                </div>
              </div>
            </div>

            {/* Stat Card 3 (Full Width) */}
            <div className="glass-card p-6 sm:p-8 rounded-3xl text-center reveal hover-lift glow-ring border border-white/10 dark:border-white/5 bg-gradient-to-r from-primary/10 via-background to-primary/5 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
              <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
              <div className="text-left" dir={isArabic ? 'rtl' : 'ltr'}>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {t("دعم والتزام مستمر", "Continuous Support")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {t("نحن متواجدون باستمرار لضمان عمل منصاتك بكفاءة عالية.", "We are constantly available to ensure your platforms run with high efficiency.")}
                </p>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-5xl sm:text-6xl font-black bg-gradient-to-br from-primary to-emerald-400 bg-clip-text text-transparent">
                  {counts.support}
                </span>
                <span className="text-2xl font-bold text-muted-foreground mb-1">/7</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutStats;


