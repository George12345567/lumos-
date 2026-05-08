import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Copy,
  Download,
  FileIcon,
  Image as ImageIcon,
  Loader2,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Client } from '@/types/dashboard';
import {
  deleteIdentityAsset,
  fetchClientIdentitySnapshot,
  getIdentityAssetSignedUrl,
  identityAssetTimestamp,
  identityCategoryLabel,
  IDENTITY_ASSET_CATEGORIES,
  isIdentityImage,
  uploadIdentityAsset,
  upsertClientIdentity,
  type ClientIdentity,
  type ClientIdentityAsset,
  type IdentityAssetCategory,
  type IdentityAssetVisibility,
  type IdentityColor,
} from '@/services/clientIdentityService';
import { SoftButton, SoftCard, SoftBadge } from './primitives';

interface IdentityFormState {
  brand_name: string;
  tagline: string;
  industry: string;
  brand_description: string;
  brand_feel: string;
  brand_voice: string;
  target_audience: string;
  usage_notes: string;
  public_notes: string;
  internal_notes: string;
  colors: IdentityColor[];
  typography: {
    primary: string;
    secondary: string;
    heading: string;
    body: string;
    usage_notes: string;
  };
  social_links: Record<string, string>;
}

const SOCIAL_FIELDS = ['instagram', 'linkedin', 'behance', 'dribbble', 'twitter', 'github', 'website'] as const;
const COLOR_USAGE = ['Primary', 'Secondary', 'Accent', 'Background', 'Text', 'Neutral'];

function clean(value?: string | null) {
  return (value ?? '').trim();
}

function defaultColors(client: Client): IdentityColor[] {
  return (client.brand_colors ?? []).map((hex, index) => ({
    label: COLOR_USAGE[index] ?? `Color ${index + 1}`,
    usage: COLOR_USAGE[index] ?? 'Brand',
    hex,
  }));
}

function formFrom(identity: ClientIdentity | null, client: Client): IdentityFormState {
  const typography = identity?.typography ?? {};
  const socialLinks = identity?.social_links ?? {};
  return {
    brand_name: clean(identity?.brand_name) || clean(client.company_name),
    tagline: clean(identity?.tagline) || clean(client.business_tagline),
    industry: clean(identity?.industry) || clean(client.industry),
    brand_description: clean(identity?.brand_description) || clean(client.project_summary),
    brand_feel: clean(identity?.brand_feel) || clean(client.brand_feel),
    brand_voice: clean(identity?.brand_voice),
    target_audience: clean(identity?.target_audience),
    usage_notes: clean(identity?.usage_notes),
    public_notes: clean(identity?.public_notes),
    internal_notes: clean(identity?.internal_notes),
    colors: identity?.color_palette?.length ? identity.color_palette : defaultColors(client),
    typography: {
      primary: typeof typography.primary === 'string' ? typography.primary : '',
      secondary: typeof typography.secondary === 'string' ? typography.secondary : '',
      heading: typeof typography.heading === 'string' ? typography.heading : '',
      body: typeof typography.body === 'string' ? typography.body : '',
      usage_notes: typeof typography.usage_notes === 'string' ? typography.usage_notes : '',
    },
    social_links: {
      instagram: clean(socialLinks.instagram as string),
      linkedin: clean(socialLinks.linkedin as string),
      behance: clean(socialLinks.behance as string),
      dribbble: clean(socialLinks.dribbble as string),
      twitter: clean(socialLinks.twitter as string),
      github: clean(socialLinks.github as string),
      website: clean((socialLinks.website as string) || client.website),
    },
  };
}

function safeColor(color: IdentityColor): IdentityColor | null {
  const hex = clean(color.hex);
  if (!hex) return null;
  return {
    label: clean(color.label) || clean(color.usage) || 'Brand color',
    usage: clean(color.usage) || 'Brand',
    hex,
  };
}

export function ClientIdentityPanel({
  client,
  canEdit,
  isAr,
  onChanged,
}: {
  client: Client;
  canEdit: boolean;
  isAr: boolean;
  onChanged?: () => void | Promise<void>;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [identity, setIdentity] = useState<ClientIdentity | null>(null);
  const [assets, setAssets] = useState<ClientIdentityAsset[]>([]);
  const [form, setForm] = useState<IdentityFormState>(() => formFrom(null, client));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<IdentityAssetCategory>('logo_primary');
  const [uploadVisibility, setUploadVisibility] = useState<IdentityAssetVisibility>('client');
  const [uploadNote, setUploadNote] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await fetchClientIdentitySnapshot(client.id, { includeAdminOnly: true });
      setIdentity(snapshot.identity);
      setAssets(snapshot.assets);
      setForm(formFrom(snapshot.identity, client));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateForm = <K extends keyof IdentityFormState>(field: K, value: IdentityFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (!canEdit || saving) return;
    setSaving(true);
    try {
      const socialLinks = Object.fromEntries(
        Object.entries(form.social_links).filter(([, value]) => Boolean(clean(value))),
      );
      const colorPalette = form.colors
        .map(safeColor)
        .filter((color): color is IdentityColor => Boolean(color));

      const result = await upsertClientIdentity(client.id, {
        brand_name: clean(form.brand_name),
        tagline: clean(form.tagline),
        industry: clean(form.industry),
        brand_description: clean(form.brand_description),
        brand_feel: clean(form.brand_feel),
        brand_voice: clean(form.brand_voice),
        target_audience: clean(form.target_audience),
        usage_notes: clean(form.usage_notes),
        public_notes: clean(form.public_notes),
        internal_notes: clean(form.internal_notes),
        color_palette: colorPalette,
        typography: {
          primary: clean(form.typography.primary),
          secondary: clean(form.typography.secondary),
          heading: clean(form.typography.heading),
          body: clean(form.typography.body),
          usage_notes: clean(form.typography.usage_notes),
        },
        social_links: socialLinks,
      });

      if (!result.success) {
        toast.error(result.error || t('تعذر حفظ الهوية', 'Could not save identity'));
        return;
      }

      setIdentity(result.identity ?? null);
      toast.success(t('تم حفظ الهوية', 'Identity saved'));
      await onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const upload = async () => {
    if (!canEdit || !uploadFile || uploading) return;
    setUploading(true);
    try {
      const result = await uploadIdentityAsset({
        clientId: client.id,
        file: uploadFile,
        category: uploadCategory,
        visibility: uploadVisibility,
        note: uploadNote || undefined,
      });

      if (!result.success || !result.asset) {
        toast.error(result.error || t('تعذر رفع الملف', 'Upload failed'));
        return;
      }

      toast.success(t('تم رفع أصل الهوية', 'Identity asset uploaded'));
      setAssets((current) => [result.asset!, ...current]);
      setUploadFile(null);
      setUploadNote('');
      await onChanged?.();
    } finally {
      setUploading(false);
    }
  };

  const removeAsset = async (asset: ClientIdentityAsset) => {
    if (!canEdit) return;
    if (!window.confirm(t('حذف أصل الهوية؟', 'Delete this identity asset?'))) return;
    const result = await deleteIdentityAsset(asset);
    if (!result.success) {
      toast.error(result.error || t('تعذر حذف الملف', 'Could not delete asset'));
      return;
    }
    setAssets((current) => current.filter((item) => item.id !== asset.id));
    toast.success(t('تم حذف الملف', 'Asset deleted'));
    await onChanged?.();
  };

  const visibleCount = useMemo(() => assets.filter((asset) => asset.visibility !== 'admin_only').length, [assets]);

  return (
    <div className="space-y-4">
      <SoftCard className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
            {t('هوية العميل', 'Client Identity')}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('أنشئ وحدث أصول الهوية الرسمية لهذا العميل.', 'Create and update this client’s official brand identity assets.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SoftButton variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('تحديث', 'Refresh')}
          </SoftButton>
          <SoftButton variant="primary" size="sm" onClick={() => void save()} disabled={!canEdit || saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {t('حفظ الهوية', 'Save identity')}
          </SoftButton>
        </div>
      </SoftCard>

      <SoftCard className="p-5 space-y-5">
        <Group title={t('ملخص العلامة', 'Brand Summary')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t('اسم العلامة', 'Brand name')} value={form.brand_name} disabled={!canEdit} onChange={(value) => updateForm('brand_name', value)} />
            <TextField label={t('الشعار', 'Tagline')} value={form.tagline} disabled={!canEdit} onChange={(value) => updateForm('tagline', value)} />
            <TextField label={t('الصناعة', 'Industry')} value={form.industry} disabled={!canEdit} onChange={(value) => updateForm('industry', value)} />
            <TextField label={t('الجمهور المستهدف', 'Target audience')} value={form.target_audience} disabled={!canEdit} onChange={(value) => updateForm('target_audience', value)} />
            <TextArea label={t('وصف العلامة', 'Brand description')} value={form.brand_description} disabled={!canEdit} onChange={(value) => updateForm('brand_description', value)} />
            <TextArea label={t('إحساس العلامة', 'Brand feel / mood')} value={form.brand_feel} disabled={!canEdit} onChange={(value) => updateForm('brand_feel', value)} />
            <TextArea label={t('صوت العلامة', 'Brand voice')} value={form.brand_voice} disabled={!canEdit} onChange={(value) => updateForm('brand_voice', value)} />
            <TextArea label={t('ملاحظات الاستخدام', 'Usage notes')} value={form.usage_notes} disabled={!canEdit} onChange={(value) => updateForm('usage_notes', value)} />
            <TextArea label={t('ملاحظات عامة للعميل', 'Public client notes')} value={form.public_notes} disabled={!canEdit} onChange={(value) => updateForm('public_notes', value)} />
            <TextArea label={t('ملاحظات داخلية', 'Internal notes')} value={form.internal_notes} disabled={!canEdit} onChange={(value) => updateForm('internal_notes', value)} />
          </div>
        </Group>

        <Group
          title={t('لوحة الألوان', 'Color Palette')}
          action={
            <SoftButton
              variant="soft"
              size="sm"
              disabled={!canEdit}
              onClick={() => updateForm('colors', [...form.colors, { label: 'Brand color', usage: 'Brand', hex: '#10B981' }])}
            >
              <Plus className="w-3.5 h-3.5" />
              {t('إضافة لون', 'Add color')}
            </SoftButton>
          }
        >
          <div className="space-y-2">
            {form.colors.length === 0 ? (
              <p className="text-sm text-slate-500">{t('لا توجد ألوان بعد.', 'No colors yet.')}</p>
            ) : (
              form.colors.map((color, index) => (
                <div key={index} className="grid gap-2 rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-white/10 sm:grid-cols-[70px_1fr_1fr_1fr_auto]">
                  <input
                    type="color"
                    value={clean(color.hex) || '#10B981'}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const next = [...form.colors];
                      next[index] = { ...next[index], hex: event.target.value };
                      updateForm('colors', next);
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white p-1"
                  />
                  <input
                    value={color.hex}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const next = [...form.colors];
                      next[index] = { ...next[index], hex: event.target.value };
                      updateForm('colors', next);
                    }}
                    className={inputCls}
                    placeholder="#10B981"
                  />
                  <input
                    value={color.label || ''}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const next = [...form.colors];
                      next[index] = { ...next[index], label: event.target.value };
                      updateForm('colors', next);
                    }}
                    className={inputCls}
                    placeholder="Primary"
                  />
                  <select
                    value={color.usage || 'Brand'}
                    disabled={!canEdit}
                    onChange={(event) => {
                      const next = [...form.colors];
                      next[index] = { ...next[index], usage: event.target.value };
                      updateForm('colors', next);
                    }}
                    className={inputCls}
                  >
                    {COLOR_USAGE.map((usage) => <option key={usage} value={usage}>{usage}</option>)}
                  </select>
                  <SoftButton
                    variant="danger"
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => updateForm('colors', form.colors.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </SoftButton>
                </div>
              ))
            )}
          </div>
        </Group>

        <Group title={t('الخطوط', 'Typography')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={t('الخط الأساسي', 'Primary font')} value={form.typography.primary} disabled={!canEdit} onChange={(value) => updateForm('typography', { ...form.typography, primary: value })} />
            <TextField label={t('الخط الثانوي', 'Secondary font')} value={form.typography.secondary} disabled={!canEdit} onChange={(value) => updateForm('typography', { ...form.typography, secondary: value })} />
            <TextField label={t('خط العناوين', 'Heading font')} value={form.typography.heading} disabled={!canEdit} onChange={(value) => updateForm('typography', { ...form.typography, heading: value })} />
            <TextField label={t('خط النص', 'Body font')} value={form.typography.body} disabled={!canEdit} onChange={(value) => updateForm('typography', { ...form.typography, body: value })} />
            <TextArea label={t('ملاحظات الاستخدام', 'Usage notes')} value={form.typography.usage_notes} disabled={!canEdit} onChange={(value) => updateForm('typography', { ...form.typography, usage_notes: value })} />
          </div>
        </Group>

        <Group title={t('روابط الهوية الاجتماعية', 'Social Identity')}>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIAL_FIELDS.map((field) => (
              <TextField
                key={field}
                label={field === 'twitter' ? 'X / Twitter' : field.charAt(0).toUpperCase() + field.slice(1)}
                value={form.social_links[field] || ''}
                disabled={!canEdit}
                onChange={(value) => updateForm('social_links', { ...form.social_links, [field]: value })}
                placeholder="https://"
              />
            ))}
          </div>
        </Group>
      </SoftCard>

      <SoftCard className="p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              {t('أصول الهوية', 'Identity Assets')}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t(`${visibleCount} ملف مرئي للعميل`, `${visibleCount} client-visible files`)}
            </p>
          </div>
          <SoftBadge tone="slate">{assets.length} total</SoftBadge>
        </div>

        <div className="grid gap-3 rounded-2xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-white/10 sm:grid-cols-2">
          <select value={uploadCategory} disabled={!canEdit} onChange={(event) => setUploadCategory(event.target.value as IdentityAssetCategory)} className={inputCls}>
            {IDENTITY_ASSET_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>{isAr ? category.labelAr : category.label}</option>
            ))}
          </select>
          <select value={uploadVisibility} disabled={!canEdit} onChange={(event) => setUploadVisibility(event.target.value as IdentityAssetVisibility)} className={inputCls}>
            <option value="client">{t('مرئي للعميل', 'Client visible')}</option>
            <option value="admin_only">{t('إدارة فقط', 'Admin only')}</option>
          </select>
          <input
            type="file"
            disabled={!canEdit || uploading}
            onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-950"
            accept="image/*,.svg,.pdf,.zip,.ai,.psd,.fig,.sketch"
          />
          <input
            value={uploadNote}
            disabled={!canEdit}
            onChange={(event) => setUploadNote(event.target.value)}
            className={inputCls}
            placeholder={t('ملاحظة للملف...', 'Asset note...')}
          />
          <div className="sm:col-span-2">
            <SoftButton variant="primary" size="sm" onClick={() => void upload()} disabled={!canEdit || !uploadFile || uploading}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {t('رفع أصل هوية', 'Upload identity asset')}
            </SoftButton>
          </div>
        </div>

        {assets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-white/10">
            <Palette className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-3 text-sm font-semibold text-foreground">{t('لا توجد أصول هوية بعد', 'No identity assets yet')}</p>
            <p className="mt-1 text-xs text-slate-500">{t('ارفع أول شعار أو دليل هوية لهذا العميل.', 'Upload the first logo or brand guide for this client.')}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {assets.map((asset) => (
              <AdminIdentityAssetCard
                key={asset.id}
                asset={asset}
                isAr={isAr}
                canDelete={canEdit}
                onDelete={() => void removeAsset(asset)}
              />
            ))}
          </div>
        )}
      </SoftCard>
    </div>
  );
}

function AdminIdentityAssetCard({
  asset,
  isAr,
  canDelete,
  onDelete,
}: {
  asset: ClientIdentityAsset;
  isAr: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);

    if (!isIdentityImage(asset)) return () => {
      cancelled = true;
    };

    void getIdentityAssetSignedUrl(asset, 60 * 10).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [asset]);

  const openSigned = async () => {
    const url = await getIdentityAssetSignedUrl(asset);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copySigned = async () => {
    const url = await getIdentityAssetSignedUrl(asset);
    if (!url) {
      toast.error(t('تعذر إنشاء الرابط', 'Could not create signed link'));
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success(t('تم نسخ الرابط', 'Signed link copied'));
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-white/10 p-3">
      <div className="flex gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-50 text-emerald-700">
          {previewUrl ? (
            <img src={previewUrl} alt={asset.file_name} className="h-full w-full object-contain p-2" />
          ) : isIdentityImage(asset) ? (
            <ImageIcon className="h-5 w-5" />
          ) : (
            <FileIcon className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{asset.file_name}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {identityCategoryLabel(asset.identity_category, isAr)}
            {identityAssetTimestamp(asset) ? ` · ${new Date(identityAssetTimestamp(asset)!).toLocaleDateString(isAr ? 'ar' : 'en')}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <SoftBadge tone={asset.visibility === 'admin_only' ? 'amber' : 'emerald'}>
              {asset.visibility === 'admin_only' ? t('إدارة فقط', 'Admin only') : t('مرئي للعميل', 'Client visible')}
            </SoftBadge>
            <SoftBadge tone="slate">{asset.uploaded_by_type || 'admin'}</SoftBadge>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <SoftButton variant="soft" size="sm" onClick={() => void openSigned()}>
          <Download className="w-3.5 h-3.5" />
          {t('فتح', 'Open')}
        </SoftButton>
        <SoftButton variant="outline" size="sm" onClick={() => void copySigned()}>
          <Copy className="w-3.5 h-3.5" />
          {t('نسخ الرابط', 'Copy link')}
        </SoftButton>
        {canDelete ? (
          <SoftButton variant="danger" size="sm" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </SoftButton>
        ) : null}
      </div>
    </div>
  );
}

function Group({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={inputCls}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputCls} h-auto py-2`}
      />
    </label>
  );
}

const inputCls =
  'h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-900';
