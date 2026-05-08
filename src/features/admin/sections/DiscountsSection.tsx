import { useEffect, useState } from 'react';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { DiscountCode } from '@/types/dashboard';
import { useDiscountCodes } from '../data/useDiscountCodes';
import {
  EmptyState,
  SectionHeader,
  SoftBadge,
  SoftButton,
  SoftCard,
} from '../components/primitives';
import { AdminDrawer } from '../components/AdminDrawer';
import { useAdminPermission } from '../hooks/useAdminPermission';

export function DiscountsSection({ openCreate = false, onCreateOpened }: { openCreate?: boolean; onCreateOpened?: () => void }) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { codes, loading, createCode, updateCode, deleteCode } = useDiscountCodes();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);

  const canCreate = useAdminPermission('discounts', 'create');
  const canEdit = useAdminPermission('discounts', 'edit');
  const canDelete = useAdminPermission('discounts', 'delete');

  // External signal to open the create dialog (from Quick Actions)
  useEffect(() => {
    if (openCreate) {
      setShowForm(true);
      onCreateOpened?.();
    }
  }, [openCreate, onCreateOpened]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('أكواد الخصم', 'Discount codes')}
        subtitle={t(
          'الأكواد التي تطبقها على الباقات والخدمات.',
          'Promo codes applied to packages and services.',
        )}
        actions={
          <SoftButton
            variant="primary"
            size="md"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            disabled={!canCreate}
          >
            <Plus className="w-4 h-4" />
            {t('كود جديد', 'New code')}
          </SoftButton>
        }
      />

      {loading ? (
        <SoftCard className="p-10 text-center text-sm text-slate-500">
          {t('جارٍ التحميل…', 'Loading…')}
        </SoftCard>
      ) : codes.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={t('لا توجد أكواد بعد', 'No discount codes yet')}
          description={t(
            'أنشئ أول كود خصم لتفعيله في صفحة التسعير.',
            'Create your first code to activate it on the pricing page.',
          )}
          action={
            canCreate ? (
              <SoftButton variant="primary" size="md" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" />
                {t('كود جديد', 'New code')}
              </SoftButton>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {codes.map((c) => (
            <DiscountCard
              key={c.id}
              code={c}
              isAr={isAr}
              canEdit={canEdit}
              canDelete={canDelete}
              onToggle={(active) => updateCode(c.id, { is_active: active })}
              onEdit={() => {
                setEditing(c);
                setShowForm(true);
              }}
              onDelete={() => {
                if (window.confirm(t('متأكد من الحذف؟', 'Confirm delete?'))) void deleteCode(c.id);
              }}
            />
          ))}
        </div>
      )}

      <DiscountFormDrawer
        open={showForm}
        existing={editing}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        onCreate={async (input) => {
          const r = await createCode(input);
          if (r.success) {
            setShowForm(false);
          }
        }}
        onUpdate={async (id, input) => {
          const r = await updateCode(id, input);
          if (r.success) {
            setShowForm(false);
            setEditing(null);
          }
        }}
      />
    </div>
  );
}

function DiscountCard({
  code,
  isAr,
  canEdit,
  canDelete,
  onToggle,
  onEdit,
  onDelete,
}: {
  code: DiscountCode;
  isAr: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onToggle: (active: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const usagePct = code.usage_limit
    ? Math.min(100, Math.round(((code.usage_count || 0) / code.usage_limit) * 100))
    : 0;
  return (
    <SoftCard className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-mono font-bold tracking-wide text-foreground truncate">
            {code.code}
          </p>
          {code.description ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{code.description}</p>
          ) : null}
        </div>
        <SoftBadge tone={code.is_active ? 'emerald' : 'slate'}>
          {code.is_active ? t('نشط', 'Active') : t('متوقف', 'Inactive')}
        </SoftBadge>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-emerald-700">
          {code.discount_type === 'percentage'
            ? `${code.discount_value}%`
            : `${new Intl.NumberFormat(isAr ? 'ar' : 'en').format(code.discount_value)} EGP`}
        </span>
        {code.valid_until ? (
          <span className="text-[11px] text-slate-500">
            {t('صالح حتى', 'Valid until')}{' '}
            {new Date(code.valid_until).toLocaleDateString(isAr ? 'ar' : 'en', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        ) : null}
      </div>

      {code.usage_limit ? (
        <div>
          <div className="h-1.5 rounded-full bg-emerald-50 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${usagePct}%` }} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {code.usage_count || 0}/{code.usage_limit} {t('استخدام', 'uses')}
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-2 border-t border-emerald-900/5 dark:border-white/5">
        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={code.is_active}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={!canEdit}
          />
          {t('تفعيل', 'Active')}
        </label>
        <div className="flex items-center gap-1">
          <SoftButton variant="ghost" size="sm" onClick={onEdit} disabled={!canEdit}>
            {t('تحرير', 'Edit')}
          </SoftButton>
          <SoftButton variant="danger" size="sm" onClick={onDelete} disabled={!canDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </SoftButton>
        </div>
      </div>
    </SoftCard>
  );
}

interface DiscountFormState {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount: number;
  valid_until: string;
  usage_limit: number;
  is_active: boolean;
}

function emptyDiscount(): DiscountFormState {
  return {
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_order_value: 0,
    max_discount: 0,
    valid_until: '',
    usage_limit: 0,
    is_active: true,
  };
}

function DiscountFormDrawer({
  open,
  existing,
  onClose,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  existing: DiscountCode | null;
  onClose: () => void;
  onCreate: (input: Partial<DiscountCode>) => void | Promise<void>;
  onUpdate: (id: string, input: Partial<DiscountCode>) => void | Promise<void>;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [form, setForm] = useState<DiscountFormState>(emptyDiscount);

  useEffect(() => {
    if (existing) {
      setForm({
        code: existing.code,
        description: existing.description || '',
        discount_type: existing.discount_type,
        discount_value: existing.discount_value,
        min_order_value: existing.min_order_value || 0,
        max_discount: existing.max_discount || 0,
        valid_until: existing.valid_until ? existing.valid_until.slice(0, 10) : '',
        usage_limit: existing.usage_limit || 0,
        is_active: existing.is_active,
      });
    } else {
      setForm(emptyDiscount());
    }
  }, [existing, open]);

  return (
    <AdminDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={existing ? t('تحرير كود', 'Edit code') : t('كود خصم جديد', 'New discount code')}
      footer={
        <>
          <SoftButton variant="ghost" size="sm" onClick={onClose}>
            {t('إلغاء', 'Cancel')}
          </SoftButton>
          <SoftButton
            variant="primary"
            size="sm"
            onClick={() => {
              if (!form.code.trim()) return;
              const payload: Partial<DiscountCode> = {
                code: form.code.toUpperCase(),
                description: form.description,
                discount_type: form.discount_type,
                discount_value: Number(form.discount_value),
                min_order_value: Number(form.min_order_value),
                max_discount: Number(form.max_discount),
                valid_until: form.valid_until || null,
                usage_limit: Number(form.usage_limit),
                is_active: form.is_active,
              };
              if (existing) void onUpdate(existing.id, payload);
              else void onCreate(payload);
            }}
          >
            {existing ? t('حفظ', 'Save') : t('إنشاء', 'Create')}
          </SoftButton>
        </>
      }
    >
      <SoftCard className="p-5 space-y-3">
        <FormRow label={t('الكود', 'Code')}>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            className={`${inputCls} font-mono uppercase tracking-wide`}
            placeholder="LUMOS20"
          />
        </FormRow>
        <FormRow label={t('الوصف', 'Description')}>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className={inputCls}
          />
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label={t('النوع', 'Type')}>
            <select
              value={form.discount_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, discount_type: e.target.value as 'percentage' | 'fixed' }))
              }
              className={inputCls}
            >
              <option value="percentage">{t('نسبة %', 'Percentage')}</option>
              <option value="fixed">{t('قيمة ثابتة', 'Fixed')}</option>
            </select>
          </FormRow>
          <FormRow label={t('القيمة', 'Value')}>
            <input
              type="number"
              value={form.discount_value}
              onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
              className={inputCls}
            />
          </FormRow>
          <FormRow label={t('الحد الأدنى للطلب', 'Min order value')}>
            <input
              type="number"
              value={form.min_order_value}
              onChange={(e) => setForm((f) => ({ ...f, min_order_value: Number(e.target.value) }))}
              className={inputCls}
            />
          </FormRow>
          <FormRow label={t('الحد الأقصى للخصم', 'Max discount')}>
            <input
              type="number"
              value={form.max_discount}
              onChange={(e) => setForm((f) => ({ ...f, max_discount: Number(e.target.value) }))}
              className={inputCls}
            />
          </FormRow>
          <FormRow label={t('صالح حتى', 'Valid until')}>
            <input
              type="date"
              value={form.valid_until}
              onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
              className={inputCls}
            />
          </FormRow>
          <FormRow label={t('حد الاستخدام', 'Usage limit')}>
            <input
              type="number"
              value={form.usage_limit}
              onChange={(e) => setForm((f) => ({ ...f, usage_limit: Number(e.target.value) }))}
              className={inputCls}
            />
          </FormRow>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          {t('مفعّل', 'Active')}
        </label>
      </SoftCard>
    </AdminDrawer>
  );
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200';

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
        {label}
      </span>
      {children}
    </label>
  );
}
