import { useMemo } from 'react';
import { BarChart3, FileText, Mail, Users } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { Contact, PricingRequest, Order, Client } from '@/types/dashboard';
import {
  MetricCard,
  SectionHeader,
  SoftCard,
} from '../components/primitives';

interface StatisticsSectionProps {
  pricingRequests: PricingRequest[];
  contacts: Contact[];
  orders: Order[];
  clients: Client[];
  teamCount: number;
}

export function StatisticsSection({
  pricingRequests,
  contacts,
  orders,
  clients,
  teamCount,
}: StatisticsSectionProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const requestsByStatus = useMemo(() => {
    const map: Record<PricingRequest['status'], number> = {
      new: 0,
      reviewing: 0,
      approved: 0,
      converted: 0,
      rejected: 0,
      cancelled: 0,
    };
    for (const r of pricingRequests) map[r.status] = (map[r.status] || 0) + 1;
    return map;
  }, [pricingRequests]);

  const ordersByStatus = useMemo(() => {
    const map: Record<Order['status'], number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
      refunded: 0,
    };
    for (const o of orders) map[o.status] = (map[o.status] || 0) + 1;
    return map;
  }, [orders]);

  const totalPipeline = useMemo(
    () => orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded').reduce((s, o) => s + (o.total_price || 0), 0),
    [orders],
  );

  const contactsByStatus = useMemo(() => {
    const map: Record<Contact['status'], number> = { new: 0, read: 0, contacted: 0, resolved: 0 };
    for (const c of contacts) map[c.status] = (map[c.status] || 0) + 1;
    return map;
  }, [contacts]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('الإحصائيات', 'Statistics')}
        subtitle={t(
          'لمحة هادئة على الأرقام الحقيقية — لا توجد بيانات وهمية.',
          'A calm look at the real numbers — no fake metrics.',
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={t('إجمالي الطلبات', 'Total requests')}
          value={pricingRequests.length}
          icon={FileText}
          tone="emerald"
        />
        <MetricCard
          label={t('إجمالي العملاء', 'Total clients')}
          value={clients.length}
          icon={Users}
          tone="sky"
        />
        <MetricCard
          label={t('إجمالي الاتصالات', 'Total contacts')}
          value={contacts.length}
          icon={Mail}
          tone="teal"
        />
        <MetricCard
          label={t('إجمالي المسار', 'Pipeline')}
          value={new Intl.NumberFormat(isAr ? 'ar' : 'en').format(totalPipeline)}
          delta={`${orders.length} ${t('مشاريع', 'projects')}`}
          icon={BarChart3}
          tone="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BreakdownCard
          title={t('الطلبات حسب الحالة', 'Requests by status')}
          items={Object.entries(requestsByStatus).map(([k, v]) => ({ label: k, value: v }))}
          total={pricingRequests.length}
        />
        <BreakdownCard
          title={t('المشاريع حسب الحالة', 'Projects by status')}
          items={Object.entries(ordersByStatus).map(([k, v]) => ({ label: k, value: v }))}
          total={orders.length}
        />
        <BreakdownCard
          title={t('الاتصالات حسب الحالة', 'Contacts by status')}
          items={Object.entries(contactsByStatus).map(([k, v]) => ({ label: k, value: v }))}
          total={contacts.length}
        />
        <SoftCard className="p-6">
          <h3 className="text-base font-bold text-foreground mb-4">
            {t('الفريق', 'Team')}
          </h3>
          <p className="text-3xl font-bold text-foreground">{teamCount}</p>
          <p className="text-xs text-slate-500 mt-1">{t('أعضاء فريق نشطون', 'active team members')}</p>
        </SoftCard>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  items,
  total,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  total: number;
}) {
  return (
    <SoftCard className="p-6">
      <h3 className="text-base font-bold text-foreground mb-4">{title}</h3>
      <ul className="space-y-3">
        {items.map((it) => {
          const pct = total ? Math.round((it.value / total) * 100) : 0;
          return (
            <li key={it.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="capitalize text-slate-700 dark:text-slate-200">{it.label}</span>
                <span className="text-slate-500 tabular-nums">
                  {it.value} <span className="text-slate-400">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-emerald-50 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </SoftCard>
  );
}
