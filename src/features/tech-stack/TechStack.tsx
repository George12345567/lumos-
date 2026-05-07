import { useState, useRef, useCallback, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Code2, Terminal, Database, Braces, Layout, Sparkles,
  Server, Shield, Paintbrush, Film, PenTool, Cloud, GitBranch, BadgeCheck, Zap
} from "lucide-react";

interface Tool {
  id: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  proficiency: number;
  color: string;
  icon: React.ReactNode;
  licensed: boolean;
  descAr: string;
  descEn: string;
  powerAr: string;
  powerEn: string;
}

interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  color: string;
}

const categories: Category[] = [
  { id: "ides", nameAr: "بيئات التطوير", nameEn: "IDEs & Dev Tools", color: "#00CDD7" },
  { id: "frontend", nameAr: "تطوير الواجهات", nameEn: "Frontend", color: "#61DAFB" },
  { id: "backend", nameAr: "الخلفية والبنية", nameEn: "Backend & Infra", color: "#339933" },
  { id: "design", nameAr: "التصميم والهوية", nameEn: "Design & Brand", color: "#FF9A00" },
  { id: "deploy", nameAr: "النشر والأمان", nameEn: "Deploy & Security", color: "#888888" },
];

const tools: Tool[] = [
  { id: "webstorm", nameAr: "WebStorm", nameEn: "JetBrains WebStorm", categoryId: "ides", proficiency: 95, color: "#00CDD7", licensed: true, descAr: "بيئة تطوير متقدمة من JetBrains", descEn: "Advanced IDE by JetBrains", powerAr: "النسخة المدفوعة بالكامل — نكتب كود أسرع وأنظف بفضل الذكاء الذاتي وإعادة الهيكلة المتقدمة", powerEn: "Full paid license — we write faster, cleaner code leveraging AI completion and advanced refactoring", icon: <Terminal className="w-5 h-5" /> },
  { id: "datagrip", nameAr: "DataGrip", nameEn: "JetBrains DataGrip", categoryId: "ides", proficiency: 90, color: "#21B9E0", licensed: true, descAr: "أداة إدارة قواعد البيانات", descEn: "Cross-database IDE", powerAr: "ترخيص كامل — ندير قواعد البيانات بأي محرك بكفاءة عالية وأمان تام", powerEn: "Full license — we manage any database engine efficiently and securely", icon: <Database className="w-5 h-5" /> },
  { id: "vscode", nameAr: "VS Code", nameEn: "VS Code", categoryId: "ides", proficiency: 95, color: "#007ACC", licensed: false, descAr: "محرر أكواد خفيف ومفتوح المصدر", descEn: "Lightweight, extensible code editor", powerAr: "إضافات مخصصة ومجهزة بعناية — بيئة عمل سريعة ومحسنة لأداء فائق", powerEn: "Custom-tuned extensions — fast, optimized workspace for peak productivity", icon: <Braces className="w-5 h-5" /> },
  { id: "git", nameAr: "Git", nameEn: "Git & GitHub", categoryId: "ides", proficiency: 95, color: "#F05032", licensed: false, descAr: "نظام التحكم بالإصدارات والتعاون", descEn: "Version control & collaboration", powerAr: "سير عمل GitFlow متقدم — نشر البناء تلقائياً ومراجعة كود صارمة لكل سطر", powerEn: "Advanced GitFlow — automated deployments and strict code review on every line", icon: <GitBranch className="w-5 h-5" /> },
  { id: "react", nameAr: "React", nameEn: "React", categoryId: "frontend", proficiency: 98, color: "#61DAFB", licensed: false, descAr: "مكتبة بناء واجهات تفاعلية من Meta", descEn: "Component-based UI library by Meta", powerAr: "خبرة عميقة — نبني مكونات قابلة لإعادة الاستخدام مع أداءproduction-grade", powerEn: "Deep expertise — reusable components with production-grade performance", icon: <Code2 className="w-5 h-5" /> },
  { id: "nextjs", nameAr: "Next.js", nameEn: "Next.js", categoryId: "frontend", proficiency: 95, color: "#ffffff", licensed: false, descAr: "إطار React للإنتاج مع SSR و APIs", descEn: "Production-grade React framework with SSR", powerAr: "نستغله بالكامل — SSR لتصدر نتائج البحث وAPI Routes لسرعات خارقة", powerEn: "We leverage it fully — SSR for SEO dominance and API Routes for blazing speed", icon: <Layout className="w-5 h-5" /> },
  { id: "typescript", nameAr: "TypeScript", nameEn: "TypeScript", categoryId: "frontend", proficiency: 97, color: "#3178C6", licensed: false, descAr: "أكواد آمنة بأنواع قوية من Microsoft", descEn: "Type-safe JavaScript superset", powerAr: "أنواع صارمة — أقل أخطاء، كود أكبر قابل للتطوير والصيانة", powerEn: "Strict typing — fewer bugs, scalable codebase built to last", icon: <Braces className="w-5 h-5" /> },
  { id: "vite", nameAr: "Vite", nameEn: "Vite", categoryId: "frontend", proficiency: 93, color: "#646CFF", licensed: false, descAr: "أداة بناء فائقة السرعة", descEn: "Lightning-fast build tool", powerAr: "بناء فوري — تجربة مطور سلسة مع Hot Module Replacement فائق السرعة", powerEn: "Instant builds — frictionless dev experience with ultra-fast HMR", icon: <Sparkles className="w-5 h-5" /> },
  { id: "tailwind", nameAr: "Tailwind CSS", nameEn: "Tailwind CSS", categoryId: "frontend", proficiency: 98, color: "#06B6D4", licensed: false, descAr: "إطار CSS مرن للتصميم السريع", descEn: "Utility-first CSS framework", powerAr: "تصميم مخصص بالكامل — لا قوالب جاهزة، كل بكسل مصمم خصيصاً", powerEn: "100% custom design — no templates, every pixel is intentional", icon: <Paintbrush className="w-5 h-5" /> },
  { id: "framer", nameAr: "Framer Motion", nameEn: "Framer Motion", categoryId: "frontend", proficiency: 90, color: "#0055FF", licensed: false, descAr: "مكتبة رسوم متحركة قوية لـ React", descEn: "Animation library for React", powerAr: "حركات راقية — واجهات سلسة تليق بالعلامات التجارية المتميزة", powerEn: "Polished micro-interactions — interfaces that feel premium and alive", icon: <Film className="w-5 h-5" /> },
  { id: "nodejs", nameAr: "Node.js", nameEn: "Node.js", categoryId: "backend", proficiency: 92, color: "#339933", licensed: false, descAr: "بيئة تشغيل JavaScript على الخادم", descEn: "JavaScript runtime for server-side", powerAr: "بنية خلفية قابلة للتوسع — APIs سريعة ومستقرة تتحمل الضغط العالي", powerEn: "Scalable backend — fast, stable APIs that handle heavy traffic", icon: <Server className="w-5 h-5" /> },
  { id: "supabase", nameAr: "Supabase", nameEn: "Supabase", categoryId: "backend", proficiency: 88, color: "#3ECF8E", licensed: false, descAr: "بديل Firebase مفتوح المصدر", descEn: "Open-source Firebase alternative", powerAr: "قاعدة بيانات حقيقية مع مصادقة وتخزين — بنية تحتية خلفية متكاملة وسريعة", powerEn: "Real-time database with auth and storage — complete backend infra, fast", icon: <Database className="w-5 h-5" /> },
  { id: "illustrator", nameAr: "Illustrator", nameEn: "Adobe Illustrator", categoryId: "design", proficiency: 93, color: "#FF9A00", licensed: true, descAr: "أداة التصميم الاحترافي للفيكتور", descEn: "Industry-standard vector design", powerAr: "نسخة مدفوعة بالكامل — شعارات وهويات بصرية فيكتور بدقة لا نهائية", powerEn: "Full paid license — logos and brand identities with infinite vector precision", icon: <PenTool className="w-5 h-5" /> },
  { id: "photoshop", nameAr: "Photoshop", nameEn: "Adobe Photoshop", categoryId: "design", proficiency: 95, color: "#31A8FF", licensed: true, descAr: "أداة تحرير الصور الأولى", descEn: "Premier photo editing suite", powerAr: "نسخة مدفوعة بالكامل — تعديل صور احترافي يرفع من جودة أي تصميم", powerEn: "Full paid license — professional photo editing that elevates every design", icon: <Paintbrush className="w-5 h-5" /> },
  { id: "aftereffects", nameAr: "After Effects", nameEn: "Adobe After Effects", categoryId: "design", proficiency: 88, color: "#9999FF", licensed: true, descAr: "تصميم رسوم متحركة ومونتاج فيديو", descEn: "Motion design & video compositing", powerAr: "نسخة مدفوعة — حركات ومقاطع فيديو تجعل علامتك التجارية تتحرك وتعيش", powerEn: "Full paid license — motion and video that bring brands to life", icon: <Film className="w-5 h-5" /> },
  { id: "figma", nameAr: "Figma", nameEn: "Figma", categoryId: "design", proficiency: 90, color: "#F24E1E", licensed: true, descAr: "أداة تصميم واجهات تعاونية", descEn: "Collaborative UI design tool", powerAr: "خطة مدفوعة — تصميم واجهات احترافية مع نظام مكونات متكامل ورموز تصميم", powerEn: "Paid plan — professional UI design with full component systems and design tokens", icon: <PenTool className="w-5 h-5" /> },
  { id: "vercel", nameAr: "Vercel", nameEn: "Vercel", categoryId: "deploy", proficiency: 92, color: "#888888", licensed: true, descAr: "منصة نشر Pro متقدمة", descEn: "Pro-tier deployment platform", powerAr: "خطة Pro — نشر فوري مع CDN عالمي وSSL ومراقبة أداء حقيقية", powerEn: "Pro plan — instant deploys with global CDN, SSL, and real performance monitoring", icon: <Cloud className="w-5 h-5" /> },
  { id: "ssl", nameAr: "SSL / CDN", nameEn: "SSL & CDN", categoryId: "deploy", proficiency: 88, color: "#10B981", licensed: true, descAr: "شهادات أمان وشبكة توزيع محتوى متميزة", descEn: "Enterprise SSL & premium CDN", powerAr: "بنية أمان احترافية — HTTPS إلزامي وCDN يضمن سرعة التحميل عالمياً", powerEn: "Pro-grade security — enforced HTTPS and CDN ensuring global load speed", icon: <Shield className="w-5 h-5" /> },
];

const row1 = tools.slice(0, 9);
const row2 = tools.slice(9, 18);

const MarqueeRow = ({
  items,
  isArabic,
  reverse,
  isPaused,
  setPaused,
  hoveredTool,
  setHoveredTool,
}: {
  items: Tool[];
  isArabic: boolean;
  reverse: boolean;
  isPaused: boolean;
  setPaused: (p: boolean) => void;
  hoveredTool: string | null;
  setHoveredTool: (id: string | null) => void;
}) => {
  const doubled = [...items, ...items];
  const animClass = reverse
    ? isArabic ? "ts-ltr" : "ts-rtl"
    : isArabic ? "ts-rtl" : "ts-ltr";

  return (
    <div
      className="flex overflow-visible"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); setHoveredTool(null); }}
    >
      <div
        className={`flex gap-3 sm:gap-4 ${animClass}`}
        style={isPaused ? { animationPlayState: "paused" } : undefined}
      >
        {doubled.map((tool, i) => {
          const isHovered = hoveredTool === tool.id;
          const nearHovered = hoveredTool !== null && !isHovered;

          return (
            <div
              key={`${tool.id}-${i}`}
              className="flex-shrink-0"
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
            >
              <div
                className={`
                  group relative flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3
                  rounded-xl sm:rounded-2xl cursor-pointer select-none
                  border transition-all duration-300 ease-out
                  ${isHovered
                    ? "border-primary/40 shadow-lg shadow-primary/10 scale-110 z-30"
                    : nearHovered
                      ? "border-white/10 dark:border-white/5 scale-[0.95] opacity-50"
                      : "border-white/10 dark:border-white/5 scale-100"
                  }
                `}
                style={{
                  backgroundColor: isHovered
                    ? "rgba(16,185,129,0.08)"
                    : "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                  minWidth: isHovered ? "175px" : "145px",
                }}
              >
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
                  style={{
                    backgroundColor: `${tool.color}20`,
                    color: tool.color,
                    boxShadow: isHovered ? `0 0 20px ${tool.color}50` : "none",
                  }}
                >
                  {tool.icon}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs sm:text-sm font-bold leading-tight truncate transition-colors duration-300 ${isHovered ? "text-foreground" : "text-foreground/80"}`}>
                      {isArabic ? tool.nameAr : tool.nameEn}
                    </span>
                    {tool.licensed && isHovered && (
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-[3px] mt-1">
                    {[...Array(5)].map((_, dot) => (
                      <div
                        key={dot}
                        className={`h-[3px] rounded-full transition-all duration-300 ${
                          dot < Math.round(tool.proficiency / 20) ? "w-3" : "w-1.5 opacity-30"
                        }`}
                        style={{
                          backgroundColor: dot < Math.round(tool.proficiency / 20) ? tool.color : "currentColor",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ToolDetailCard = ({ tool, isArabic }: { tool: Tool | null; isArabic: boolean }) => {
  if (!tool) return null;
  const cat = categories.find(c => c.id === tool.categoryId);

  return (
    <div className="animate-fade-in-up w-full max-w-md mx-auto">
      <div className="glass-card p-4 sm:p-5 rounded-2xl border border-primary/30 backdrop-blur-xl shadow-xl shadow-primary/10">
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${tool.color}20`,
              color: tool.color,
              boxShadow: `0 0 24px ${tool.color}30`,
            }}
          >
            {tool.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-base sm:text-lg font-bold text-foreground truncate">
                {isArabic ? tool.nameAr : tool.nameEn}
              </h4>
              {tool.licensed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shrink-0">
                  <BadgeCheck className="w-3 h-3" />
                  {isArabic ? "مدفوع" : "PAID"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                style={{ color: cat?.color, backgroundColor: `${cat?.color}15` }}
              >
                {isArabic ? cat?.nameAr : cat?.nameEn}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {isArabic ? tool.descAr : tool.descEn}
              </span>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                {isArabic ? tool.powerAr : tool.powerEn}
              </p>
            </div>

            <div className="flex items-center justify-between mt-3 mb-1">
              <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                {isArabic ? "مستوى الإتقان" : "Mastery Level"}
              </span>
              <span className="text-xs sm:text-sm font-black" style={{ color: tool.color }}>
                {tool.proficiency}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${tool.proficiency}%`,
                  background: `linear-gradient(90deg, ${tool.color}, ${tool.color}bb)`,
                  boxShadow: `0 0 12px ${tool.color}50`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TechStack = () => {
  const { t, isArabic } = useLanguage();
  const [hoveredTool, setHoveredTool] = useState<Tool | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const handleSetHoveredTool = useCallback((id: string | null) => {
    if (id) {
      const tool = tools.find(t => t.id === id);
      if (tool) setHoveredTool(tool);
    } else {
      setHoveredTool(null);
    }
  }, []);

  const handleSetPaused = useCallback((p: boolean) => {
    setIsPaused(p);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-8 sm:py-12 md:py-16 relative overflow-hidden bg-background"
    >
      <style>{`
        @keyframes ts-ltr {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes ts-rtl {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .ts-ltr { animation: ts-ltr 40s linear infinite; }
        .ts-rtl { animation: ts-rtl 40s linear infinite; }
      `}</style>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] opacity-50" />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto mb-6 sm:mb-8 px-4">
          <div className="flex flex-col items-center gap-3 reveal">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              {t("تقنياتنا", "Our Tech Stack")}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground text-center">
              {t("مجالات نتميز بها", "Core Expertise We Master")}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm max-w-xl text-center">
              {t(
                "نستخدم أقوى النسخ والأدوات المدفوعة — ليس مجرد برامج مجانية، بل تراخيص كاملة تضمن جودة احترافية.",
                "We use the most powerful paid tools and licenses — not just free tiers, but full professional subscriptions."
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:gap-5">
          <div className="relative">
            <MarqueeRow
              items={row1}
              isArabic={isArabic}
              reverse={false}
              isPaused={isPaused}
              setPaused={handleSetPaused}
              hoveredTool={hoveredTool?.id ?? null}
              setHoveredTool={handleSetHoveredTool}
            />
          </div>

          <div className="relative">
            <MarqueeRow
              items={row2}
              isArabic={isArabic}
              reverse={true}
              isPaused={isPaused}
              setPaused={handleSetPaused}
              hoveredTool={hoveredTool?.id ?? null}
              setHoveredTool={handleSetHoveredTool}
            />
          </div>
        </div>

        {hoveredTool && (
          <div className="container mx-auto mt-6 sm:mt-8 px-4">
            <ToolDetailCard tool={hoveredTool} isArabic={isArabic} />
          </div>
        )}
      </div>
    </section>
  );
};

export default TechStack;