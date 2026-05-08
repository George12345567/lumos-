import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Info,
  Moon,
  Save,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAppearance } from '@/context/AppearanceContext';
import { useSessionEmail } from '@/context/AuthContext';
import { useAdminRole } from '../hooks/useAdminPermission';
import { ROLE_LABELS } from '../permissions';
import { SectionHeader, SoftBadge, SoftButton, SoftCard } from '../components/primitives';
import { useWorkspaceSettings, type WorkspaceSettings } from '../data/useWorkspaceSettings';

interface SettingsSectionProps {
  smartIndicators: {
    requestsNeedingFollowUp: number;
    clientsMissingOnboarding: number;
  };
}

export function SettingsSection({ smartIndicators }: SettingsSectionProps) {
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useAppearance();
  const email = useSessionEmail();
  const role = useAdminRole();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const { settings, loading, missingTable, save } = useWorkspaceSettings();
  const [tab, setTab] = useState<'workspace' | 'notifications' | 'workflow' | 'portal' | 'files' | 'security' | 'smart'>('workspace');
  const [draft, setDraft] = useState<WorkspaceSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const dirty = useMemo(
    () => !!settings && !!draft && JSON.stringify(settings) !== JSON.stringify(draft),
    [settings, draft],
  );

  const tabs: Array<{ id: typeof tab; en: string; ar: string }> = [
    { id: 'workspace', en: 'Workspace', ar: 'المساحة' },
    { id: 'notifications', en: 'Notifications', ar: 'الإشعارات' },
    { id: 'workflow', en: 'Workflow', ar: 'سير العمل' },
    { id: 'portal', en: 'Client portal', ar: 'بوابة العميل' },
    { id: 'files', en: 'Files', ar: 'الملفات' },
    { id: 'security', en: 'Security', ar: 'الأمان' },
    { id: 'smart', en: 'Smart controls', ar: 'تحكم ذكي' },
  ];

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    await save(draft);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('الإعدادات', 'Settings')}
        subtitle={t(
          'تفضيلات العمل، الإشعارات، سير العمل، والأمان.',
          'Workspace preferences, notifications, workflow, and security.',
        )}
        actions={
          dirty ? (
            <SoftButton variant="primary" size="md" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? t('جارٍ الحفظ…', 'Saving…') : t('حفظ التغييرات', 'Save changes')}
            </SoftButton>
          ) : null
        }
      />

      {missingTable ? (
        <SoftCard className="p-4 ring-1 ring-amber-100 bg-amber-50/40 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {t('جدول workspace_settings مفقود.', 'workspace_settings table is missing.')}
            </p>
            <p className="text-xs text-amber-800 mt-1">
              {t(
                'طبّق المهاجرة supabase/migrations/20260507140400_workspace_settings.sql لتفعيل الحفظ.',
                'Apply supabase/migrations/20260507140400_workspace_settings.sql to enable persistence.',
              )}
            </p>
          </div>
        </SoftCard>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={`px-3 h-9 rounded-full text-xs font-semibold ${
              tab === x.id ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300'
            }`}
          >
            {isAr ? x.ar : x.en}
          </button>
        ))}
      </div>

      {loading || !draft ? (
        <SoftCard className="p-10 text-center text-sm text-slate-500">{t('جارٍ التحميل…', 'Loading…')}</SoftCard>
      ) : (
        <>
          {tab === 'workspace' && (
            <SoftCard className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('اسم الوكالة', 'Agency name')}>
                <input type="text" value={draft.agency_name} onChange={(e) => setDraft({ ...draft, agency_name: e.target.value })} className={inputCls} />
              </Field>
              <Field label={t('العملة الافتراضية', 'Default currency')}>
                <input type="text" value={draft.default_currency} onChange={(e) => setDraft({ ...draft, default_currency: e.target.value.toUpperCase() })} className={inputCls} />
              </Field>
              <Field label={t('المنطقة الزمنية', 'Timezone')}>
                <input type="text" value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} className={inputCls} />
              </Field>
              <Field label={t('اللغة الافتراضية', 'Default language')}>
                <select value={draft.default_language} onChange={(e) => setDraft({ ...draft, default_language: e.target.value as 'ar' | 'en' })} className={inputCls}>
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </Field>
              <Field label={t('صيغة التاريخ', 'Date format')}>
                <input type="text" value={draft.date_format} onChange={(e) => setDraft({ ...draft, date_format: e.target.value })} className={inputCls} placeholder="YYYY-MM-DD" />
              </Field>
              <Field label={t('العرض الافتراضي', 'Default dashboard view')}>
                <select value={draft.default_dashboard_view} onChange={(e) => setDraft({ ...draft, default_dashboard_view: e.target.value })} className={inputCls}>
                  <option value="overview">Overview</option>
                  <option value="requests">Requests</option>
                  <option value="messages">Messages</option>
                  <option value="statistics">Statistics</option>
                </select>
              </Field>
              <div className="sm:col-span-2 pt-3 border-t border-emerald-900/5 flex flex-wrap gap-3">
                <button type="button" onClick={toggleTheme} className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-sm font-semibold">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === 'dark' ? t('الوضع الفاتح', 'Light mode') : t('الوضع الداكن', 'Dark mode')}
                </button>
                <button type="button" onClick={toggleLanguage} className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-sm font-semibold">
                  <Globe2 className="w-4 h-4" />
                  {isAr ? 'English' : 'العربية'}
                </button>
              </div>
            </SoftCard>
          )}

          {tab === 'notifications' && (
            <SoftCard className="p-6 space-y-3">
              <Toggle
                label={t('بريد عند طلبات جديدة', 'Email on new requests')}
                checked={draft.notify_email_on_request}
                onChange={(v) => setDraft({ ...draft, notify_email_on_request: v })}
              />
              <Toggle
                label={t('بريد عند رسائل جديدة', 'Email on new messages')}
                checked={draft.notify_email_on_message}
                onChange={(v) => setDraft({ ...draft, notify_email_on_message: v })}
              />
              <Toggle
                label={t('بريد عند رفع ملفات', 'Email on file uploads')}
                checked={draft.notify_email_on_file}
                onChange={(v) => setDraft({ ...draft, notify_email_on_file: v })}
              />
              <Toggle
                label={t('بريد لنشاط الإدارة', 'Email on admin activity')}
                checked={draft.notify_email_on_admin_activity}
                onChange={(v) => setDraft({ ...draft, notify_email_on_admin_activity: v })}
              />
              <p className="text-[11px] text-slate-500 pt-2 border-t border-emerald-900/5">
                {t(
                  'ملاحظة: الإرسال الفعلي للبريد يتطلب وظيفة Edge مكونة في Supabase.',
                  'Note: actual email delivery requires a configured Supabase Edge Function.',
                )}
              </p>
            </SoftCard>
          )}

          {tab === 'workflow' && (
            <SoftCard className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('الحالة الافتراضية للطلب', 'Default request status')}>
                <select value={draft.default_request_status} onChange={(e) => setDraft({ ...draft, default_request_status: e.target.value })} className={inputCls}>
                  {['new', 'reviewing', 'approved'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label={t('الأولوية الافتراضية', 'Default priority')}>
                <select value={draft.default_priority} onChange={(e) => setDraft({ ...draft, default_priority: e.target.value })} className={inputCls}>
                  {['low', 'medium', 'high', 'urgent'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label={t('أيام المتابعة', 'Follow-up days')}>
                <input type="number" min={0} value={draft.follow_up_days} onChange={(e) => setDraft({ ...draft, follow_up_days: Number(e.target.value) })} className={inputCls} />
              </Field>
            </SoftCard>
          )}

          {tab === 'portal' && (
            <SoftCard className="p-6 space-y-3">
              <Toggle
                label={t('السماح للعملاء برفع ملفات', 'Allow client uploads')}
                checked={draft.allow_client_uploads}
                onChange={(v) => setDraft({ ...draft, allow_client_uploads: v })}
              />
              <Toggle
                label={t('السماح للعملاء بإرسال رسائل', 'Allow client messages')}
                checked={draft.allow_client_messages}
                onChange={(v) => setDraft({ ...draft, allow_client_messages: v })}
              />
              <Toggle
                label={t('طلب إكمال الملف الشخصي', 'Require profile completion')}
                checked={draft.require_profile_completion}
                onChange={(v) => setDraft({ ...draft, require_profile_completion: v })}
              />
              <Field label={t('رؤية الملف الافتراضية', 'Default profile visibility')}>
                <select value={draft.default_profile_visibility} onChange={(e) => setDraft({ ...draft, default_profile_visibility: e.target.value })} className={inputCls}>
                  <option value="private">Private</option>
                  <option value="team">Team</option>
                  <option value="public">Public</option>
                </select>
              </Field>
            </SoftCard>
          )}

          {tab === 'files' && (
            <SoftCard className="p-6 space-y-3">
              <Field label={t('أنواع الملفات المسموح بها', 'Allowed file types')}>
                <input type="text" value={draft.allowed_file_types} onChange={(e) => setDraft({ ...draft, allowed_file_types: e.target.value })} className={inputCls} />
              </Field>
              <Field label={t('الحجم الأقصى للرفع (MB)', 'Max upload size (MB)')}>
                <input type="number" value={draft.max_upload_mb} onChange={(e) => setDraft({ ...draft, max_upload_mb: Number(e.target.value) })} className={inputCls} />
              </Field>
              <Field label={t('فئات الملفات الافتراضية (مفصولة بفواصل)', 'Default file categories (comma-separated)')}>
                <input
                  type="text"
                  value={(draft.default_file_categories || []).join(', ')}
                  onChange={(e) => setDraft({
                    ...draft,
                    default_file_categories: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })}
                  className={inputCls}
                />
              </Field>
            </SoftCard>
          )}

          {tab === 'security' && (
            <SoftCard className="p-6 space-y-3">
              <Row label={t('بريدك', 'Your email')} value={email || '—'} />
              <Row
                label={t('دورك', 'Your role')}
                value={<SoftBadge tone="emerald" icon={ShieldCheck}>{isAr ? ROLE_LABELS[role].ar : ROLE_LABELS[role].en}</SoftBadge>}
              />
              <ChecklistItem
                ok
                label={t('AdminRoute مفعّل', 'AdminRoute is active')}
                hint={t('الوصول إلى /lumos-admin محمي.', '/lumos-admin is gated.')}
              />
              <ChecklistItem
                ok
                label={t('لا يوجد مفتاح service-role في الواجهة', 'No service-role key in frontend')}
                hint={t('فحص dist يعطي صفر تطابقات.', 'dist scan returns zero matches.')}
              />
              <ChecklistItem
                ok={false}
                label={t('فحص يدوي', 'Manual check required')}
                hint={t(
                  'تحقّق من سياسات RLS لكل جدول حساس باستخدام SUPABASE_FINAL_MANUAL_CHECKS.md.',
                  'Verify RLS policies on every sensitive table via SUPABASE_FINAL_MANUAL_CHECKS.md.',
                )}
              />
              <p className="text-[11px] text-slate-500 pt-2 border-t border-emerald-900/5">
                {t(
                  'الأمان الحقيقي يفرضه Supabase RLS، وليس هذه الواجهة.',
                  'Real security is enforced by Supabase RLS, not by this UI.',
                )}
              </p>
            </SoftCard>
          )}

          {tab === 'smart' && (
            <SoftCard className="p-6 space-y-3">
              <p className="text-sm font-semibold mb-2">{t('توصيات حية', 'Live recommendations')}</p>
              <SmartItem
                level={smartIndicators.requestsNeedingFollowUp > 0 ? 'warn' : 'ok'}
                label={
                  smartIndicators.requestsNeedingFollowUp > 0
                    ? t(`${smartIndicators.requestsNeedingFollowUp} طلب يحتاج متابعة`, `${smartIndicators.requestsNeedingFollowUp} requests need follow-up`)
                    : t('لا توجد طلبات معلقة', 'No requests waiting')
                }
              />
              <SmartItem
                level={smartIndicators.clientsMissingOnboarding > 0 ? 'warn' : 'ok'}
                label={
                  smartIndicators.clientsMissingOnboarding > 0
                    ? t(`${smartIndicators.clientsMissingOnboarding} عميل لم يكمل التسجيل`, `${smartIndicators.clientsMissingOnboarding} clients haven't finished onboarding`)
                    : t('كل العملاء أكملوا التسجيل', 'All clients have onboarded')
                }
              />
              <SmartItem level="manual" label={t('فحص يدوي: bucket client-assets خاص', 'Manual check: client-assets bucket is private')} />
              <SmartItem level="manual" label={t('فحص يدوي: لا توجد سياسات public على الجداول الحساسة', 'Manual check: no public policies on sensitive tables')} />
            </SoftCard>
          )}
        </>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function ChecklistItem({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-2 py-1">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
      ) : (
        <Info className="w-4 h-4 text-amber-500 mt-0.5" />
      )}
      <div>
        <p className="text-sm text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-[11px] text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function SmartItem({ level, label }: { level: 'ok' | 'warn' | 'manual'; label: string }) {
  const tone = level === 'ok' ? 'text-emerald-600' : level === 'warn' ? 'text-amber-600' : 'text-slate-500';
  const Icon = level === 'ok' ? CheckCircle2 : level === 'warn' ? AlertTriangle : Info;
  return (
    <div className="flex items-center gap-2 py-1">
      <Icon className={`w-4 h-4 ${tone}`} />
      <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  );
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200';

void ExternalLink;
