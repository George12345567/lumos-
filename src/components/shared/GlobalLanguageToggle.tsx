import { Languages } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const GlobalLanguageToggle = () => {
  const { isArabic, language, toggleLanguage, t } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="fixed top-[84px] z-[80] inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-[#0c1222]/88 px-3 py-2 text-xs font-semibold text-white/85 shadow-[0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-all duration-300 hover:border-[hsl(150,100%,40%)]/35 hover:bg-[#10192b]/94 hover:text-white"
      style={{ left: isArabic ? 'auto' : '16px', right: isArabic ? '16px' : 'auto' }}
      aria-label={t('بدّل لغة الموقع بالكامل', 'Switch the entire site language')}
      title={t('بدّل لغة الموقع بالكامل', 'Switch the entire site language')}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(150,100%,40%)]/12 text-[hsl(150,100%,40%)]">
        <Languages className="h-4 w-4" />
      </span>
      <span className="hidden sm:block text-left leading-tight">
        <span className="block text-[11px] uppercase tracking-[0.16em] text-white/45">{language === 'ar' ? 'ARABIC' : 'ENGLISH'}</span>
        <span className="block text-xs text-white/88">{t('التحويل إلى الإنجليزية', 'Switch to Arabic')}</span>
      </span>
      <span className="sm:hidden">{isArabic ? 'EN' : 'AR'}</span>
    </button>
  );
};

export default GlobalLanguageToggle;