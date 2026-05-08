import { useMemo, useState } from 'react';
import { Mail, MessageSquare, Phone, Search, Trash2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { Contact } from '@/types/dashboard';
import {
  EmptyState,
  SectionHeader,
  SoftBadge,
  SoftButton,
  SoftCard,
} from '../components/primitives';
import { AdminDrawer } from '../components/AdminDrawer';
import { useAdminPermission } from '../hooks/useAdminPermission';

interface ContactsSectionProps {
  contacts: Contact[];
  loading: boolean;
  onUpdateStatus: (id: string, status: Contact['status']) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

const STATUS_CFG: Record<
  Contact['status'],
  { tone: 'sky' | 'amber' | 'emerald' | 'slate'; en: string; ar: string }
> = {
  new: { tone: 'sky', en: 'New', ar: 'جديد' },
  read: { tone: 'amber', en: 'Read', ar: 'مقروء' },
  contacted: { tone: 'emerald', en: 'Contacted', ar: 'تم التواصل' },
  resolved: { tone: 'slate', en: 'Resolved', ar: 'مغلق' },
};

export function ContactsSection({ contacts, loading, onUpdateStatus, onDelete }: ContactsSectionProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [filter, setFilter] = useState<Contact['status'] | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);

  const canEdit = useAdminPermission('contacts', 'edit');
  const canDelete = useAdminPermission('contacts', 'delete');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (!term) return true;
      const haystack = [c.name, c.email, c.phone, c.business_name, c.message].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [contacts, filter, search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('جهات الاتصال', 'Contacts')}
        subtitle={t('الرسائل الواردة من نموذج التواصل.', 'Inbound messages from the contact form.')}
      />

      <SoftCard className="p-3 flex flex-wrap items-center gap-2">
        {(['all', 'new', 'read', 'contacted', 'resolved'] as Array<'all' | Contact['status']>).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 h-9 rounded-full text-xs font-semibold ${
              filter === f
                ? 'bg-slate-900 text-white'
                : 'bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300 dark:bg-slate-900 dark:ring-white/10 dark:text-slate-300'
            }`}
          >
            {f === 'all' ? t('الكل', 'All') : isAr ? STATUS_CFG[f].ar : STATUS_CFG[f].en}
          </button>
        ))}
        <div className="flex-1 flex justify-end">
          <div className="relative w-full sm:w-72 max-w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('بحث…', 'Search…')}
              className="w-full h-9 pl-9 pr-3 rounded-full text-sm bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>
      </SoftCard>

      {loading ? (
        <SoftCard className="p-10 text-center text-sm text-slate-500">
          {t('جارٍ التحميل…', 'Loading…')}
        </SoftCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={t('لا توجد رسائل', 'No contact messages')}
          description={t(
            'يظهر هنا أي ملء لنموذج التواصل من الموقع.',
            'Anything submitted via the website contact form will land here.',
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <SoftCard
              key={c.id}
              className="p-5 cursor-pointer hover:shadow-md transition"
              as="article"
            >
              <button
                type="button"
                onClick={() => setSelected(c)}
                className="text-left w-full space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-foreground truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {c.business_name || c.industry || ''}
                    </p>
                  </div>
                  <SoftBadge tone={STATUS_CFG[c.status].tone}>
                    {isAr ? STATUS_CFG[c.status].ar : STATUS_CFG[c.status].en}
                  </SoftBadge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{c.message}</p>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-300 pt-2 border-t border-emerald-900/5 dark:border-white/5">
                  {c.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {c.phone}
                    </span>
                  ) : null}
                  {c.email ? (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {c.email}
                    </span>
                  ) : null}
                </div>
              </button>
            </SoftCard>
          ))}
        </div>
      )}

      <ContactDetailDrawer
        contact={selected}
        onClose={() => setSelected(null)}
        canEdit={canEdit}
        canDelete={canDelete}
        onUpdateStatus={onUpdateStatus}
        onDelete={async (id) => {
          await onDelete(id);
          setSelected(null);
        }}
      />
    </div>
  );
}

function ContactDetailDrawer({
  contact,
  onClose,
  canEdit,
  canDelete,
  onUpdateStatus,
  onDelete,
}: {
  contact: Contact | null;
  onClose: () => void;
  canEdit: boolean;
  canDelete: boolean;
  onUpdateStatus: (id: string, s: Contact['status']) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  if (!contact) return null;
  const cfg = STATUS_CFG[contact.status];
  const cleanPhone = (contact.phone || '').replace(/[^\d+]/g, '');

  return (
    <AdminDrawer
      open={!!contact}
      onOpenChange={(o) => !o && onClose()}
      title={contact.name}
      subtitle={contact.business_name || contact.industry}
      badge={<SoftBadge tone={cfg.tone}>{isAr ? cfg.ar : cfg.en}</SoftBadge>}
      footer={
        <>
          <SoftButton
            variant="danger"
            size="sm"
            onClick={() => {
              if (window.confirm(t('متأكد من الحذف؟', 'Confirm delete?'))) void onDelete(contact.id);
            }}
            disabled={!canDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t('حذف', 'Delete')}
          </SoftButton>
          <SoftButton
            variant="primary"
            size="sm"
            onClick={() => void onUpdateStatus(contact.id, 'resolved')}
            disabled={!canEdit}
          >
            {t('إغلاق المحادثة', 'Mark resolved')}
          </SoftButton>
        </>
      }
    >
      <div className="space-y-5">
        <SoftCard className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Info label={t('الاسم', 'Name')} value={contact.name} />
          <Info label={t('الشركة', 'Business')} value={contact.business_name} />
          <Info label={t('الصناعة', 'Industry')} value={contact.industry} />
          <Info label={t('الخدمة', 'Service needed')} value={contact.service_needed} />
          <Info
            label={t('الهاتف', 'Phone')}
            value={
              contact.phone ? (
                <a href={`tel:${contact.phone}`} className="text-emerald-700 hover:underline">
                  {contact.phone}
                </a>
              ) : null
            }
          />
          <Info
            label={t('البريد', 'Email')}
            value={
              contact.email ? (
                <a href={`mailto:${contact.email}`} className="text-emerald-700 hover:underline">
                  {contact.email}
                </a>
              ) : null
            }
          />
        </SoftCard>

        <SoftCard className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
            {t('الرسالة', 'Message')}
          </p>
          <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
            {contact.message}
          </p>
        </SoftCard>

        <SoftCard className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-3">
            {t('الإجراءات', 'Actions')}
          </p>
          <div className="flex flex-wrap gap-2">
            {cleanPhone ? (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 text-xs font-semibold"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            ) : null}
            {contact.phone ? (
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100 text-xs font-semibold"
              >
                <Phone className="w-3.5 h-3.5" />
                {t('اتصل', 'Call')}
              </a>
            ) : null}
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-100 text-xs font-semibold"
              >
                <Mail className="w-3.5 h-3.5" />
                {t('بريد', 'Email')}
              </a>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-emerald-900/5 dark:border-white/5">
            {(['new', 'read', 'contacted', 'resolved'] as Contact['status'][]).map((s) => (
              <button
                key={s}
                type="button"
                disabled={!canEdit}
                onClick={() => void onUpdateStatus(contact.id, s)}
                className={`px-3 h-8 rounded-full text-[11px] font-semibold ${
                  contact.status === s
                    ? 'bg-slate-900 text-white'
                    : 'bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isAr ? STATUS_CFG[s].ar : STATUS_CFG[s].en}
              </button>
            ))}
          </div>
        </SoftCard>
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
