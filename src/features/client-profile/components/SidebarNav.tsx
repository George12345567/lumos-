import { LogOut } from 'lucide-react';
import { TABS, type TabId } from '../constants';

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
  onSignOut: () => void;
  isArabic?: boolean;
  accent: string;
}

/**
 * Desktop sidebar for the simplified client profile. Five main tabs +
 * a quiet Sign out button anchored to the bottom (visually grouped but
 * styled so it never competes with the primary nav).
 */
export function SidebarNav({ active, onChange, onSignOut, isArabic, accent }: Props) {
  return (
    <aside
      className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1 lg:rounded-2xl lg:border lg:border-slate-200/70 lg:bg-white lg:p-3 lg:shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      dir={isArabic ? 'rtl' : 'ltr'}
      role="tablist"
      aria-label={isArabic ? 'أقسام الملف الشخصي' : 'Profile sections'}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? 'shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            style={isActive ? { backgroundColor: `${accent}12`, color: accent } : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{isArabic ? tab.labelAr : tab.label}</span>
          </button>
        );
      })}

      <div className="my-2 h-px bg-slate-100" aria-hidden />

      <button
        type="button"
        onClick={onSignOut}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>{isArabic ? 'تسجيل الخروج' : 'Sign out'}</span>
      </button>
    </aside>
  );
}

/**
 * Mobile/tablet horizontal scroller. Mirrors the sidebar's tab list (no
 * sign-out duplicate — sign out lives in the Account section's danger zone
 * on mobile).
 */
export function MobileTabBar({ active, onChange, isArabic, accent }: Omit<Props, 'onSignOut'>) {
  return (
    <div
      className="lg:hidden sticky top-0 z-10 -mx-4 mb-4 border-b border-slate-200/70 bg-white/90 px-3 backdrop-blur"
      dir={isArabic ? 'rtl' : 'ltr'}
      role="tablist"
      aria-label={isArabic ? 'أقسام الملف الشخصي' : 'Profile sections'}
    >
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                isActive
                  ? 'shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
              style={isActive ? { backgroundColor: `${accent}12`, color: accent } : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{isArabic ? tab.labelAr : tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
