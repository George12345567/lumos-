import { Search, Lightbulb, Rocket, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const ProcessTimeline = () => {
  const { isArabic, t } = useLanguage();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const steps = [
    {
      icon: Search,
      title: { ar: "استخبارات الأعمال", en: "Discovery" },
      desc: { ar: "تحليل دقيق للبيانات والفرص لاكتشاف المسار الأمثل لعلامتك.", en: "Rigorous data analysis to uncover hidden potential and optimal paths." },
      number: "01",
      accent: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: Lightbulb,
      title: { ar: "بناء الاستراتيجية", en: "Strategy" },
      desc: { ar: "تصميم مخطط معماري رقمي يدمج الرؤية مع التكنولوجيا لبناء أساس صلب.", en: "Architecting a blueprint that aligns vision with uncompromising technical precision." },
      number: "02",
      accent: "from-purple-500/20 to-pink-500/20"
    },
    {
      icon: Rocket,
      title: { ar: "التطوير الذكي", en: "Execution" },
      desc: { ar: "تحويل الأفكار إلى واقع ببرمجيات وتصاميم فائقة الأداء.", en: "Forging ideas into reality with high-performance code and pixel-perfect design." },
      number: "03",
      accent: "from-orange-500/20 to-red-500/20"
    },
    {
      icon: CheckCircle2,
      title: { ar: "الإطلاق والنمو", en: "Scale" },
      desc: { ar: "إطلاق واثق متبوع بتحسين مستمر لضمان أعلى عائد استثماري ممكن.", en: "Confident deployment followed by continuous optimization for maximum sustainable ROI." },
      number: "04",
      accent: "from-emerald-500/20 to-teal-500/20"
    },
  ];

  return (
    <section className="bg-background py-24 sm:py-32 overflow-hidden relative">
      {/* Very subtle ambient background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.03),transparent_50%)]" />

      <div className="container mx-auto px-4 max-w-7xl relative z-10" dir={isArabic ? "rtl" : "ltr"}>
        
        {/* Header - Editorial Style */}
        <div className="mb-24 text-center md:text-start md:flex md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl mb-6">
              {t("مسار", "The ")} 
              <span className="text-primary italic font-serif mx-2 relative inline-block">
                {t("العمل", "Process")}
                <span className="absolute -bottom-2 left-0 w-full h-[2px] bg-primary/30 rounded-full" />
              </span>
            </h2>
            <p className="text-base text-muted-foreground md:text-lg md:leading-relaxed max-w-lg font-medium">
              {t(
                "منهجية مبسطة تحول الأفكار المعقدة إلى نتائج رقمية استثنائية.",
                "A simplified methodology transforming complex ideas into exceptional digital results."
              )}
            </p>
          </div>
        </div>

        {/* The Accordion Layout */}
        <div className="flex flex-col md:flex-row h-auto md:h-[600px] w-full gap-4 lg:gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isHovered = hoveredIndex === index;
            // On desktop, the first one is open by default if nothing is hovered
            const isActive = hoveredIndex === null ? index === 0 : isHovered;

            return (
              <motion.div
                key={step.number}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                animate={{
                  flex: isActive ? (typeof window !== "undefined" && window.innerWidth >= 768 ? 3.5 : 1) : 1,
                }}
                transition={{ duration: 0.7, type: "spring", bounce: 0.15 }}
                className={`relative overflow-hidden rounded-[2.5rem] cursor-pointer group transition-colors duration-500 ${
                  isActive ? "bg-card border-transparent shadow-xl shadow-primary/5" : "bg-muted/30 border border-border/40 hover:bg-muted/60"
                }`}
                style={{ minHeight: "140px" }}
              >
                {/* Active Panel Gradient Blob (Subtle) */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.8 }}
                      className={`absolute -top-32 ${isArabic ? '-left-32' : '-right-32'} w-96 h-96 bg-gradient-to-br ${step.accent} rounded-full blur-[100px] pointer-events-none opacity-60`}
                    />
                  )}
                </AnimatePresence>

                {/* Massive Watermark Number */}
                <div className={`absolute ${isArabic ? '-left-8' : '-right-8'} -bottom-10 pointer-events-none transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                   <span className="text-[16rem] font-black leading-none text-primary/[0.03] select-none">
                     {step.number}
                   </span>
                </div>

                {/* Mobile Layout (Standard stack) */}
                <div className="md:hidden p-6 sm:p-8 h-full flex flex-col justify-center relative z-10">
                  <div className="flex items-center gap-5 mb-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground shadow-sm'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className={`text-2xl font-bold tracking-tight ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {t(step.title.ar, step.title.en)}
                    </h3>
                  </div>
                  <AnimatePresence>
                    {isActive && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, y: 10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                        className="pl-[4.25rem]" // Align with text
                      >
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
                          {t(step.desc.ar, step.desc.en)}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Desktop Layout (Accordion) */}
                <div className="hidden md:flex h-full w-full relative z-10">
                  
                  {/* Number & Icon Strip (Always visible, left side) */}
                  <div className="flex flex-col items-center justify-between py-10 px-6 min-w-[100px] h-full z-20">
                    <div className="relative">
                      <span className={`text-2xl font-serif italic transition-all duration-500 ${isActive ? "text-primary font-bold" : "text-muted-foreground/40 font-light"}`}>
                        {step.number}
                      </span>
                      {/* Animated dot indicator under number */}
                      {isActive && (
                        <motion.div 
                          layoutId="activeDot"
                          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      )}
                    </div>

                    <div className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500 ${isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110' : 'bg-background text-muted-foreground shadow-sm group-hover:scale-105 group-hover:text-foreground'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Expanded Content Area */}
                  <div className="relative flex-1 overflow-hidden h-full">
                    <AnimatePresence>
                      {isActive && (
                        <motion.div 
                          initial={{ opacity: 0, x: isArabic ? -20 : 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: isArabic ? 10 : -10 }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                          className="absolute inset-0 p-12 lg:p-16 flex flex-col justify-end"
                        >
                           <motion.h3 
                             initial={{ y: 20, opacity: 0 }}
                             animate={{ y: 0, opacity: 1 }}
                             transition={{ duration: 0.5, delay: 0.2 }}
                             className="text-4xl lg:text-5xl font-extrabold mb-6 tracking-tight text-foreground"
                           >
                             {t(step.title.ar, step.title.en)}
                           </motion.h3>
                           <motion.p 
                             initial={{ y: 20, opacity: 0 }}
                             animate={{ y: 0, opacity: 1 }}
                             transition={{ duration: 0.5, delay: 0.3 }}
                             className="text-lg lg:text-xl text-muted-foreground max-w-md leading-relaxed font-medium"
                           >
                             {t(step.desc.ar, step.desc.en)}
                           </motion.p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Vertical Title (when collapsed) */}
                    <AnimatePresence>
                      {!isActive && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <h3 className="text-2xl font-bold text-muted-foreground/30 whitespace-nowrap origin-center -rotate-90 tracking-widest uppercase transition-colors duration-300 group-hover:text-muted-foreground/60">
                            {t(step.title.ar, step.title.en)}
                          </h3>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default ProcessTimeline;
