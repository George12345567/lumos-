import { useMemo, useState } from 'react';
import { Briefcase, Calendar, Search } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { Order } from '@/types/dashboard';
import {
  EmptyState,
  SectionHeader,
  SoftBadge,
  SoftCard,
} from '../components/primitives';
import { useAdminPermission } from '../hooks/useAdminPermission';

interface ProjectsSectionProps {
  orders: Order[];
  loading: boolean;
  onUpdateStatus: (id: string, status: Order['status']) => void | Promise<void>;
}

const STATUS_CFG: Record<
  Order['status'],
  { tone: 'sky' | 'amber' | 'emerald' | 'slate' | 'rose'; en: string; ar: string }
> = {
  pending: { tone: 'amber', en: 'Pending', ar: 'بانتظار' },
  processing: { tone: 'sky', en: 'In progress', ar: 'قيد التنفيذ' },
  completed: { tone: 'emerald', en: 'Completed', ar: 'مكتمل' },
  cancelled: { tone: 'slate', en: 'Cancelled', ar: 'ملغي' },
  refunded: { tone: 'rose', en: 'Refunded', ar: 'مسترد' },
};

const COLUMNS: Array<Order['status']> = ['pending', 'processing', 'completed', 'cancelled'];

export function ProjectsSection({ orders, loading, onUpdateStatus }: ProjectsSectionProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [search, setSearch] = useState('');
  const canEdit = useAdminPermission('projects', 'edit');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((o) =>
      [o.guest_name, o.company_name, o.guest_email, o.package_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [orders, search]);

  const grouped = useMemo(() => {
    const map = new Map<Order['status'], Order[]>();
    COLUMNS.forEach((s) => map.set(s, []));
    for (const o of filtered) {
      if (map.has(o.status)) map.get(o.status)!.push(o);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('المشاريع', 'Projects')}
        subtitle={t(
          'الطلبات المحوّلة إلى مشاريع، مرتبة بالحالة.',
          'Pricing requests that converted into active projects, by stage.',
        )}
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('بحث…', 'Search…')}
              className="w-full h-9 pl-9 pr-3 rounded-full text-sm bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        }
      />

      {loading ? (
        <SoftCard className="p-10 text-center text-sm text-slate-500">
          {t('جارٍ التحميل…', 'Loading…')}
        </SoftCard>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={t('لا توجد مشاريع نشطة', 'No active projects yet')}
          description={t(
            'حوّل طلب تسعير إلى مشروع لتراه هنا. ستظهر المشاريع كأعمدة Kanban بالحالة.',
            'Convert a pricing request into a project to see it here. Projects appear as Kanban columns by status.',
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((status) => {
            const items = grouped.get(status) || [];
            const cfg = STATUS_CFG[status];
            return (
              <SoftCard key={status} className="p-4 space-y-3 min-h-[200px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">
                    {isAr ? cfg.ar : cfg.en}
                  </h3>
                  <SoftBadge tone={cfg.tone}>{items.length}</SoftBadge>
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    {t('فارغ', 'Empty')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {items.map((o) => (
                      <li
                        key={o.id}
                        className="rounded-2xl ring-1 ring-emerald-900/5 dark:ring-white/5 p-3 bg-white/60 dark:bg-slate-900/40"
                      >
                        <p className="text-sm font-semibold text-foreground truncate">
                          {o.guest_name || o.company_name || t('بدون اسم', 'Unnamed')}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {o.package_name || o.order_type || ''}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-bold text-emerald-700">
                            {new Intl.NumberFormat(isAr ? 'ar' : 'en').format(o.total_price || 0)}{' '}
                            {o.price_currency || 'EGP'}
                          </span>
                          <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(o.created_at).toLocaleDateString(isAr ? 'ar' : 'en', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        {canEdit ? (
                          <select
                            value={o.status}
                            onChange={(e) => void onUpdateStatus(o.id, e.target.value as Order['status'])}
                            className="mt-2 w-full text-[11px] rounded-full px-2 h-7 bg-slate-50 ring-1 ring-slate-200 focus:outline-none focus:ring-emerald-300 dark:bg-slate-900 dark:ring-white/10"
                          >
                            {(['pending', 'processing', 'completed', 'cancelled', 'refunded'] as Order['status'][]).map(
                              (s) => (
                                <option key={s} value={s}>
                                  {isAr ? STATUS_CFG[s].ar : STATUS_CFG[s].en}
                                </option>
                              ),
                            )}
                          </select>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </SoftCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
