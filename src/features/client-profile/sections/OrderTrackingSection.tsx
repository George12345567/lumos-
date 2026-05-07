import { useState } from 'react';
import {
  Package,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Filter,
} from 'lucide-react';
import type { MockOrder } from '../mockData';
import { OrderTimeline } from '../components/OrderTimeline';
import { Card } from '../components/Card';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'delivered' | 'cancelled';

const STATUS_BADGE: Record<string, { label: string; labelAr: string; color: string }> = {
  pending: { label: 'Pending', labelAr: 'قيد الانتظار', color: '#f59e0b' },
  reviewing: { label: 'Under Review', labelAr: 'قيد المراجعة', color: '#6366f1' },
  approved: { label: 'Approved', labelAr: 'تمت الموافقة', color: '#3b82f6' },
  in_progress: { label: 'In Progress', labelAr: 'قيد التنفيذ', color: '#077F5B' },
  delivered: { label: 'Delivered', labelAr: 'تم التسليم', color: '#22c55e' },
  cancelled: { label: 'Cancelled', labelAr: 'ملغي', color: '#ef4444' },
};

const FILTER_OPTIONS: { value: StatusFilter; label: string; labelAr: string }[] = [
  { value: 'all', label: 'All', labelAr: 'الكل' },
  { value: 'pending', label: 'Pending', labelAr: 'قيد الانتظار' },
  { value: 'in_progress', label: 'In Progress', labelAr: 'قيد التنفيذ' },
  { value: 'delivered', label: 'Delivered', labelAr: 'تم التسليم' },
  { value: 'cancelled', label: 'Cancelled', labelAr: 'ملغي' },
];

function formatPrice(price: number, currency: string) {
  return `${price.toLocaleString()} ${currency}`;
}

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface Props {
  orders: MockOrder[];
  accent: string;
  isArabic?: boolean;
}

export function OrderTrackingSection({ orders, accent, isArabic }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(orders.length === 1 ? orders[0].id : null);
  const [filter, setFilter] = useState<StatusFilter>('all');

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      <Card
        icon={Filter}
        title={isArabic ? 'تصفية المشاريع' : 'Filter Projects'}
        className="!py-3"
      >
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                filter === opt.value
                  ? 'text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={filter === opt.value ? { backgroundColor: accent } : undefined}
            >
              {isArabic ? opt.labelAr : opt.label}
            </button>
          ))}
        </div>
      </Card>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
          <Package className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            {orders.length === 0
              ? isArabic
                ? 'ستظهر مشاريعك هنا بمجرد بدء فريق Lumos العمل معك.'
                : 'Your projects will appear here once Lumos starts working with you.'
              : isArabic
                ? 'لا توجد مشاريع تطابق هذا الفلتر.'
                : 'No projects match this filter.'}
          </p>
        </div>
      )}

      {filtered.map((order) => {
        const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
        const isExpanded = expandedId === order.id;
        const progressPct =
          order.timeline.filter((s) => s.completed).length / Math.max(order.timeline.length, 1) * 100;

        return (
          <Card key={order.id} className="!p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleExpand(order.id)}
              className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-slate-50/50"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${badge.color}15`, color: badge.color }}
              >
                <Package className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-slate-900">
                    {isArabic ? order.package_name_ar : order.package_name}
                  </h3>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: badge.color }}
                  >
                    {isArabic ? badge.labelAr : badge.label}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(order.created_at, isArabic ? 'ar-EG' : 'en-US')}
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    {formatPrice(order.total_price, order.price_currency)}
                  </span>
                </div>
              </div>

              {isExpanded ? (
                <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                <div className="mb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      {isArabic ? 'التقدم الكلي' : 'Overall Progress'}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: accent }}>
                      {Math.round(progressPct)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%`, backgroundColor: accent }}
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isArabic ? 'تتبع الحالة' : 'Status Timeline'}
                  </h4>
                  <OrderTimeline
                    timeline={order.timeline}
                    accent={accent}
                    isArabic={isArabic}
                  />
                </div>

                <div className="mb-5">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isArabic ? 'تفاصيل المشروع' : 'Project Details'}
                  </h4>
                  <div className="overflow-hidden rounded-xl border border-slate-200/70">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                            {isArabic ? 'الخدمة' : 'Service'}
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">
                            {isArabic ? 'السعر' : 'Price'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, idx) => (
                          <tr key={idx} className={idx < order.items.length - 1 ? 'border-b border-slate-50' : ''}>
                            <td className="px-3 py-2 text-slate-800">
                              {isArabic ? item.nameAr : item.name}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600">
                              {formatPrice(item.price, order.price_currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-200 bg-slate-50/50">
                          <td className="px-3 py-2 text-sm font-semibold text-slate-900">
                            {isArabic ? 'الإجمالي' : 'Total'}
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-semibold" style={{ color: accent }}>
                            {formatPrice(order.total_price, order.price_currency)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {order.notes && (
                  <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <FileText className="h-3.5 w-3.5" />
                      {isArabic ? 'ملاحظات' : 'Notes'}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700">{order.notes}</p>
                  </div>
                )}

                {order.estimated_delivery && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    {isArabic ? 'التسليم المتوقع:' : 'Estimated delivery:'}{' '}
                    <span className="font-medium text-slate-700">
                      {formatDate(order.estimated_delivery, isArabic ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}