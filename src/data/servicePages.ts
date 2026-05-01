export type ServicePageContent = {
    slug: string;
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
    summaryAr: string;
    summaryEn: string;
    bulletsAr: string[];
    bulletsEn: string[];
    keywords: string;
};

export const SERVICE_PAGES: ServicePageContent[] = [
    {
        slug: "web-systems",
        titleAr: "تطوير الويب والأنظمة",
        titleEn: "Web & Systems Development",
        subtitleAr: "مواقع ومنصات تركّز على الأداء والتحويل",
        subtitleEn: "Websites and platforms built for performance and conversion",
        summaryAr:
            "نصمم ونطوّر مواقع ومنصات مخصصة تعكس هوية العلامة التجارية وتدعم أهداف النمو التجاري بخطة تنفيذ واضحة.",
        summaryEn:
            "We design and build custom websites and web systems that reflect your brand and support measurable business growth.",
        bulletsAr: [
            "تصميم واجهات متجاوبة وتجربة مستخدم واضحة",
            "تطوير واجهات وخلفيات حسب احتياج المشروع",
            "تحسين الأداء والسرعة وتجربة الموبايل",
            "تهيئة تقنية SEO أساسية من البداية",
        ],
        bulletsEn: [
            "Responsive UI and clear user experience architecture",
            "Custom frontend and backend implementation",
            "Performance optimization for mobile and desktop",
            "SEO-ready technical foundations from day one",
        ],
        keywords: "web development, custom website, system development, SEO-ready website",
    },
    {
        slug: "brand-identity",
        titleAr: "تصميم الهوية البصرية",
        titleEn: "Brand Identity Design",
        subtitleAr: "هوية متماسكة تمنح علامتك حضورًا واضحًا",
        subtitleEn: "A cohesive identity that gives your brand clear market presence",
        summaryAr:
            "نبني هوية بصرية متكاملة تشمل الشعار، الألوان، الخطوط، والنظام التصميمي حتى تصبح العلامة أكثر تميزًا وثباتًا عبر كل نقاط التواصل.",
        summaryEn:
            "We craft complete brand identity systems including logo, color palette, typography, and visual language for a stronger, more consistent market presence.",
        bulletsAr: [
            "بناء استراتيجية بصرية متوافقة مع جمهورك",
            "تصميم الشعار وأنظمته واستخداماته",
            "دليل هوية مبسّط للتطبيق العملي",
            "أصول بصرية للاستخدام على الويب والسوشيال",
        ],
        bulletsEn: [
            "Visual direction aligned with your audience",
            "Logo system with practical usage variants",
            "Actionable mini brand guideline",
            "Brand assets for web and social channels",
        ],
        keywords: "brand identity design, logo design, visual identity, brand guidelines",
    },
    {
        slug: "social-growth",
        titleAr: "إدارة السوشيال والنمو",
        titleEn: "Social Media & Growth",
        subtitleAr: "محتوى وتنفيذ يحوّل التفاعل إلى طلبات فعلية",
        subtitleEn: "Content and execution that turns engagement into qualified leads",
        summaryAr:
            "ندير قنوات السوشيال بخطة محتوى واستراتيجية نشر ومتابعة أداء مستمرة لزيادة الوعي وبناء ثقة وتحويل أعلى.",
        summaryEn:
            "We manage your social channels with clear content strategy, publishing cadence, and performance tracking to grow awareness, trust, and conversions.",
        bulletsAr: [
            "خطة محتوى شهرية مرتبطة بهدف تجاري",
            "تصميمات ومنشورات متسقة مع البراند",
            "تحسين الرسائل والعروض حسب النتائج",
            "تقارير أداء مختصرة قابلة للتنفيذ",
        ],
        bulletsEn: [
            "Monthly content plan tied to business goals",
            "Consistent branded posts and visual assets",
            "Offer and messaging optimization based on results",
            "Short actionable performance reports",
        ],
        keywords: "social media management, growth marketing, content strategy, lead generation",
    },
];

export const SERVICE_PAGE_BY_SLUG = Object.fromEntries(
    SERVICE_PAGES.map((service) => [service.slug, service])
) as Record<string, ServicePageContent>;
