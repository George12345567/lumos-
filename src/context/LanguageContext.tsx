/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppLanguage = 'ar' | 'en';

type LanguageContextValue = {
  language: AppLanguage;
  isArabic: boolean;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  t: (ar: string, en: string) => string;
};

const LANGUAGE_STORAGE_KEY = 'lumos_app_language';

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === 'ar' || stored === 'en') {
    return stored;
  }

  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ar')) {
    return 'ar';
  }

  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(getInitialLanguage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.dataset.lumosLang = language;
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage((current) => (current === 'ar' ? 'en' : 'ar'));
  }, []);

  const t = useCallback((ar: string, en: string) => (language === 'ar' ? ar : en), [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    isArabic: language === 'ar',
    setLanguage,
    toggleLanguage,
    t,
  }), [language, t, toggleLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/** Hook for components that only need language state (re-renders on language switch). */
export function useLanguageState() {
  const { language, isArabic } = useLanguage();
  return { language, isArabic };
}

/** Hook for components that only need translation helpers (stable between language switches). */
export function useLanguageActions() {
  const { setLanguage, toggleLanguage, t } = useLanguage();
  return { setLanguage, toggleLanguage, t };
}
