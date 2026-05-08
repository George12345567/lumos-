import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Hash,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Receipt,
  Save,
  User,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import { RequestStatusTimeline } from '@/components/requests/RequestStatusTimeline';
import { requestStatusLabel } from '@/components/requests/requestStatus';
import {
  buildGuestTrackingUrl,
  GUEST_DUPLICATE_MESSAGE_AR,
  GUEST_DUPLICATE_MESSAGE_EN,
  guestUpdateRequest,
  type GuestTrackedRequest,
  verifyGuestTracking,
} from '@/services/guestTrackingService';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'lumos_pending_request';

type FormState = {
  invoiceNumber: string;
  trackingKey: string;
};

type EditState = {
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  request_notes: string;
};

function getCachedInvoice() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { invoiceNumber?: string; invoice_number?: string };
    return parsed.invoiceNumber || parsed.invoice_number || '';
  } catch {
    return '';
  }
}

function formatMoney(value: number, currency: string, locale: string) {
  return `${new Intl.NumberFormat(locale).format(value || 0)} ${currency || 'EGP'}`;
}

function discountAmount(request: GuestTrackedRequest) {
  const d = request.discount_breakdown;
  if (!d) return 0;
  return (d.base_discount || 0) + (d.promo_discount || 0) + (d.reward_discount || 0);
}

function buildEditState(request: GuestTrackedRequest): EditState {
  return {
    guest_name: request.guest_name || '',
    guest_phone: request.guest_phone || '',
    guest_email: request.guest_email || '',
    request_notes: request.request_notes || '',
  };
}

export default function TrackRequestPage() {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoVerifiedRef = useRef(false);
  const t = useCallback((ar: string, en: string) => (isArabic ? ar : en), [isArabic]);
  const locale = isArabic ? 'ar' : 'en';

  const [form, setForm] = useState<FormState>(() => ({
    invoiceNumber: searchParams.get('invoice') || getCachedInvoice(),
    trackingKey: searchParams.get('key') || '',
  }));
  const [request, setRequest] = useState<GuestTrackedRequest | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const readOnly = request ? !request.can_edit : true;
  const trackingUrl = useMemo(
    () => buildGuestTrackingUrl(form.invoiceNumber, form.trackingKey),
    [form.invoiceNumber, form.trackingKey],
  );

  const cleanUrlAfterVerified = useCallback((invoiceNumber: string) => {
    const cleanUrl = `/track-request?invoice=${encodeURIComponent(invoiceNumber)}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }, []);

  const verify = useCallback(async (cleanUrl = false) => {
    if (!form.invoiceNumber.trim() || !form.trackingKey.trim()) {
      setError(t('أدخل رقم الفاتورة وكود الدخول.', 'Enter your invoice number and access code.'));
      return;
    }

    setLoading(true);
    setError(null);
    setRequest(null);
    try {
      const result = await verifyGuestTracking({
        invoiceNumber: form.invoiceNumber.trim(),
        trackingKey: form.trackingKey.trim(),
      });

      if (!result.success || !result.request) {
        setError(t(
          'تعذر فتح الطلب. راجع رقم الفاتورة وكود الدخول أو تواصل مع Lumos.',
          'We could not open this request. Check the invoice and access code or contact Lumos.',
        ));
        return;
      }

      setRequest(result.request);
      setEdit(buildEditState(result.request));
      if (cleanUrl) cleanUrlAfterVerified(result.request.invoice_number);
    } finally {
      setLoading(false);
    }
  }, [cleanUrlAfterVerified, form.invoiceNumber, form.trackingKey, t]);

  useEffect(() => {
    if (autoVerifiedRef.current) return;
    if (searchParams.get('invoice') && searchParams.get('key')) {
      autoVerifiedRef.current = true;
      void verify(true);
    }
  }, [searchParams, verify]);

  const saveChanges = async () => {
    if (!request || !edit || readOnly) return;
    setSaving(true);
    setError(null);
    try {
      const result = await guestUpdateRequest({
        invoiceNumber: form.invoiceNumber.trim(),
        trackingKey: form.trackingKey.trim(),
        updates: edit,
      });

      if (!result.success) {
        setError(result.error === 'duplicate_contact'
          ? (isArabic ? GUEST_DUPLICATE_MESSAGE_AR : GUEST_DUPLICATE_MESSAGE_EN)
          : t('تعذر حفظ التعديلات.', 'Could not save changes.'));
        if (result.request) {
          setRequest(result.request);
          setEdit(buildEditState(result.request));
        }
        return;
      }

      if (result.request) {
        setRequest(result.request);
        setEdit(buildEditState(result.request));
      }
      toast.success(t('تم حفظ التعديلات', 'Changes saved'));
    } finally {
      setSaving(false);
    }
  };

  const cancelRequest = async () => {
    if (!request || readOnly) return;
    const confirmed = window.confirm(t('هل تريد إلغاء الطلب؟ لا يتم حذف الطلب نهائياً.', 'Cancel this request? The request will not be permanently deleted.'));
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      const result = await guestUpdateRequest({
        invoiceNumber: form.invoiceNumber.trim(),
        trackingKey: form.trackingKey.trim(),
        updates: { action: 'cancel' },
      });

      if (!result.success) {
        setError(t('تعذر إلغاء الطلب.', 'Could not cancel the request.'));
        return;
      }

      if (result.request) {
        setRequest(result.request);
        setEdit(buildEditState(result.request));
      }
      toast.success(t('تم إلغاء الطلب', 'Request cancelled'));
    } finally {
      setSaving(false);
    }
  };

  const copyTrackingLink = async () => {
    await navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success(t('تم نسخ رابط الدخول', 'Access link copied'));
  };

  const contactLumos = () => {
    const message = request?.invoice_number
      ? t(`مرحباً، أحتاج مساعدة بخصوص طلب ${request.invoice_number}`, `Hello, I need help with request ${request.invoice_number}`)
      : t('مرحباً، أحتاج مساعدة بخصوص تتبع طلب.', 'Hello, I need help tracking a request.');
    window.open(`https://wa.me/201277636616?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!request) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfdf5_0,#f8fafc_42%,#ffffff_100%)] text-slate-950">
        <TopBar onHome={() => navigate('/')} onSignIn={() => navigate('/client-login')} isArabic={isArabic} />
        <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl items-center justify-center px-5 py-10">
          <section className="w-full max-w-md rounded-lg border border-emerald-900/10 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
            <div className="mb-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Receipt className="h-7 w-7" />
              </div>
              <h1 className="mt-4 text-3xl font-black text-slate-900">
                {t('تتبع طلبك', 'Track your request')}
              </h1>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                {t('أدخل رقم الفاتورة وكود الدخول.', 'Enter your invoice number and access code.')}
              </p>
            </div>

            <div className="space-y-4">
              <TextField
                label={t('رقم الفاتورة', 'Invoice Number')}
                value={form.invoiceNumber}
                onChange={(value) => setForm((current) => ({ ...current, invoiceNumber: value }))}
                placeholder="LUMOS-2026-0001"
                icon={Hash}
                mono
              />
              <TextField
                label={t('كود الدخول', 'Access Code')}
                value={form.trackingKey}
                onChange={(value) => setForm((current) => ({ ...current, trackingKey: value }))}
                placeholder="LMS-GUEST-..."
                icon={Receipt}
                mono
              />

              {error && (
                <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => void verify()}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-900 text-sm font-black text-white shadow-lg hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                {t('افتح الطلب', 'Open request')}
              </button>

              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
                {t(
                  'الدخول كزائر يعتمد على رابط الدخول الآمن، وليس على بيانات محفوظة في المتصفح.',
                  'Guest access depends on your secure access link, not browser-stored data.',
                )}
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] text-slate-950">
      <TopBar onHome={() => navigate('/')} onSignIn={() => navigate('/client-login')} isArabic={isArabic} />
      <div className="mx-auto max-w-6xl px-5 py-8">
        <section className="rounded-lg border border-emerald-900/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-black text-emerald-800">
                  <Hash className="h-3.5 w-3.5" />
                  {request.invoice_number}
                </span>
                <StatusBadge status={request.status} isArabic={isArabic} />
              </div>
              <h1 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
                {request.package_name || t('طلب مخصص', 'Custom request')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                {request.next_step || t('فريق Lumos هيراجع الطلب قريبًا.', 'The Lumos team will review this request soon.')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyTrackingLink()}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {t('نسخ رابط الدخول', 'Copy access link')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/client-signup')}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-700 px-4 text-xs font-bold text-white hover:bg-emerald-800"
              >
                <User className="h-3.5 w-3.5" />
                {t('إنشاء حساب', 'Create account')}
              </button>
            </div>
          </div>
        </section>

        <div className="mt-5">
          <RequestStatusTimeline
            status={request.status}
            status_history={request.status_history}
            mode="full"
            animated
            className="shadow-sm"
          />
        </div>

        {readOnly && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {t(
              'هذا الطلب لم يعد قابلاً للتعديل. تواصل مع Lumos لطلب أي تغيير.',
              'This request can no longer be edited. Contact Lumos to request changes.',
            )}
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <InfoCard title={t('الخدمات المختارة', 'Selected Services')} icon={Package} prominent>
            {request.selected_services.length === 0 ? (
              <p className="text-sm text-slate-500">{t('لا توجد خدمات مختارة.', 'No selected services.')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {request.selected_services.map((service) => (
                  <span key={service.id} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-slate-900">
                    {isArabic ? service.nameAr || service.name : service.name}
                  </span>
                ))}
              </div>
            )}
          </InfoCard>

          <InfoCard title={t('ملخص السعر', 'Summary')} icon={Receipt}>
            <Field label={t('المجموع الفرعي', 'Subtotal')} value={formatMoney(request.estimated_subtotal, request.price_currency, locale)} />
            <Field label={t('كود الخصم', 'Discount code')} value={request.applied_promo_code || '—'} />
            <Field label={t('قيمة الخصم', 'Discount amount')} value={formatMoney(discountAmount(request), request.price_currency, locale)} />
            <Field label={t('الإجمالي النهائي', 'Final price')} value={formatMoney(request.estimated_total, request.price_currency, locale)} strong />
          </InfoCard>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.75fr]">
          <InfoCard title={t('إدارة الطلب', 'Manage Request')} icon={User}>
            <details>
              <summary className="cursor-pointer text-sm font-black text-slate-900">
                {readOnly
                  ? t('عرض بيانات التواصل', 'View contact details')
                  : t('تعديل بيانات التواصل والملاحظات', 'Edit contact details and notes')}
              </summary>
              <div className="mt-4 space-y-3">
                {edit && (
                  <>
                    <TextField label={t('الاسم', 'Name')} value={edit.guest_name} disabled={readOnly || saving} onChange={(value) => setEdit((current) => current ? { ...current, guest_name: value } : current)} icon={User} />
                    <TextField label={t('الهاتف', 'Phone')} value={edit.guest_phone} disabled={readOnly || saving} onChange={(value) => setEdit((current) => current ? { ...current, guest_phone: value } : current)} icon={Phone} />
                    <TextField label={t('البريد', 'Email')} value={edit.guest_email} disabled={readOnly || saving} onChange={(value) => setEdit((current) => current ? { ...current, guest_email: value } : current)} icon={Mail} />
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold text-slate-500">{t('ملاحظات', 'Notes')}</span>
                      <textarea
                        value={edit.request_notes}
                        onChange={(event) => setEdit((current) => current ? { ...current, request_notes: event.target.value } : current)}
                        disabled={readOnly || saving}
                        rows={4}
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </label>
                  </>
                )}

                {error && (
                  <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void cancelRequest()}
                    disabled={readOnly || saving}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-rose-200 px-4 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    {t('إلغاء الطلب', 'Cancel request')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveChanges()}
                    disabled={readOnly || saving}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t('حفظ التعديلات', 'Save changes')}
                  </button>
                </div>
              </div>
            </details>
          </InfoCard>

          <InfoCard title={t('المساعدة والنشاط', 'Help and Activity')} icon={MessageSquare}>
            <div className="space-y-3">
              <button
                type="button"
                onClick={contactLumos}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-xs font-bold text-white hover:bg-[#20b558]"
              >
                <MessageSquare className="h-4 w-4" />
                {t('تواصل مع Lumos', 'Contact Lumos')}
              </button>
              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-black text-slate-900">
                  {t('عرض سجل النشاط', 'View activity history')}
                </summary>
                {(request.status_history || []).length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">{t('لا يوجد سجل بعد.', 'No history yet.')}</p>
                ) : (
                  <ol className="mt-3 space-y-3">
                    {(request.status_history || []).map((item, index) => (
                      <li key={`${item.changed_at}-${index}`} className="rounded-lg bg-white p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold capitalize text-slate-900">{requestStatusLabel(item.status, isArabic)}</span>
                          <span className="text-xs text-slate-500">{new Date(item.changed_at).toLocaleString(locale)}</span>
                        </div>
                        {item.note ? <p className="mt-1 text-slate-600">{item.note}</p> : null}
                      </li>
                    ))}
                  </ol>
                )}
              </details>
            </div>
          </InfoCard>
        </div>
      </div>
    </main>
  );
}

function TopBar({ onHome, onSignIn, isArabic }: { onHome: () => void; onSignIn: () => void; isArabic: boolean }) {
  return (
    <header className="border-b border-emerald-900/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2 text-sm font-black text-emerald-800"
        >
          <Receipt className="h-5 w-5" />
          Lumos
        </button>
        <button
          type="button"
          onClick={onSignIn}
          className="rounded-full border border-emerald-900/10 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50"
        >
          {isArabic ? 'تسجيل الدخول' : 'Sign in'}
        </button>
      </div>
    </header>
  );
}

function StatusBadge({ status, isArabic }: { status: GuestTrackedRequest['status']; isArabic: boolean }) {
  const labels: Record<GuestTrackedRequest['status'], { en: string; ar: string; cls: string }> = {
    new: { en: 'Received', ar: 'تم الاستلام', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    reviewing: { en: 'Review', ar: 'المراجعة', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { en: 'Approval', ar: 'الاعتماد', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    converted: { en: 'Project', ar: 'المشروع', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    rejected: { en: 'Rejected', ar: 'مرفوض', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    cancelled: { en: 'Cancelled', ar: 'ملغي', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  };
  const cfg = labels[status] || labels.new;
  return (
    <span className={cn('rounded-full border px-3 py-1 text-xs font-bold', cfg.cls)}>
      {isArabic ? cfg.ar : cfg.en}
    </span>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
  prominent,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  prominent?: boolean;
}) {
  return (
    <section className={cn('rounded-lg border bg-white p-5 shadow-sm', prominent ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-emerald-900/10')}>
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-700" />
        <h2 className="text-sm font-black text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={cn('text-right font-semibold text-slate-800', strong && 'text-base font-black text-emerald-800')}>{value}</span>
    </div>
  );
}

function TextField({
  label,
  value,
  disabled,
  icon: Icon,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  icon: LucideIcon;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-500">{label}</span>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500',
            mono && 'font-mono',
          )}
        />
      </div>
    </label>
  );
}
