import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  Hash,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import type { Client, PricingRequest, TeamMember } from '@/types/dashboard';
import { useAdminPermission } from '../hooks/useAdminPermission';
import {
  EmptyState,
  SectionHeader,
  SoftBadge,
  SoftButton,
  SoftCard,
} from '../components/primitives';
import { AdminDrawer } from '../components/AdminDrawer';
import { adminDashboardService } from '@/services/adminDashboardService';
import { RequestStatusTimeline } from '@/components/requests/RequestStatusTimeline';

type StatusFilter = 'all' | PricingRequest['status'] | 'urgent';

interface RequestsSectionProps {
  requests: PricingRequest[];
  clients: Client[];
  teamMembers: TeamMember[];
  loading: boolean;
  onUpdateStatus: (id: string, status: PricingRequest['status']) => void | Promise<void>;
  onConvert: (request: PricingRequest) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onAfterEdit?: () => void;
  onOpenClient?: (clientId: string) => void;
}

const STATUS_CFG: Record<
  PricingRequest['status'],
  { tone: 'sky' | 'amber' | 'emerald' | 'violet' | 'rose' | 'slate'; en: string; ar: string }
> = {
  new: { tone: 'sky', en: 'New', ar: 'جديد' },
  reviewing: { tone: 'amber', en: 'Reviewing', ar: 'قيد المراجعة' },
  approved: { tone: 'emerald', en: 'Approved', ar: 'معتمد' },
  converted: { tone: 'violet', en: 'Converted', ar: 'محوّل' },
  rejected: { tone: 'rose', en: 'Rejected', ar: 'مرفوض' },
  cancelled: { tone: 'slate', en: 'Cancelled', ar: 'ملغي' },
};

const PRIORITY_CFG: Record<
  PricingRequest['priority'],
  { tone: 'slate' | 'sky' | 'amber' | 'rose'; en: string; ar: string }
> = {
  low: { tone: 'slate', en: 'Low', ar: 'منخفضة' },
  medium: { tone: 'sky', en: 'Medium', ar: 'متوسطة' },
  high: { tone: 'amber', en: 'High', ar: 'عالية' },
  urgent: { tone: 'rose', en: 'Urgent', ar: 'عاجل' },
};

/**
 * Resolve a human-readable display name for a request. Order of fallback:
 *   1. guest_name (contact snapshot, populated for both guest and logged-in submits)
 *   2. company_name (contact snapshot)
 *   3. linked client (if client_id is set) — covers legacy rows that were saved
 *      before the modal started persisting the snapshot
 *   4. invoice_number (so the card never reads as "Unnamed" when it has an invoice)
 *   5. null → caller renders the localized "Unnamed" placeholder
 */
function resolveRequestDisplayName(request: PricingRequest, clients: Client[]): string | null {
  const direct = (request.guest_name || request.company_name || '').trim();
  if (direct) return direct;
  if (request.client_id) {
    const linked = clients.find((c) => c.id === request.client_id);
    if (linked) {
      const linkedName = (
        linked.company_name ||
        linked.full_contact_name ||
        linked.username ||
        linked.email ||
        ''
      ).trim();
      if (linkedName) return linkedName;
    }
  }
  return null;
}

function isLoggedInClientRequest(request: PricingRequest): boolean {
  return Boolean(request.client_id);
}

export function RequestsSection({
  requests,
  clients,
  teamMembers,
  loading,
  onUpdateStatus,
  onConvert,
  onDelete,
  onAfterEdit,
  onOpenClient,
}: RequestsSectionProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PricingRequest | null>(null);

  const canEdit = useAdminPermission('requests', 'edit');
  const canAssign = useAdminPermission('requests', 'assign');
  const canDelete = useAdminPermission('requests', 'delete');

  const counts = useMemo(() => {
    const byStatus: Record<PricingRequest['status'], number> = {
      new: 0, reviewing: 0, approved: 0, converted: 0, rejected: 0, cancelled: 0,
    };
    let urgent = 0;
    for (const r of requests) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      if (r.priority === 'urgent') urgent += 1;
    }
    return { all: requests.length, ...byStatus, urgent };
  }, [requests]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (filter === 'urgent' && r.priority !== 'urgent') return false;
      if (filter !== 'all' && filter !== 'urgent' && r.status !== filter) return false;
      if (!term) return true;
      const linked = r.client_id ? clients.find((c) => c.id === r.client_id) : null;
      const haystack = [
        r.invoice_number, r.guest_name, r.guest_email, r.guest_phone,
        r.company_name, r.package_name, r.applied_promo_code,
        linked?.company_name, linked?.username, linked?.email, linked?.full_contact_name,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [requests, clients, filter, search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('الطلبات', 'Requests')}
        subtitle={t(
          'تتبّع طلبات التسعير وحوّل الموافق منها إلى مشاريع.',
          'Track pricing requests and convert approved ones into projects.',
        )}
      />

      <SoftCard className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip label={t('الكل', 'All')} count={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
          {(['new', 'reviewing', 'approved', 'converted', 'rejected', 'cancelled'] as const).map((s) => (
            <FilterChip
              key={s}
              label={isAr ? STATUS_CFG[s].ar : STATUS_CFG[s].en}
              count={counts[s]}
              active={filter === s}
              onClick={() => setFilter(s)}
              tone={STATUS_CFG[s].tone}
            />
          ))}
          <FilterChip label={t('عاجل', 'Urgent')} count={counts.urgent} active={filter === 'urgent'} onClick={() => setFilter('urgent')} tone="rose" />
          <div className="flex-1 flex justify-end">
            <div className="relative w-full sm:w-72 max-w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('بحث (رقم فاتورة، اسم، شركة)…', 'Search (invoice, name, company)…')}
                className="w-full h-9 pl-9 pr-3 rounded-full text-sm bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>
        </div>
      </SoftCard>

      {loading ? (
        <SoftCard className="p-10 text-center text-sm text-slate-500">{t('جارٍ التحميل…', 'Loading…')}</SoftCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('لا توجد طلبات تطابق هذا الفلتر', 'No requests match this filter')}
          description={t('جرّب تغيير الفلتر أو البحث بكلمة مختلفة.', 'Try a different filter or search term.')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              clients={clients}
              teamMembers={teamMembers}
              isAr={isAr}
              onOpen={() => setSelected(r)}
              onUpdateStatus={onUpdateStatus}
              canEdit={canEdit}
              onOpenClient={onOpenClient}
            />
          ))}
        </div>
      )}

      <RequestEditDrawer
        request={selected}
        clients={clients}
        teamMembers={teamMembers}
        onClose={() => setSelected(null)}
        onUpdateStatus={onUpdateStatus}
        onConvert={onConvert}
        onDelete={onDelete}
        onAfterEdit={onAfterEdit}
        canEdit={canEdit}
        canAssign={canAssign}
        canDelete={canDelete}
        onOpenClient={(id) => {
          if (onOpenClient) {
            onOpenClient(id);
            setSelected(null);
          }
        }}
      />
    </div>
  );
}

function FilterChip({
  label, count, active, onClick, tone = 'slate',
}: {
  label: string; count: number; active: boolean; onClick: () => void;
  tone?: 'slate' | 'sky' | 'amber' | 'emerald' | 'violet' | 'rose';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 h-9 rounded-full text-xs font-semibold transition ${
        active ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-white/10'
      }`}
    >
      {label}
      <span className={`text-[10px] px-1.5 h-5 rounded-full inline-flex items-center justify-center tabular-nums ${active ? 'bg-white/20' : `bg-${tone}-50 text-${tone}-700`}`}>{count}</span>
    </button>
  );
}

function RequestCard({
  request, clients, teamMembers, isAr, onOpen, onUpdateStatus, canEdit, onOpenClient,
}: {
  request: PricingRequest;
  clients: Client[];
  teamMembers: TeamMember[];
  isAr: boolean;
  onOpen: () => void;
  onUpdateStatus: (id: string, s: PricingRequest['status']) => void | Promise<void>;
  canEdit: boolean;
  onOpenClient?: (id: string) => void;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const sCfg = STATUS_CFG[request.status];
  const pCfg = PRIORITY_CFG[request.priority];
  const assigned = teamMembers.find((m) => m.id === request.assigned_to);
  const cleanPhone = (request.guest_phone || '').replace(/[^\d+]/g, '');
  const displayName = resolveRequestDisplayName(request, clients);
  const isClientRequest = isLoggedInClientRequest(request);
  const linkedClient = request.client_id ? clients.find((c) => c.id === request.client_id) : null;
  const promoCode = (request.applied_promo_code || '').trim();
  const discountAmount = (() => {
    const breakdown = request.discount_breakdown;
    if (!breakdown) return 0;
    return (breakdown.base_discount || 0) + (breakdown.promo_discount || 0) + (breakdown.reward_discount || 0);
  })();

  return (
    <SoftCard className="p-5 flex flex-col gap-3" as="article">
      <button type="button" onClick={onOpen} className="text-left space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {request.invoice_number ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 h-6 rounded-full ring-1 ring-emerald-100">
              <Hash className="w-3 h-3" />
              {request.invoice_number}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">{t('بدون رقم', 'No invoice #')}</span>
          )}
          <SoftBadge tone={sCfg.tone}>{isAr ? sCfg.ar : sCfg.en}</SoftBadge>
        </div>
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[15px] font-bold text-foreground truncate">
              {displayName || t('بدون اسم', 'Unnamed')}
            </p>
            <SoftBadge tone={isClientRequest ? 'emerald' : 'slate'}>
              {isClientRequest ? t('عميل', 'Client') : t('زائر', 'Guest')}
            </SoftBadge>
            {!isClientRequest && request.guest_tracking_hash ? (
              <SoftBadge tone="emerald">{t('تتبع مفعّل', 'Tracking enabled')}</SoftBadge>
            ) : null}
            {request.status === 'cancelled' ? (
              <SoftBadge tone="rose">{t('ملغي من الزائر/العميل', 'Cancelled')}</SoftBadge>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {request.company_name && request.guest_name ? request.company_name : ''}
            {request.package_name ? ` · ${request.package_name}` : request.request_type ? ` · ${request.request_type}` : ''}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">
            {request.estimated_total
              ? `${new Intl.NumberFormat(isAr ? 'ar' : 'en').format(request.estimated_total)} ${request.price_currency || 'EGP'}`
              : '—'}
          </span>
          <SoftBadge tone={pCfg.tone} icon={Flag}>{isAr ? pCfg.ar : pCfg.en}</SoftBadge>
        </div>
        {(promoCode || discountAmount > 0) ? (
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5 truncate">
            {promoCode ? (
              <span className="font-mono font-bold tracking-wider">{promoCode}</span>
            ) : null}
            {discountAmount > 0 ? (
              <span className="tabular-nums">
                {t('خصم', 'Discount')}: −{new Intl.NumberFormat(isAr ? 'ar' : 'en').format(discountAmount)} {request.price_currency || 'EGP'}
              </span>
            ) : null}
          </div>
        ) : null}
        {linkedClient && !request.guest_name && !request.company_name ? (
          <p className="text-[10px] text-slate-400 truncate">
            {t('من ملف', 'From profile')}: {linkedClient.email || linkedClient.username}
          </p>
        ) : null}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 truncate">
            <Calendar className="w-3 h-3" />
            {new Date(request.created_at).toLocaleDateString(isAr ? 'ar' : 'en', { month: 'short', day: 'numeric' })}
          </span>
          {assigned ? (
            <span className="inline-flex items-center gap-1 truncate">
              <User className="w-3 h-3" /> {assigned.name}
            </span>
          ) : (
            <span className="text-slate-400">{t('غير مُعيّن', 'Unassigned')}</span>
          )}
        </div>
        {request.guest_last_accessed_at ? (
          <p className="text-[10px] text-slate-400">
            {t('آخر دخول للزائر', 'Last guest access')}: {new Date(request.guest_last_accessed_at).toLocaleString(isAr ? 'ar' : 'en')}
          </p>
        ) : null}
      </button>

      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-emerald-900/5 dark:border-white/5">
        {cleanPhone ? (
          <a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            title="WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </a>
        ) : null}
        {request.guest_email ? (
          <a
            href={`mailto:${request.guest_email}`}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-violet-50 text-violet-700 hover:bg-violet-100"
            title="Email"
          >
            <Mail className="w-3.5 h-3.5" />
          </a>
        ) : null}
        {request.client_id && onOpenClient ? (
          <button
            type="button"
            onClick={() => onOpenClient(request.client_id!)}
            className="inline-flex items-center gap-1 px-2 h-8 rounded-full bg-sky-50 text-sky-700 hover:bg-sky-100 text-[11px] font-semibold"
            title={t('فتح العميل', 'Open client')}
          >
            <User className="w-3 h-3" />
            {t('العميل', 'Client')}
          </button>
        ) : null}
        <select
          disabled={!canEdit}
          value={request.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => void onUpdateStatus(request.id, e.target.value as PricingRequest['status'])}
          className="ml-auto text-[11px] rounded-full px-2 h-8 bg-white ring-1 ring-slate-200 focus:outline-none focus:ring-emerald-300 disabled:opacity-50"
        >
          {(['new', 'reviewing', 'approved', 'converted', 'rejected', 'cancelled'] as PricingRequest['status'][]).map((s) => (
            <option key={s} value={s}>{isAr ? STATUS_CFG[s].ar : STATUS_CFG[s].en}</option>
          ))}
        </select>
      </div>
    </SoftCard>
  );
}

interface EditState {
  invoice_number: string;
  status: PricingRequest['status'];
  priority: PricingRequest['priority'];
  assigned_to: string | null;
  package_name: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  company_name: string;
  request_notes: string;
  admin_notes: string;
  estimated_subtotal: number;
  estimated_total: number;
  price_currency: string;
  applied_promo_code: string;
  client_id: string | null;
}

function fromRequest(r: PricingRequest | null): EditState {
  return {
    invoice_number: r?.invoice_number || '',
    status: r?.status || 'new',
    priority: r?.priority || 'medium',
    assigned_to: r?.assigned_to || null,
    package_name: r?.package_name || '',
    guest_name: r?.guest_name || '',
    guest_email: r?.guest_email || '',
    guest_phone: r?.guest_phone || '',
    company_name: r?.company_name || '',
    request_notes: r?.request_notes || '',
    admin_notes: r?.admin_notes || '',
    estimated_subtotal: r?.estimated_subtotal || 0,
    estimated_total: r?.estimated_total || 0,
    price_currency: r?.price_currency || 'EGP',
    applied_promo_code: r?.applied_promo_code || '',
    client_id: r?.client_id || null,
  };
}

function RequestEditDrawer({
  request,
  clients,
  teamMembers,
  onClose,
  onUpdateStatus,
  onConvert,
  onDelete,
  onAfterEdit,
  canEdit,
  canAssign,
  canDelete,
  onOpenClient,
}: {
  request: PricingRequest | null;
  clients: Client[];
  teamMembers: TeamMember[];
  onClose: () => void;
  onUpdateStatus: (id: string, s: PricingRequest['status']) => void | Promise<void>;
  onConvert: (r: PricingRequest) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onAfterEdit?: () => void;
  canEdit: boolean;
  canAssign: boolean;
  canDelete: boolean;
  onOpenClient: (id: string) => void;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [tab, setTab] = useState<'edit' | 'pricing' | 'workflow' | 'history' | 'advanced' | 'danger'>('edit');
  const [form, setForm] = useState<EditState>(fromRequest(request));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(fromRequest(request));
    setTab('edit');
  }, [request]);

  if (!request) return null;
  const sCfg = STATUS_CFG[request.status];
  const linkedClient = clients.find((c) => c.id === form.client_id);
  const cleanPhone = (form.guest_phone || '').replace(/[^\d+]/g, '');

  const tabs: Array<{ id: typeof tab; en: string; ar: string }> = [
    { id: 'edit', en: 'Edit', ar: 'تعديل' },
    { id: 'pricing', en: 'Services & Pricing', ar: 'الخدمات والتسعير' },
    { id: 'workflow', en: 'Workflow', ar: 'سير العمل' },
    { id: 'history', en: 'History', ar: 'السجل' },
    { id: 'advanced', en: 'Advanced', ar: 'متقدم' },
    { id: 'danger', en: 'Danger Zone', ar: 'منطقة الخطر' },
  ];

  const save = async () => {
    if (!canEdit || !request) return;
    setSaving(true);
    try {
      const updates: Partial<PricingRequest> = {
        invoice_number: form.invoice_number || null,
        status: form.status,
        priority: form.priority,
        assigned_to: form.assigned_to,
        package_name: form.package_name || null,
        guest_name: form.guest_name || null,
        guest_email: form.guest_email || null,
        guest_phone: form.guest_phone || null,
        company_name: form.company_name || null,
        request_notes: form.request_notes || null,
        admin_notes: form.admin_notes || null,
        estimated_subtotal: Number(form.estimated_subtotal) || 0,
        estimated_total: Number(form.estimated_total) || 0,
        price_currency: form.price_currency || 'EGP',
        applied_promo_code: form.applied_promo_code || null,
        client_id: form.client_id,
      };
      const result = await adminDashboardService.updatePricingRequest(request.id, updates);
      if (result.success) {
        toast.success(t('تم الحفظ', 'Saved'));
        onAfterEdit?.();
      } else {
        toast.error(result.error || t('فشل الحفظ', 'Save failed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const drawerTitle = resolveRequestDisplayName(request, clients) || t('طلب', 'Request');

  return (
    <AdminDrawer
      open={!!request}
      onOpenChange={(o) => !o && onClose()}
      title={drawerTitle}
      subtitle={request.invoice_number || request.package_name || request.request_type}
      badge={<SoftBadge tone={sCfg.tone}>{isAr ? sCfg.ar : sCfg.en}</SoftBadge>}
      width="xl"
      footer={tab === 'edit' || tab === 'pricing' ? (
        <>
          <SoftButton variant="ghost" size="sm" onClick={onClose}>{t('إلغاء', 'Cancel')}</SoftButton>
          <SoftButton variant="primary" size="sm" onClick={save} disabled={!canEdit || saving}>
            {saving ? t('جارٍ الحفظ…', 'Saving…') : t('حفظ التغييرات', 'Save changes')}
          </SoftButton>
        </>
      ) : null}
    >
      <div className="space-y-5">
        {request.invoice_number ? (
          <SoftCard className="p-3 flex items-center gap-3">
            <Hash className="w-4 h-4 text-emerald-700" />
            <span className="font-mono text-sm font-bold text-foreground">{request.invoice_number}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(request.invoice_number || '');
                toast.success(t('تم النسخ', 'Copied'));
              }}
              className="ml-auto text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> {t('نسخ', 'Copy')}
            </button>
          </SoftCard>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              className={`px-3 h-8 rounded-full text-xs font-semibold ${
                tab === x.id ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300'
              }`}
            >
              {isAr ? x.ar : x.en}
            </button>
          ))}
        </div>

        {tab === 'edit' && (
          <SoftCard className="p-5 space-y-3">
            <Group title={t('الحالة والتعيين', 'Status & assignment')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormRow label={t('الحالة', 'Status')}>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PricingRequest['status'] }))}
                    disabled={!canEdit}
                    className={inputCls}
                  >
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                      <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label={t('الأولوية', 'Priority')}>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as PricingRequest['priority'] }))}
                    disabled={!canEdit}
                    className={inputCls}
                  >
                    {Object.entries(PRIORITY_CFG).map(([k, v]) => (
                      <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label={t('عضو الفريق المعيّن', 'Assigned team member')}>
                  <select
                    value={form.assigned_to || ''}
                    onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value || null }))}
                    disabled={!canAssign}
                    className={inputCls}
                  >
                    <option value="">{t('غير مُعيّن', 'Unassigned')}</option>
                    {teamMembers.filter((m) => m.is_active).map((m) => (
                      <option key={m.id} value={m.id}>{m.name} · {m.role}</option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label={t('رقم الفاتورة', 'Invoice number')}>
                  <input
                    type="text"
                    value={form.invoice_number}
                    onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
                    disabled={!canEdit}
                    className={`${inputCls} font-mono`}
                    placeholder="LUMOS-2026-0001"
                  />
                </FormRow>
              </div>
            </Group>

            <Group title={t('العميل / الزائر', 'Client / Guest')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormRow label={t('الاسم', 'Name')}>
                  <input type="text" value={form.guest_name} onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))} disabled={!canEdit} className={inputCls} />
                </FormRow>
                <FormRow label={t('الشركة', 'Company')}>
                  <input type="text" value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} disabled={!canEdit} className={inputCls} />
                </FormRow>
                <FormRow label={t('الهاتف', 'Phone')}>
                  <input type="tel" value={form.guest_phone} onChange={(e) => setForm((f) => ({ ...f, guest_phone: e.target.value }))} disabled={!canEdit} className={inputCls} />
                </FormRow>
                <FormRow label={t('البريد', 'Email')}>
                  <input type="email" value={form.guest_email} onChange={(e) => setForm((f) => ({ ...f, guest_email: e.target.value }))} disabled={!canEdit} className={inputCls} />
                </FormRow>
                <FormRow label={t('ربط بعميل موجود', 'Link to existing client')}>
                  <select
                    value={form.client_id || ''}
                    onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value || null }))}
                    disabled={!canEdit}
                    className={inputCls}
                  >
                    <option value="">{t('بدون ربط', 'Not linked')}</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name || c.username || c.email}</option>
                    ))}
                  </select>
                </FormRow>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {cleanPhone ? (
                  <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 text-[11px] font-semibold">
                    <MessageSquare className="w-3 h-3" /> WhatsApp
                  </a>
                ) : null}
                {form.guest_email ? (
                  <a href={`mailto:${form.guest_email}`} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100 text-[11px] font-semibold">
                    <Mail className="w-3 h-3" /> {t('بريد', 'Email')}
                  </a>
                ) : null}
                {linkedClient ? (
                  <button type="button" onClick={() => onOpenClient(linkedClient.id)} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100 text-[11px] font-semibold">
                    <ExternalLink className="w-3 h-3" /> {t('فتح العميل', 'Open client')}
                  </button>
                ) : null}
              </div>
            </Group>

            <Group title={t('الباقة وملاحظات', 'Package & notes')}>
              <FormRow label={t('اسم الباقة', 'Package name')}>
                <input type="text" value={form.package_name} onChange={(e) => setForm((f) => ({ ...f, package_name: e.target.value }))} disabled={!canEdit} className={inputCls} />
              </FormRow>
              <FormRow label={t('ملاحظات الطلب (مرئية للعميل)', 'Request notes (client-visible)')}>
                <textarea rows={2} value={form.request_notes} onChange={(e) => setForm((f) => ({ ...f, request_notes: e.target.value }))} disabled={!canEdit} className={`${inputCls} h-auto py-2`} />
              </FormRow>
              <FormRow label={t('ملاحظات إدارية (داخلية)', 'Admin notes (internal)')}>
                <textarea rows={3} value={form.admin_notes} onChange={(e) => setForm((f) => ({ ...f, admin_notes: e.target.value }))} disabled={!canEdit} className={`${inputCls} h-auto py-2`} />
              </FormRow>
            </Group>
          </SoftCard>
        )}

        {tab === 'pricing' && (
          <SoftCard className="p-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormRow label={t('الإجمالي الفرعي', 'Subtotal')}>
                <input type="number" value={form.estimated_subtotal} onChange={(e) => setForm((f) => ({ ...f, estimated_subtotal: Number(e.target.value) }))} disabled={!canEdit} className={inputCls} />
              </FormRow>
              <FormRow label={t('الإجمالي', 'Total')}>
                <input type="number" value={form.estimated_total} onChange={(e) => setForm((f) => ({ ...f, estimated_total: Number(e.target.value) }))} disabled={!canEdit} className={inputCls} />
              </FormRow>
              <FormRow label={t('العملة', 'Currency')}>
                <input type="text" value={form.price_currency} onChange={(e) => setForm((f) => ({ ...f, price_currency: e.target.value.toUpperCase() }))} disabled={!canEdit} className={inputCls} />
              </FormRow>
              <FormRow label={t('كود الخصم المُطبق', 'Applied promo code')}>
                <input type="text" value={form.applied_promo_code} onChange={(e) => setForm((f) => ({ ...f, applied_promo_code: e.target.value.toUpperCase() }))} disabled={!canEdit} className={`${inputCls} font-mono`} />
              </FormRow>
            </div>
            <div className="pt-3 border-t border-emerald-900/5">
              <p className="text-xs font-bold uppercase text-emerald-700 mb-2">{t('الخدمات المختارة', 'Selected services')}</p>
              {(request.selected_services || []).length === 0 ? (
                <p className="text-sm text-slate-500">{t('لا توجد خدمات مختارة.', 'No services selected.')}</p>
              ) : (
                <ul className="divide-y divide-emerald-900/5">
                  {(request.selected_services || []).map((item) => (
                    <li key={item.id} className="py-2 flex items-center justify-between text-sm">
                      <span>{isAr ? item.nameAr || item.name : item.name}</span>
                      <span className="font-semibold tabular-nums">
                        {item.is_free ? t('مجاني', 'Free') : new Intl.NumberFormat(isAr ? 'ar' : 'en').format(item.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-slate-400 mt-2">
                {t('تعديل الخدمات الفردية يحتاج إلى محرر متقدم.', 'Editing individual services requires the advanced editor.')}
              </p>
            </div>
          </SoftCard>
        )}

        {tab === 'workflow' && (
          <SoftCard className="p-5 space-y-3">
            <RequestStatusTimeline
              status={request.status}
              status_history={request.status_history}
              mode="compact"
              animated={false}
            />
            <p className="text-xs font-bold uppercase text-emerald-700">{t('إجراءات سريعة', 'Quick actions')}</p>
            <div className="flex flex-wrap gap-2">
              <SoftButton variant="primary" size="sm" onClick={() => void onConvert(request)} disabled={!canAssign || request.status === 'converted'}>
                <ArrowRightLeft className="w-3.5 h-3.5" /> {t('تحويل إلى مشروع', 'Convert to project')}
              </SoftButton>
              <SoftButton variant="soft" size="sm" onClick={() => void onUpdateStatus(request.id, 'approved')} disabled={!canEdit || request.status === 'approved'}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('اعتماد', 'Approve')}
              </SoftButton>
              <SoftButton variant="ghost" size="sm" onClick={() => void onUpdateStatus(request.id, 'reviewing')} disabled={!canEdit}>
                <Clock className="w-3.5 h-3.5" /> {t('قيد المراجعة', 'Mark reviewing')}
              </SoftButton>
              <SoftButton variant="ghost" size="sm" onClick={() => void onUpdateStatus(request.id, 'rejected')} disabled={!canEdit}>
                <XCircle className="w-3.5 h-3.5" /> {t('رفض', 'Reject')}
              </SoftButton>
              <SoftButton variant="ghost" size="sm" onClick={() => void onUpdateStatus(request.id, 'cancelled')} disabled={!canEdit || request.status === 'cancelled'}>
                <XCircle className="w-3.5 h-3.5" /> {t('إلغاء', 'Cancel')}
              </SoftButton>
            </div>
            <div className="pt-3 border-t border-emerald-900/5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Field label={t('المُنشئ', 'Source')}>{request.request_source || '—'}</Field>
              <Field label={t('عُدّل', 'Edited')}>{request.edit_count || 0} {t('مرة', 'times')}</Field>
              <Field label={t('تاريخ المراجعة', 'Reviewed at')}>{request.reviewed_at ? new Date(request.reviewed_at).toLocaleString(isAr ? 'ar' : 'en') : '—'}</Field>
              <Field label={t('طلب محوّل', 'Converted order')}>{request.converted_order_id || '—'}</Field>
              <Field label={t('تتبع الزائر', 'Guest tracking')}>{request.guest_tracking_hash ? t('مفعّل', 'Enabled') : '—'}</Field>
              <Field label={t('آخر دخول للزائر', 'Last guest access')}>{request.guest_last_accessed_at ? new Date(request.guest_last_accessed_at).toLocaleString(isAr ? 'ar' : 'en') : '—'}</Field>
            </div>
          </SoftCard>
        )}

        {tab === 'history' && (
          <SoftCard className="p-5">
            {(request.status_history || []).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">{t('لا يوجد سجل بعد.', 'No history yet.')}</p>
            ) : (
              <ol className="relative border-l border-emerald-900/10 pl-5 space-y-4">
                {(request.status_history || []).map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                    <p className="text-sm font-semibold capitalize">{h.status}</p>
                    <p className="text-xs text-slate-500">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(h.changed_at).toLocaleString(isAr ? 'ar' : 'en')}
                    </p>
                    {h.note ? <p className="text-xs text-slate-600 mt-1">{h.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </SoftCard>
        )}

        {tab === 'advanced' && (
          <SoftCard className="p-5">
            <details>
              <summary className="text-sm font-semibold cursor-pointer text-slate-700">
                {t('التفاصيل التقنية', 'Technical details')}
              </summary>
              <pre className="mt-3 rounded-2xl bg-slate-50 p-4 text-[11px] overflow-x-auto text-slate-700">
                {JSON.stringify(request, null, 2)}
              </pre>
            </details>
          </SoftCard>
        )}

        {tab === 'danger' && (
          <SoftCard className="p-5 ring-1 ring-rose-100 bg-rose-50/30">
            <p className="text-sm font-semibold text-rose-800 mb-1">{t('إلغاء الطلب', 'Cancel request')}</p>
            <p className="text-xs text-rose-700 mb-4">
              {t('لن يتم حذف الطلب نهائياً. سيتم وضعه كملغي مع الاحتفاظ بالسجل.', 'The request will not be permanently deleted. It will be marked cancelled and kept in history.')}
            </p>
            <SoftButton
              variant="danger"
              size="sm"
              onClick={() => {
                if (window.confirm(t('متأكد من إلغاء الطلب؟', 'Confirm cancellation?'))) {
                  void onDelete(request.id);
                  onClose();
                }
              }}
              disabled={!canDelete}
            >
              <Trash2 className="w-3.5 h-3.5" /> {t('إلغاء بدون حذف', 'Cancel without deleting')}
            </SoftButton>
          </SoftCard>
        )}
      </div>
    </AdminDrawer>
  );
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 pt-2 first:pt-0">{title}</p>
      {children}
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm text-foreground mt-0.5">{children || '—'}</div>
    </div>
  );
}

void Building2;
