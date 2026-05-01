import { useLanguage } from "@/context/LanguageContext";
import { 
  Code2, Palette, TrendingUp, Layers, Lock, ShoppingCart 
} from "lucide-react";

// Add custom CSS for the marquee animation
const style = `
  @keyframes marquee {
    0% { transform: translateX(0%); }
    100% { transform: translateX(-50%); }
  }
  @keyframes marquee-rtl {
    0% { transform: translateX(0%); }
    100% { transform: translateX(50%); }
  }
  .animate-marquee {
    animation: marquee 35s linear infinite;
  }
  .animate-marquee-rtl {
    animation: marquee-rtl 35s linear infinite;
  }
  .animate-marquee:hover, .animate-marquee-rtl:hover {
    animation-play-state: paused;
  }
`;

const TechStack = () => {
  const { t, isArabic } = useLanguage();

  // Exactly matching the pricing.ts categories
  const categories = [
    { icon: <Code2 className="w-6 h-6 sm:w-8 sm:h-8" />, name: t('تطوير المواقع', 'Web Development'), tag: "Core" },
    { icon: <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8" />, name: t('تحسينات التجارة الإلكترونية', 'E-Commerce'), tag: "Boost" },
    { icon: <Layers className="w-6 h-6 sm:w-8 sm:h-8" />, name: t('البراند والتجربة', 'Brand Experience'), tag: "Creative" },
    { icon: <Palette className="w-6 h-6 sm:w-8 sm:h-8" />, name: t('الهوية البصرية', 'Brand Identity'), tag: "Visual" },
    { icon: <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />, name: t('الإعلانات والنمو', 'Growth & Ads'), tag: "Marketing" },
    { icon: <Lock className="w-6 h-6 sm:w-8 sm:h-8" />, name: t('الأمان والأداء', 'Security & Performance'), tag: "Tech" },
  ];

  // For a seamless infinite scroll, we duplicate the array so it can loop
  const duplicatedCategories = [...categories, ...categories, ...categories];

  return (
    <section className="py-8 sm:py-12 bg-background relative overflow-hidden flex flex-col justify-center border-y border-white/5">
      <style>{style}</style>
      
      {/* Decorative gradient backgrounds */}
      <div className="absolute inset-0 bg-primary/5 blur-[100px] pointer-events-none opacity-50" />

      <div className="container mx-auto mb-6 sm:mb-8 relative z-10 px-4">
        <h3 className="text-center text-muted-foreground font-semibold tracking-wider uppercase text-[10px] sm:text-xs">
          {t("مجالات نتميز بها", "Core Expertise We Master")}
        </h3>
      </div>

      <div className="relative flex flex-col overflow-hidden">
        {/* Single Row - Moves Left/Right based on Lang */}
        <div className="flex w-[300%] sm:w-[200%] md:w-[150%] xl:w-[100%]">
          <div className={`flex w-full gap-3 sm:gap-4 ${isArabic ? 'animate-marquee-rtl' : 'animate-marquee'}`}>
            {duplicatedCategories.map((cat, index) => (
              <div
                key={`cat-${index}`}
                className="flex-shrink-0 w-44 sm:w-56"
              >
                <div className="flex items-center gap-3 sm:gap-4 glass-card px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-white/10 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-sm hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-300 hover:-translate-y-1 group cursor-pointer relative overflow-hidden">
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="text-slate-400 group-hover:text-emerald-400 transition-colors duration-300 relative z-10 group-hover:scale-110">
                    {cat.icon}
                  </div>
                  <div className="text-start relative z-10">
                    <h3 className="text-sm sm:text-[15px] font-bold text-foreground leading-tight group-hover:text-emerald-50 transition-colors duration-300">{cat.name}</h3>
                    <p className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground group-hover:text-emerald-500/70 uppercase tracking-widest mt-0.5 transition-colors duration-300">{cat.tag}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gradient Overlays to smoothly fade the edges */}
        <div className="absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
      </div>
    </section>
  );
};

export default TechStack;

