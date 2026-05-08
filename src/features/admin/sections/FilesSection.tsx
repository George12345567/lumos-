import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileIcon,
  FolderOpen,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { Client } from '@/types/dashboard';
import {
  EmptyState,
  SectionHeader,
  SoftBadge,
  SoftButton,
  SoftCard,
} from '../components/primitives';
import { AdminDrawer } from '../components/AdminDrawer';
import { useAdminPermission } from '../hooks/useAdminPermission';
import { fileTimestamp, isImageFile, useClientFiles } from '../data/useClientFiles';

const CATEGORIES = ['general', 'brand', 'designs', 'contracts', 'invoices', 'messages'];

interface FilesSectionProps {
  clients: Client[];
  preselectedClientId?: string | null;
}

export function FilesSection({ clients, preselectedClientId }: FilesSectionProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { files, loading, error, refresh, upload, remove, getSignedUrl } = useClientFiles();
  const canUpload = useAdminPermission('files', 'create');
  const canDelete = useAdminPermission('files', 'delete');

  const [clientFilter, setClientFilter] = useState<string>(preselectedClientId || 'all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients) m.set(c.id, c);
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return files.filter((f) => {
      if (f.is_identity_asset) return false;
      if (clientFilter !== 'all' && f.client_id !== clientFilter) return false;
      if (categoryFilter !== 'all' && (f.category || 'general') !== categoryFilter) return false;
      if (!term) return true;
      const haystack = [f.file_name, f.file_type ?? '', f.note].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [files, clientFilter, categoryFilter, search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('الملفات', 'Files')}
        subtitle={t(
          'الأصول المُشاركة مع العملاء. ارفع ملفات وأرسلها أينما احتجت.',
          'Assets shared with clients. Upload files and send them whenever needed.',
        )}
        actions={
          <div className="flex flex-wrap gap-2">
            <SoftButton variant="outline" size="md" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('تحديث', 'Refresh')}
            </SoftButton>
            <SoftButton variant="primary" size="md" onClick={() => setShowUpload(true)} disabled={!canUpload}>
              <Upload className="w-4 h-4" />
              {t('رفع ملف', 'Upload file')}
            </SoftButton>
          </div>
        }
      />

      {error ? (
        <SoftCard className="p-4 ring-1 ring-rose-100 bg-rose-50/40 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rose-900">
              {t('تعذر تحميل الملفات', 'Could not load files')}
            </p>
            <p className="text-xs text-rose-800 mt-1 break-words">{error}</p>
          </div>
          <SoftButton variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="w-3.5 h-3.5" />
            {t('إعادة المحاولة', 'Retry')}
          </SoftButton>
        </SoftCard>
      ) : null}

      <SoftCard className="p-3 flex flex-wrap items-center gap-2">
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="rounded-full text-xs px-3 h-9 bg-white ring-1 ring-slate-200 focus:outline-none focus:ring-emerald-200"
        >
          <option value="all">{t('كل العملاء', 'All clients')}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.company_name || c.username || c.email}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-full text-xs px-3 h-9 bg-white ring-1 ring-slate-200 focus:outline-none focus:ring-emerald-200"
        >
          <option value="all">{t('كل الفئات', 'All categories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex-1 flex justify-end">
          <div className="relative w-full sm:w-72">
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
        <SoftCard className="p-10 text-center text-sm text-slate-500">{t('جارٍ التحميل…', 'Loading…')}</SoftCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t('لا توجد ملفات', 'No files yet')}
          description={t(
            'ابدأ بمشاركة أول ملف مع عميل.',
            'Start by sharing the first file with a client.',
          )}
          action={canUpload ? (
            <SoftButton variant="primary" size="md" onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4" /> {t('رفع ملف', 'Upload file')}
            </SoftButton>
          ) : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((f) => {
            const client = clientById.get(f.client_id);
            const ts = fileTimestamp(f);
            return (
              <SoftCard key={f.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    {isImageFile(f) ? <ImageIcon className="w-4 h-4" /> : <FileIcon className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{f.file_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {client?.company_name || client?.username || f.client_id.slice(0, 8)}
                    </p>
                  </div>
                  <SoftBadge tone="slate">{f.category || 'general'}</SoftBadge>
                </div>
                {f.note ? <p className="text-xs text-muted-foreground">{f.note}</p> : null}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{f.file_size ? `${Math.round(f.file_size / 1024)} KB` : ''}</span>
                  <span>{ts ? new Date(ts).toLocaleDateString(isAr ? 'ar' : 'en') : ''}</span>
                </div>
                <div className="flex items-center gap-1 pt-2 border-t border-emerald-900/5">
                  <button
                    type="button"
                    onClick={async () => {
                      if (f.storage_path) {
                        const url = await getSignedUrl(f.storage_path);
                        if (url) window.open(url, '_blank');
                      } else if (f.file_url) {
                        window.open(f.file_url, '_blank');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 text-[11px] font-semibold"
                  >
                    <Download className="w-3 h-3" /> {t('فتح', 'Open')}
                  </button>
                  {canDelete ? (
                    <SoftButton
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(t('حذف الملف؟', 'Delete file?'))) void remove(f);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </SoftButton>
                  ) : null}
                </div>
              </SoftCard>
            );
          })}
        </div>
      )}

      <UploadDrawer
        open={showUpload}
        onClose={() => setShowUpload(false)}
        clients={clients}
        preselectedClientId={preselectedClientId || null}
        onUpload={async (input) => {
          const r = await upload(input);
          if (r.success) setShowUpload(false);
        }}
      />
    </div>
  );
}

function UploadDrawer({
  open, onClose, clients, preselectedClientId, onUpload,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  preselectedClientId: string | null;
  onUpload: (input: { clientId: string; file: File; category: string; note?: string }) => Promise<void>;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [clientId, setClientId] = useState(preselectedClientId || '');
  const [category, setCategory] = useState('general');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <AdminDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('رفع ملف لعميل', 'Upload file for client')}
      footer={
        <>
          <SoftButton variant="ghost" size="sm" onClick={onClose}>{t('إلغاء', 'Cancel')}</SoftButton>
          <SoftButton
            variant="primary"
            size="sm"
            disabled={busy || !file || !clientId}
            onClick={async () => {
              if (!file || !clientId) return;
              setBusy(true);
              await onUpload({ clientId, file, category, note: note || undefined });
              setBusy(false);
              setFile(null);
              setNote('');
            }}
          >
            <Upload className="w-3.5 h-3.5" />
            {busy ? t('جارٍ الرفع…', 'Uploading…') : t('رفع', 'Upload')}
          </SoftButton>
        </>
      }
    >
      <SoftCard className="p-5 space-y-3">
        <FormRow label={t('العميل', 'Client')}>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputCls}
          >
            <option value="">{t('اختر عميلاً', 'Select a client')}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name || c.username || c.email}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label={t('الفئة', 'Category')}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label={t('الملف', 'File')}>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full rounded-2xl border border-slate-200 px-3 h-10 text-sm bg-white"
          />
        </FormRow>
        <FormRow label={t('ملاحظة (اختياري)', 'Note (optional)')}>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputCls}
            placeholder={t('وصف قصير…', 'Short description…')}
          />
        </FormRow>
        <p className="text-[11px] text-slate-500 pt-2 border-t border-emerald-900/5">
          {t(
            'تُرفع الملفات إلى bucket خاص client-assets ضمن مجلد العميل.',
            'Files are uploaded to the private client-assets bucket inside the client folder.',
          )}
        </p>
      </SoftCard>
    </AdminDrawer>
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

const inputCls =
  'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200';
