import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Copy,
  FileText,
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
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
  const t = (ar: string, en: string) => (isArabic ? ar : en);
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

  const verify = useCallback(async () => {
    if (!form.invoiceNumber.trim() || !form.trackingKey.trim()) {
      setError(t('أدخل رقم الفاتورة وكود التتبع.', 'Enter both invoice number and tracking code.'));
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
          'تعذر التحقق من الطلب. راجع رقم الفاتورة وكود التتبع أو تواصل مع Lumos.',
          'We could not verify this request. Check the invoice and tracking code or contact Lumos.',
        ));
        return;
      }

      setRequest(result.request);
      setEdit(buildEditState(result.request));
    } finally {
      setLoading(false);
    }
  }, [form.invoiceNumber, form.trackingKey, t]);

  useEffect(() => {
    if (searchParams.get('invoice') && searchParams.get('key')) {
      void verify();
    }
  }, []);

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
    toast.success(t('تم نسخ رابط التتبع', 'Tracking link copied'));
  };

  const contactLumos = () => {
    const message = request?.invoice_number
      ? t(`مرحباً، أحتاج مساعدة بخصوص طلب ${request.invoice_number}`, `Hello, I need help with request ${request.invoice_number}`)
      : t('مرحباً، أحتاج مساعدة بخصوص تتبع طلب.', 'Hello, I need help tracking a request.');
    window.open(`https://wa.me/201277636616?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <main className="min-h-screen bg-[#f7faf7] text-slate-950">
      <header className="border-b border-emerald-900/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-emerald-800"
          >
            <Receipt className="h-5 w-5" />
            Lumos
          </button>
          <button
            type="button"
            onClick={() => navigate('/client-login')}
            className="rounded-full border border-emerald-900/10 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50"
          >
            {t('تسجيل الدخول', 'Sign in')}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-emerald-900/10 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">
              {t('بوابة تتبع الزائر', 'Guest tracking portal')}
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">
              {t('تتبع طلب التسعير', 'Track Pricing Request')}
            </h1>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                {t('رقم الفاتورة', 'Invoice Number')}
              </span>
              <input
                value={form.invoiceNumber}
                onChange={(event) => setForm((current) => ({ ...current, invoiceNumber: event.target.value }))}
                placeholder="LUMOS-2026-0001"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                {t('كود / مفتاح التتبع', 'Tracking Code / Key')}
              </span>
              <textarea
                value={form.trackingKey}
                onChange={(event) => setForm((current) => ({ ...current, trackingKey: event.target.value }))}
                placeholder="LMS-GUEST-..."
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

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
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-900 text-sm font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
              {t('تحقق وافتح الطلب', 'Verify and open')}
            </button>

            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
              {t(
                'بدون تحقق بالبريد أو OTP، الوصول يعتمد على امتلاك كود تتبع طويل وغير قابل للتخمين.',
                'Without email verification or OTP, access depends on possession of a long unguessable tracking key.',
              )}
            </p>
          </div>
        </section>

        <section className="min-h-[560px]">
          {!request ? (
            <div className="flex h-full min-h-[560px] items-center justify-center rounded-lg border border-dashed border-emerald-900/15 bg-white p-8 text-center">
              <div>
                <FileText className="mx-auto h-10 w-10 text-emerald-700" />
                <p className="mt-4 text-lg font-black text-slate-900">
                  {t('لن تظهر بيانات الطلب قبل التحقق.', 'Request data appears only after verification.')}
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {t(
                    'أدخل رقم الفاتورة وكود التتبع الذي ظهر بعد إرسال الطلب.',
                    'Enter the invoice number and tracking code shown after request submission.',
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg border border-emerald-900/10 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-black text-emerald-800">
                        <Hash className="h-3.5 w-3.5" />
                        {request.invoice_number}
                      </span>
                      <StatusBadge status={request.status} isArabic={isArabic} />
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-slate-900">
                      {request.package_name || t('طلب مخصص', 'Custom request')}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{request.next_step}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyTrackingLink()}
                      className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {t('نسخ الرابط', 'Copy link')}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/client-signup')}
                      className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800"
                    >
                      <User className="h-3.5 w-3.5" />
                      {t('إنشاء حساب', 'Create account')}
                    </button>
                  </div>
                </div>
              </div>

              {readOnly && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                  {t(
                    'هذا الطلب لم يعد قابلاً للتعديل. تواصل مع Lumos لطلب أي تغيير.',
                    'This request can no longer be edited. Contact Lumos to request changes.',
                  )}
                </div>
              )}

              <div className="grid gap-5 lg:grid-cols-2">
                <InfoCard title={t('الخدمات والتكلفة', 'Services and totals')} icon={Package}>
                  <Field label={t('نوع الطلب', 'Request type')} value={request.request_type === 'package' ? t('باقة', 'Package') : t('مخصص', 'Custom')} />
                  <Field label={t('المجموع الفرعي', 'Subtotal')} value={formatMoney(request.estimated_subtotal, request.price_currency, locale)} />
                  <Field label={t('كود الخصم', 'Discount code')} value={request.applied_promo_code || '—'} />
                  <Field label={t('قيمة الخصم', 'Discount amount')} value={formatMoney(discountAmount(request), request.price_currency, locale)} />
                  <Field label={t('الإجمالي النهائي', 'Final total')} value={formatMoney(request.estimated_total, request.price_currency, locale)} strong />

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                      {t('الخدمات المختارة', 'Selected services')}
                    </p>
                    {request.selected_services.length === 0 ? (
                      <p className="text-sm text-slate-500">{t('لا توجد خدمات مختارة.', 'No selected services.')}</p>
                    ) : (
                      <ul className="space-y-2">
                        {request.selected_services.map((service) => (
                          <li key={service.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <span>{isArabic ? service.nameAr || service.name : service.name}</span>
                            <span className="font-semibold">{service.is_free ? t('مجاني', 'Free') : formatMoney(service.price, request.price_currency, locale)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </InfoCard>

                <InfoCard title={t('التواصل والملاحظات', 'Contact and notes')} icon={User}>
                  {edit && (
                    <div className="space-y-3">
                      <TextInput label={t('الاسم', 'Name')} value={edit.guest_name} disabled={readOnly || saving} onChange={(value) => setEdit((current) => current ? { ...current, guest_name: value } : current)} icon={User} />
                      <TextInput label={t('الهاتف', 'Phone')} value={edit.guest_phone} disabled={readOnly || saving} onChange={(value) => setEdit((current) => current ? { ...current, guest_phone: value } : current)} icon={Phone} />
                      <TextInput label={t('البريد', 'Email')} value={edit.guest_email} disabled={readOnly || saving} onChange={(value) => setEdit((current) => current ? { ...current, guest_email: value } : current)} icon={Mail} />
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t('ملاحظات', 'Notes')}</span>
                        <textarea
                          value={edit.request_notes}
                          onChange={(event) => setEdit((current) => current ? { ...current, request_notes: event.target.value } : current)}
                          disabled={readOnly || saving}
                          rows={5}
                          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </label>
                    </div>
                  )}
                </InfoCard>
              </div>

              <InfoCard title={t('السجل', 'Status history')} icon={CalendarDays}>
                {(request.status_history || []).length === 0 ? (
                  <p className="text-sm text-slate-500">{t('لا يوجد سجل بعد.', 'No history yet.')}</p>
                ) : (
                  <ol className="space-y-3">
                    {(request.status_history || []).map((item, index) => (
                      <li key={`${item.changed_at}-${index}`} className="rounded-lg bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-bold capitalize text-slate-900">{item.status}</span>
                          <span className="text-xs text-slate-500">{new Date(item.changed_at).toLocaleString(locale)}</span>
                        </div>
                        {item.note ? <p className="mt-1 text-sm text-slate-600">{item.note}</p> : null}
                      </li>
                    ))}
                  </ol>
                )}
              </InfoCard>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={contactLumos}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-bold text-white hover:bg-[#20b558]"
                >
                  <MessageSquare className="h-4 w-4" />
                  {t('تواصل مع Lumos', 'Contact Lumos')}
                </button>
                <button
                  type="button"
                  onClick={() => void cancelRequest()}
                  disabled={readOnly || saving}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-rose-200 px-5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {t('إلغاء الطلب', 'Cancel request')}
                </button>
                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  disabled={readOnly || saving}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t('حفظ التعديلات', 'Save changes')}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status, isArabic }: { status: GuestTrackedRequest['status']; isArabic: boolean }) {
  const labels: Record<GuestTrackedRequest['status'], { en: string; ar: string; cls: string }> = {
    new: { en: 'New', ar: 'جديد', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    reviewing: { en: 'Reviewing', ar: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { en: 'Approved', ar: 'معتمد', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    converted: { en: 'Converted', ar: 'محوّل', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    rejected: { en: 'Needs revision', ar: 'يحتاج تعديل', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
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
}: {
  title: string;
  icon: typeof Package;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-emerald-900/10 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-700" />
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h3>
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

function TextInput({
  label,
  value,
  disabled,
  icon: Icon,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  icon: typeof User;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500"
        />
      </div>
    </label>
  );
}
