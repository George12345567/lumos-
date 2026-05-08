import { useMemo, useState } from 'react';
import { Activity, Clock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { AuditLog } from '@/types/dashboard';
import { useAuditLogs } from '../data/useAuditLogs';
import {
  EmptyState,
  SectionHeader,
  SoftBadge,
  SoftCard,
} from '../components/primitives';
import { AdminDrawer } from '../components/AdminDrawer';

const ENTITY_LABELS: Record<AuditLog['entity_type'], { en: string; ar: string }> = {
  pricing_request: { en: 'Pricing request', ar: 'طلب تسعير' },
  client: { en: 'Client', ar: 'عميل' },
  discount_code: { en: 'Discount code', ar: 'كود خصم' },
  team_member: { en: 'Team member', ar: 'عضو فريق' },
  order: { en: 'Order', ar: 'طلب' },
};

const ACTION_TONE: Record<
  AuditLog['action'],
  { tone: 'sky' | 'amber' | 'emerald' | 'violet' | 'rose' | 'slate' | 'lime'; en: string; ar: string }
> = {
  created: { tone: 'emerald', en: 'Created', ar: 'إنشاء' },
  updated: { tone: 'sky', en: 'Updated', ar: 'تحديث' },
  deleted: { tone: 'rose', en: 'Deleted', ar: 'حذف' },
  status_changed: { tone: 'amber', en: 'Status changed', ar: 'تغيير الحالة' },
  assigned: { tone: 'violet', en: 'Assigned', ar: 'تعيين' },
  notes_added: { tone: 'slate', en: 'Note added', ar: 'إضافة ملاحظة' },
  converted: { tone: 'lime', en: 'Converted', ar: 'تحويل' },
  reviewed: { tone: 'sky', en: 'Reviewed', ar: 'مراجعة' },
};

export function AuditSection() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { logs, loading } = useAuditLogs();
  const [entity, setEntity] = useState<'all' | AuditLog['entity_type']>('all');
  const [action, setAction] = useState<'all' | AuditLog['action']>('all');
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (entity !== 'all' && l.entity_type !== entity) return false;
      if (action !== 'all' && l.action !== action) return false;
      return true;
    });
  }, [logs, entity, action]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('سجل النشاط', 'Audit logs')}
        subtitle={t(
          'كل تغيير حساس يحدث في النظام مسجل هنا.',
          'A read-only timeline of every sensitive change.',
        )}
      />

      <SoftCard className="p-3 flex flex-wrap gap-2 items-center">
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value as typeof entity)}
          className="rounded-full text-xs px-3 h-9 bg-white ring-1 ring-slate-200 focus:outline-none focus:ring-emerald-200"
        >
          <option value="all">{t('كل الكائنات', 'All entities')}</option>
          {Object.keys(ENTITY_LABELS).map((k) => (
            <option key={k} value={k}>
              {isAr ? ENTITY_LABELS[k as AuditLog['entity_type']].ar : ENTITY_LABELS[k as AuditLog['entity_type']].en}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as typeof action)}
          className="rounded-full text-xs px-3 h-9 bg-white ring-1 ring-slate-200 focus:outline-none focus:ring-emerald-200"
        >
          <option value="all">{t('كل الإجراءات', 'All actions')}</option>
          {Object.keys(ACTION_TONE).map((k) => (
            <option key={k} value={k}>
              {isAr ? ACTION_TONE[k as AuditLog['action']].ar : ACTION_TONE[k as AuditLog['action']].en}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500 ml-auto">
          {filtered.length} {t('سجل', 'records')}
        </span>
      </SoftCard>

      {loading ? (
        <SoftCard className="p-10 text-center text-sm text-slate-500">
          {t('جارٍ التحميل…', 'Loading…')}
        </SoftCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={t('لا يوجد نشاط مطابق', 'No activity matches')}
          description={t(
            'جرّب تغيير الفلاتر لرؤية المزيد.',
            'Try changing the filters to see more.',
          )}
        />
      ) : (
        <SoftCard className="p-6">
          <ol className="relative border-l border-emerald-900/10 pl-5 space-y-5">
            {filtered.map((log) => {
              const cfg = ACTION_TONE[log.action];
              const ent = ENTITY_LABELS[log.entity_type];
              return (
                <li key={log.id} className="relative">
                  <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
                  <button
                    type="button"
                    onClick={() => setSelected(log)}
                    className="text-left w-full hover:bg-emerald-50/40 dark:hover:bg-white/5 -mx-2 px-2 py-2 rounded-2xl"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <SoftBadge tone={cfg.tone}>{isAr ? cfg.ar : cfg.en}</SoftBadge>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {isAr ? ent.ar : ent.en}
                      </span>
                      <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString(isAr ? 'ar' : 'en')}
                      </span>
                    </div>
                    {log.change_summary || log.change_summary_ar ? (
                      <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">
                        {isAr && log.change_summary_ar ? log.change_summary_ar : log.change_summary}
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </SoftCard>
      )}

      <AuditDetailDrawer log={selected} onClose={() => setSelected(null)} isAr={isAr} />
    </div>
  );
}

function AuditDetailDrawer({
  log,
  onClose,
  isAr,
}: {
  log: AuditLog | null;
  onClose: () => void;
  isAr: boolean;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  if (!log) return null;
  const cfg = ACTION_TONE[log.action];
  const ent = ENTITY_LABELS[log.entity_type];
  return (
    <AdminDrawer
      open={!!log}
      onOpenChange={(o) => !o && onClose()}
      title={`${isAr ? cfg.ar : cfg.en} · ${isAr ? ent.ar : ent.en}`}
      subtitle={new Date(log.created_at).toLocaleString(isAr ? 'ar' : 'en')}
    >
      <div className="space-y-4">
        <SoftCard className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Info label={t('الكائن', 'Entity ID')} value={log.entity_id} />
          <Info
            label={t('بواسطة', 'Changed by')}
            value={log.changed_by ? `${log.changed_by} (${log.changed_by_type})` : '—'}
          />
          {log.ip_address ? <Info label={t('IP', 'IP')} value={log.ip_address} /> : null}
        </SoftCard>
        {log.change_summary ? (
          <SoftCard className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
              {t('الملخص', 'Summary')}
            </p>
            <p className="text-sm">
              {isAr && log.change_summary_ar ? log.change_summary_ar : log.change_summary}
            </p>
          </SoftCard>
        ) : null}
        <details className="rounded-2xl bg-white p-4 ring-1 ring-emerald-900/5">
          <summary className="text-sm font-semibold cursor-pointer">
            {t('التفاصيل التقنية', 'Technical details')}
          </summary>
          <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <pre className="rounded-2xl bg-slate-50 p-3 text-[11px] overflow-auto max-h-72">
              {t('قبل', 'Before')}: {JSON.stringify(log.old_values || {}, null, 2)}
            </pre>
            <pre className="rounded-2xl bg-slate-50 p-3 text-[11px] overflow-auto max-h-72">
              {t('بعد', 'After')}: {JSON.stringify(log.new_values || {}, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </AdminDrawer>
  );
}

function Info({ label, value }: { label: string; value?: React.ReactNode | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm text-foreground mt-0.5">
        {value || <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}
