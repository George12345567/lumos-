import { TABS, type TabId } from '../constants';

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
  isArabic?: boolean;
  accent: string;
}

export function TabBar({ active, onChange, isArabic, accent }: Props) {
  return (
    <div role="tablist" aria-label="Profile sections" className="sticky top-0 z-10 -mx-4 mb-6 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white sm:px-2 sm:shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition sm:flex-none sm:px-4 ${
                isActive
                  ? 'text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
              style={isActive ? { color: accent } : undefined}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{isArabic ? tab.labelAr : tab.label}</span>
              <span className="sm:hidden">{isArabic ? tab.labelAr : tab.label}</span>
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-x-3 -bottom-px h-0.5 rounded-full"
                  style={{ backgroundColor: accent }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
