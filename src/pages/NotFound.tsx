import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { useLanguage } from "@/context/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { isArabic, t } = useLanguage();

  useEffect(() => {
    // Set page title
    document.title = t("الصفحة غير موجودة — Lumos", "Page Not Found — Lumos");
  }, [t]);

  return (
    <div className="min-h-screen bg-[#060a14] flex items-center justify-center px-4 relative overflow-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Subtle background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#64ffda]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#64ffda]/3 rounded-full blur-3xl" />
      </div>

      <div className="text-center relative z-10 max-w-lg">
        {/* 404 Number */}
        <h1 className="text-[120px] sm:text-[160px] font-black leading-none bg-gradient-to-b from-white/20 to-white/5 bg-clip-text text-transparent select-none">
          404
        </h1>

        {/* Message */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 -mt-4">
          {t('الصفحة غير موجودة', 'Page Not Found')}
        </h2>
        <p className="text-white/50 mb-8 text-sm sm:text-base leading-relaxed">
          {t('الصفحة', 'The page')} <span className="text-[#64ffda]/70 font-mono text-sm">{location.pathname}</span> {t('غير موجودة أو تم نقلها.', "doesn't exist or has been moved.")}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2 bg-[#64ffda]/10 border border-[#64ffda]/20 text-[#64ffda] px-6 py-3 rounded-xl font-semibold hover:bg-[#64ffda]/20 transition-all duration-300 text-sm w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4" />
            {t('العودة للرئيسية', 'Go Home')}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/70 px-6 py-3 rounded-xl font-semibold hover:bg-white/10 hover:text-white transition-all duration-300 text-sm w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('الرجوع للخلف', 'Go Back')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
