import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { Client } from '@/types/dashboard';
import { AdminDrawer } from './AdminDrawer';
import { SoftButton, SoftCard } from './primitives';

interface ClientEditDrawerProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Client>) => Promise<void> | void;
}

interface ClientFormState {
  username: string;
  email: string;
  phone: string;
  company_name: string;
  package_name: string;
  status: string;
  progress: number;
  industry: string;
  website: string;
  business_tagline: string;
  full_contact_name: string;
  project_summary: string;
  next_steps: string;
  admin_notes: string;
}

function fromClient(c: Client | null): ClientFormState {
  return {
    username: c?.username || '',
    email: c?.email || '',
    phone: c?.phone || c?.phone_number || '',
    company_name: c?.company_name || '',
    package_name: c?.package_name || '',
    status: c?.status || 'active',
    progress: c?.progress ?? 0,
    industry: c?.industry || '',
    website: c?.website || '',
    business_tagline: c?.business_tagline || '',
    full_contact_name: c?.full_contact_name || '',
    project_summary: c?.project_summary || '',
    next_steps: c?.next_steps || '',
    admin_notes: c?.admin_notes || '',
  };
}

export function ClientEditDrawer({ client, open, onClose, onSave }: ClientEditDrawerProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [form, setForm] = useState<ClientFormState>(fromClient(client));

  useEffect(() => {
    setForm(fromClient(client));
  }, [client]);

  return (
    <AdminDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('تحرير العميل', 'Edit client')}
      subtitle={client?.email || client?.username || ''}
      width="xl"
      footer={
        <>
          <SoftButton variant="ghost" size="sm" onClick={onClose}>
            {t('إلغاء', 'Cancel')}
          </SoftButton>
          <SoftButton
            variant="primary"
            size="sm"
            onClick={async () => {
              if (!client) return;
              const payload: Partial<Client> = {
                username: form.username,
                email: form.email,
                phone: form.phone,
                company_name: form.company_name,
                package_name: form.package_name,
                status: form.status,
                progress: Number(form.progress),
                industry: form.industry,
                website: form.website,
                business_tagline: form.business_tagline,
                full_contact_name: form.full_contact_name,
                project_summary: form.project_summary,
                next_steps: form.next_steps,
                admin_notes: form.admin_notes,
              };
              await onSave(client.id, payload);
              onClose();
            }}
          >
            {t('حفظ', 'Save')}
          </SoftButton>
        </>
      }
    >
      <div className="space-y-5">
        <SoftCard className="p-5 space-y-3">
          <Group title={t('الأساسيات', 'Basics')}>
            <FormRow label={t('اسم المستخدم', 'Username')}>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className={inputCls}
              />
            </FormRow>
            <FormRow label={t('البريد', 'Email')}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls}
              />
            </FormRow>
            <FormRow label={t('الهاتف', 'Phone')}>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputCls}
              />
            </FormRow>
            <FormRow label={t('الشخص المسؤول', 'Contact name')}>
              <input
                type="text"
                value={form.full_contact_name}
                onChange={(e) => setForm((f) => ({ ...f, full_contact_name: e.target.value }))}
                className={inputCls}
              />
            </FormRow>
          </Group>

          <Group title={t('الأعمال', 'Business')}>
            <FormRow label={t('الشركة', 'Company')}>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                className={inputCls}
              />
            </FormRow>
            <FormRow label={t('الشعار', 'Tagline')}>
              <input
                type="text"
                value={form.business_tagline}
                onChange={(e) => setForm((f) => ({ ...f, business_tagline: e.target.value }))}
                className={inputCls}
              />
            </FormRow>
            <FormRow label={t('الصناعة', 'Industry')}>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                className={inputCls}
              />
            </FormRow>
            <FormRow label={t('الموقع', 'Website')}>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                className={inputCls}
                placeholder="https://…"
              />
            </FormRow>
          </Group>

          <Group title={t('المشروع', 'Project')}>
            <FormRow label={t('الباقة', 'Package')}>
              <input
                type="text"
                value={form.package_name}
                onChange={(e) => setForm((f) => ({ ...f, package_name: e.target.value }))}
                className={inputCls}
              />
            </FormRow>
            <FormRow label={t('الحالة', 'Status')}>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className={inputCls}
              >
                <option value="active">{t('نشط', 'Active')}</option>
                <option value="pending">{t('بانتظار', 'Pending')}</option>
                <option value="archived">{t('مؤرشف', 'Archived')}</option>
              </select>
            </FormRow>
            <FormRow label={t('التقدم %', 'Progress %')}>
              <input
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) }))}
                className={inputCls}
              />
            </FormRow>
            <FormRow label={t('ملخص المشروع', 'Project summary')}>
              <textarea
                rows={3}
                value={form.project_summary}
                onChange={(e) => setForm((f) => ({ ...f, project_summary: e.target.value }))}
                className={`${inputCls} h-auto py-2`}
              />
            </FormRow>
            <FormRow label={t('الخطوة التالية', 'Next steps')}>
              <input
                type="text"
                value={form.next_steps}
                onChange={(e) => setForm((f) => ({ ...f, next_steps: e.target.value }))}
                className={inputCls}
              />
            </FormRow>
          </Group>

          <Group title={t('ملاحظات', 'Notes')}>
            <FormRow label={t('ملاحظات الإدارة (داخلية)', 'Admin notes (internal)')}>
              <textarea
                rows={3}
                value={form.admin_notes}
                onChange={(e) => setForm((f) => ({ ...f, admin_notes: e.target.value }))}
                className={`${inputCls} h-auto py-2`}
              />
            </FormRow>
          </Group>
        </SoftCard>
      </div>
    </AdminDrawer>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 pt-2 first:pt-0">
        {title}
      </p>
      {children}
    </div>
  );
}

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

const inputCls =
  'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200';
