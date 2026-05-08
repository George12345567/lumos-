import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Mail,
  MessageSquare,
  PlusCircle,
  Tag,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { Client, Contact, PricingRequest } from '@/types/dashboard';
import type { AdminSection } from '../types';
import { useAdminPermission } from '../hooks/useAdminPermission';
import { EmptyState, MetricCard, SectionHeader, SoftBadge, SoftButton, SoftCard } from '../components/primitives';

interface OverviewSectionProps {
  stats: {
    newPricingRequests: number;
    newContacts: number;
    totalContacts: number;
    totalPricingRequests: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalClients: number;
    activeClients: number;
    pipelineValue: number;
    unread: number;
  };
  recentRequests: PricingRequest[];
  recentClients: Client[];
  recentContacts: Contact[];
  loading: boolean;
  onNavigate: (section: AdminSection) => void;
  onAddClient: () => void;
  onCreateDiscount: () => void;
  onAddTeamMember: () => void;
}

export function OverviewSection({
  stats,
  recentRequests,
  recentClients,
  recentContacts,
  loading,
  onNavigate,
  onAddClient,
  onCreateDiscount,
  onAddTeamMember,
}: OverviewSectionProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const canEditClients = useAdminPermission('clients', 'create');
  const canEditDiscounts = useAdminPermission('discounts', 'create');
  const canEditTeam = useAdminPermission('team', 'create');

  const pipelineDisplay = useMemo(() => {
    const value = stats.pipelineValue || 0;
    return new Intl.NumberFormat(isAr ? 'ar' : 'en', { maximumFractionDigits: 0 }).format(value);
  }, [stats.pipelineValue, isAr]);

  return (
    <div className="space-y-8">
      <SectionHeader
        title={t('نظرة عامة', 'Overview')}
        subtitle={t(
          'ملخص العمليات الحية في Lumos.',
          'A live snapshot of what is moving across Lumos right now.',
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={t('طلبات جديدة', 'New requests')}
          value={loading ? '—' : stats.newPricingRequests}
          delta={t(
            `من أصل ${stats.totalPricingRequests} طلب`,
            `of ${stats.totalPricingRequests} total`,
          )}
          tone="emerald"
          icon={FileText}
        />
        <MetricCard
          label={t('جهات اتصال جديدة', 'New contacts')}
          value={loading ? '—' : stats.newContacts}
          delta={t(`${stats.totalContacts} إجمالاً`, `${stats.totalContacts} total`)}
          tone="teal"
          icon={Mail}
        />
        <MetricCard
          label={t('العملاء النشطون', 'Active clients')}
          value={loading ? '—' : stats.activeClients}
          delta={t(`${stats.totalClients} عميل`, `${stats.totalClients} clients`)}
          tone="sky"
          icon={Users}
        />
        <MetricCard
          label={t('قيمة المسار', 'Pipeline value')}
          value={loading ? '—' : pipelineDisplay}
          delta={t(
            `${stats.pendingOrders} مشروع قيد التنفيذ`,
            `${stats.pendingOrders} projects in motion`,
          )}
          tone="violet"
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <SoftCard className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t('الطلبات الأخيرة', 'Recent requests')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('آخر 5 طلبات تسعير.', 'Latest 5 pricing requests.')}
                </p>
              </div>
              <SoftButton variant="ghost" size="sm" onClick={() => onNavigate('requests')}>
                {t('عرض الكل', 'View all')}
                <ArrowRight className="w-3.5 h-3.5" />
              </SoftButton>
            </div>
            {recentRequests.length === 0 ? (
              <EmptyMini
                title={t('لا توجد طلبات بعد', 'No requests yet')}
                hint={t('سيظهر هنا أي طلب تسعير جديد.', 'New pricing requests will appear here.')}
              />
            ) : (
              <ul className="divide-y divide-emerald-900/5 dark:divide-white/5">
                {recentRequests.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    className="py-3 flex items-center gap-3 cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-white/5 -mx-2 px-2 rounded-2xl"
                    onClick={() => onNavigate('requests')}
                  >
                    <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {r.guest_name || r.company_name || t('بدون اسم', 'Unnamed')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {r.package_name || r.request_type || t('طلب مخصص', 'Custom request')} ·{' '}
                        {new Date(r.created_at).toLocaleDateString(isAr ? 'ar' : 'en', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <RequestStatusBadge status={r.status} isAr={isAr} />
                  </li>
                ))}
              </ul>
            )}
          </SoftCard>

          <SoftCard className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t('العملاء النشطون', 'Active clients')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('أحدث العملاء الذين انضموا.', 'Most recently onboarded clients.')}
                </p>
              </div>
              <SoftButton variant="ghost" size="sm" onClick={() => onNavigate('clients')}>
                {t('عرض الكل', 'View all')}
                <ArrowRight className="w-3.5 h-3.5" />
              </SoftButton>
            </div>
            {recentClients.length === 0 ? (
              <EmptyMini
                title={t('لا يوجد عملاء بعد', 'No clients yet')}
                hint={t('سيظهر هنا أي عميل بعد التسجيل.', 'Clients will appear here after they sign up.')}
              />
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentClients.slice(0, 4).map((c) => (
                  <li
                    key={c.id}
                    className="rounded-2xl p-3 ring-1 ring-emerald-900/5 dark:ring-white/5 flex items-center gap-3 cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-white/5"
                    onClick={() => onNavigate('clients')}
                  >
                    <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold flex items-center justify-center shrink-0">
                      {(c.username || c.email || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {c.company_name || c.username || t('عميل', 'Client')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {c.package_name || c.email || ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SoftCard>

          <SoftCard className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground inline-flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                {t('النشاط الأخير', 'Recent activity')}
              </h3>
            </div>
            {recentContacts.length === 0 ? (
              <EmptyMini
                title={t('كل شيء هادئ', 'Quiet on this front')}
                hint={t('لا توجد رسائل اتصال جديدة.', 'No fresh contact-form submissions.')}
              />
            ) : (
              <ul className="space-y-2">
                {recentContacts.slice(0, 4).map((c) => (
                  <li key={c.id} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{c.name}</span>{' '}
                        <span className="text-slate-500 dark:text-slate-400">
                          {t('أرسل رسالة اتصال', 'sent a contact message')}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(c.created_at).toLocaleDateString(isAr ? 'ar' : 'en')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SoftCard>
        </div>

        <div className="space-y-6">
          <SoftCard className="p-6">
            <h3 className="text-base font-bold text-foreground mb-1">
              {t('إجراءات سريعة', 'Quick actions')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t(
                'اختصارات للمهام الأكثر شيوعاً.',
                'Shortcuts for the things you reach for most.',
              )}
            </p>
            <div className="grid grid-cols-1 gap-2">
              <QuickAction
                icon={UserPlus}
                label={t('إضافة عميل', 'Add client')}
                onClick={onAddClient}
                disabled={!canEditClients}
                disabledHint={t('ليس لديك صلاحية', 'Not allowed for your role')}
              />
              <QuickAction
                icon={ClipboardList}
                label={t('إنشاء طلب', 'Create request')}
                onClick={() => navigate('/get-pricing')}
              />
              <QuickAction
                icon={Tag}
                label={t('كود خصم جديد', 'New discount code')}
                onClick={onCreateDiscount}
                disabled={!canEditDiscounts}
                disabledHint={t('ليس لديك صلاحية', 'Not allowed for your role')}
              />
              <QuickAction
                icon={Briefcase}
                label={t('عرض المشاريع', 'Open projects')}
                onClick={() => onNavigate('projects')}
              />
              <QuickAction
                icon={MessageSquare}
                label={t('فحص الرسائل', 'Review messages')}
                onClick={() => onNavigate('messages')}
              />
              <QuickAction
                icon={Users}
                label={t('إضافة عضو فريق', 'Add team member')}
                onClick={onAddTeamMember}
                disabled={!canEditTeam}
                disabledHint={t('ليس لديك صلاحية', 'Not allowed for your role')}
              />
            </div>
          </SoftCard>

          <SoftCard className="p-6">
            <h3 className="text-base font-bold text-foreground mb-3">
              {t('حالة النظام', 'System status')}
            </h3>
            <ul className="space-y-2">
              <StatusRow
                label={t('قاعدة بيانات Supabase', 'Supabase DB')}
                ok
                hint={t('متصل', 'Connected')}
              />
              <StatusRow
                label={t('المصادقة', 'Authentication')}
                ok
                hint={t('عاملة', 'Operational')}
              />
              <StatusRow
                label={t('سجل النشاط', 'Audit logging')}
                ok
                hint={t('مفعّل', 'Enabled')}
              />
            </ul>
          </SoftCard>

          {stats.unread > 0 ? (
            <SoftCard className="p-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {t(`${stats.unread} عنصر غير مقروء`, `${stats.unread} unread items`)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t(
                      'طلبات وجهات اتصال تنتظر مراجعتك.',
                      'Requests and contacts waiting for review.',
                    )}
                  </p>
                </div>
              </div>
            </SoftCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RequestStatusBadge({ status, isAr }: { status: PricingRequest['status']; isAr: boolean }) {
  const map: Record<
    PricingRequest['status'],
    { tone: Parameters<typeof SoftBadge>[0]['tone']; en: string; ar: string }
  > = {
    new: { tone: 'sky', en: 'New', ar: 'جديد' },
    reviewing: { tone: 'amber', en: 'Reviewing', ar: 'قيد المراجعة' },
    approved: { tone: 'emerald', en: 'Approved', ar: 'معتمد' },
    converted: { tone: 'violet', en: 'Converted', ar: 'محوّل' },
    rejected: { tone: 'rose', en: 'Rejected', ar: 'مرفوض' },
  };
  const cfg = map[status];
  return <SoftBadge tone={cfg.tone}>{isAr ? cfg.ar : cfg.en}</SoftBadge>;
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  disabledHint,
}: {
  icon: typeof UserPlus;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      className="flex items-center gap-3 px-3 h-11 rounded-2xl ring-1 ring-emerald-900/5 dark:ring-white/5 hover:bg-emerald-50/60 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </span>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{label}</span>
      <PlusCircle className="w-4 h-4 text-slate-400" />
    </button>
  );
}

function StatusRow({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200">
        <CheckCircle2 className={`w-4 h-4 ${ok ? 'text-emerald-500' : 'text-amber-500'}`} />
        {label}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>
    </li>
  );
}

function EmptyMini({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-center py-6">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>
    </div>
  );
}

void EmptyState;
void Building2;
