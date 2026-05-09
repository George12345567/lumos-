/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppTheme = 'dark' | 'light';

type AppearanceContextValue = {
  theme: AppTheme;
  isDark: boolean;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = 'lumos_app_theme';
const DEFAULT_THEME: AppTheme = 'dark';

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function safeGetStoredTheme(): AppTheme | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'dark' || stored === 'light' ? stored : null;
  } catch {
    return null;
  }
}

function getInitialTheme(): AppTheme {
  return safeGetStoredTheme() || DEFAULT_THEME;
}

function applyThemeToDocument(theme: AppTheme) {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;

  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.content = theme === 'dark' ? '#0f1412' : '#f7faf8';
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);

  useEffect(() => {
    applyThemeToDocument(theme);

    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage can be blocked in private or restricted browser contexts.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<AppearanceContextValue>(() => ({
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  }), [theme, toggleTheme]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
}
