import { Search, RefreshCw, Bell, Sun, Moon, Menu } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAppearance } from '@/context/AppearanceContext';
import { cn } from '@/lib/utils';
import { useAdminRole } from '../hooks/useAdminPermission';
import { ROLE_LABELS } from '../permissions';
import { SoftBadge, SoftButton } from './primitives';

interface AdminTopbarProps {
  name: string;
  email?: string;
  avatarUrl?: string;
  unread: number;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  searchValue: string;
  onToggleSidebar?: () => void;
}

export function AdminTopbar({
  name,
  email,
  avatarUrl,
  unread,
  onRefresh,
  onSearchChange,
  searchValue,
  onToggleSidebar,
}: AdminTopbarProps) {
  const { language } = useLanguage();
  const { theme, toggleTheme } = useAppearance();
  const isAr = language === 'ar';
  const role = useAdminRole();
  const initials = name?.slice(0, 1).toUpperCase() || 'A';

  return (
    <header className="sticky top-0 z-30 px-4 lg:px-8 py-4 backdrop-blur-md bg-[#f4f9f6]/80 dark:bg-slate-950/80 border-b border-emerald-900/5 dark:border-white/5">
      <div className="flex items-center gap-3 lg:gap-5">
        {onToggleSidebar ? (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 flex items-center justify-center"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4 text-slate-600" />
          </button>
        ) : null}

        <div className="hidden lg:block min-w-0">
          <p className="text-[20px] font-bold tracking-tight text-foreground truncate">
            {isAr ? `أهلاً، ${name} 👋` : `Welcome back, ${name} 👋`}
          </p>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            {isAr ? 'هذا ما يحدث في Lumos اليوم.' : "Here's what's happening with Lumos today."}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-end gap-2 flex-wrap">
          <div className="relative hidden md:block w-72 max-w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder={isAr ? 'بحث في كل شيء…' : 'Search everything…'}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn(
                'w-full h-10 rounded-full pl-10 pr-4 text-sm',
                'bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10',
                'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/20',
              )}
            />
          </div>

          <SoftButton variant="outline" size="md" onClick={onRefresh} title={isAr ? 'تحديث' : 'Refresh'}>
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">{isAr ? 'تحديث' : 'Refresh'}</span>
          </SoftButton>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300"
            title={theme === 'dark' ? (isAr ? 'الوضع الفاتح' : 'Light mode') : (isAr ? 'الوضع الداكن' : 'Dark mode')}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            className="relative w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300"
            title={isAr ? 'الإشعارات' : 'Notifications'}
          >
            <Bell className="w-4 h-4" />
            {unread > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </button>

          <div className="flex items-center gap-2 pl-2">
            <SoftBadge tone="emerald">
              {isAr ? ROLE_LABELS[role].ar : ROLE_LABELS[role].en}
            </SoftBadge>
            <div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-300 to-teal-500 flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-slate-950"
              title={email}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
