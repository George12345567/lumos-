import { TABS, type TabId } from '../constants';

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
  isArabic?: boolean;
  accent: string;
}

export function SidebarNav({ active, onChange, isArabic, accent }: Props) {
  return (
    <aside
      className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col lg:gap-1 lg:rounded-2xl lg:border lg:border-white/60 lg:bg-white/70 lg:p-3 lg:shadow-[0_1px_3px_rgba(15,23,42,0.06)] lg:backdrop-blur-xl"
      dir={isArabic ? 'rtl' : 'ltr'}
      role="tablist"
      aria-label="Profile sections"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? 'shadow-sm'
                : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-700'
            }`}
            style={isActive ? { backgroundColor: `${accent}12`, color: accent } : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{isArabic ? tab.labelAr : tab.label}</span>
          </button>
        );
      })}
    </aside>
  );
}

export function MobileTabBar({ active, onChange, isArabic, accent }: Props) {
  return (
    <div
      className="lg:hidden sticky top-0 z-10 -mx-4 mb-4 border-b border-slate-200/70 bg-white/90 px-3 backdrop-blur"
      dir={isArabic ? 'rtl' : 'ltr'}
      role="tablist"
      aria-label="Profile sections"
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