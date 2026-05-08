import { useMemo } from 'react';
import { ArrowLeft, LogOut, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { SIDEBAR_ITEMS } from '../constants/sidebar';
import { useCanAccessResource } from '../hooks/useAdminPermission';
import type { AdminSection } from '../types';

interface AdminSidebarProps {
  active: AdminSection;
  onChange: (next: AdminSection) => void;
  onSignOut: () => void;
  badges?: Partial<Record<'requests' | 'contacts' | 'messages', number>>;
  collapsed?: boolean;
}

export function AdminSidebar({ active, onChange, onSignOut, badges, collapsed }: AdminSidebarProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <aside
      className={cn(
        'h-full flex flex-col bg-white/70 backdrop-blur-md border-r border-emerald-900/5 dark:bg-slate-950/60 dark:border-white/5',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4" />
        </span>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-tight text-foreground truncate">
              Lumos Admin
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isAr ? 'لوحة العمليات' : 'Operations console'}
            </p>
          </div>
        ) : null}
      </div>

      <nav className="px-3 py-2 space-y-1 flex-1 overflow-y-auto">
        {SIDEBAR_ITEMS.map((item) => (
          <SidebarLink
            key={item.id}
            item={item}
            active={active === item.id}
            onClick={() => onChange(item.id)}
            badge={item.badgeKey ? badges?.[item.badgeKey] ?? 0 : 0}
            collapsed={collapsed}
            isAr={isAr}
          />
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-emerald-900/5 dark:border-white/5 space-y-1">
        <Link
          to="/"
          className={cn(
            'flex items-center gap-3 px-3 h-10 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-sm font-medium',
            collapsed && 'justify-center px-0',
          )}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          {!collapsed ? <span>{isAr ? 'العودة للموقع' : 'Back to site'}</span> : null}
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          className={cn(
            'flex items-center gap-3 px-3 h-10 rounded-2xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-medium w-full',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed ? <span>{isAr ? 'تسجيل الخروج' : 'Sign out'}</span> : null}
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  active,
  onClick,
  badge,
  collapsed,
  isAr,
}: {
  item: (typeof SIDEBAR_ITEMS)[number];
  active: boolean;
  onClick: () => void;
  badge: number;
  collapsed?: boolean;
  isAr: boolean;
}) {
  const Icon = item.icon;
  const accessible = useCanAccessResource(item.resource);
  const label = useMemo(() => (isAr ? item.labelAr : item.labelEn), [isAr, item]);
  if (!accessible) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 h-10 rounded-2xl text-sm font-medium transition',
        active
          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5',
        collapsed && 'justify-center px-0',
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn('w-4 h-4 shrink-0', active && 'text-emerald-600 dark:text-emerald-300')} />
      {!collapsed ? (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {badge > 0 ? (
            <span className="text-[10px] font-bold px-1.5 h-5 inline-flex items-center justify-center rounded-full bg-emerald-600 text-white tabular-nums">
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}
        </>
      ) : null}
    </button>
  );
}
