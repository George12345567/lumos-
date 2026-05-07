import { useState } from 'react';
import { Mail, Phone, Globe, Building2, MapPin, Clock, Eye, Shield, LogOut, ChevronDown, Pencil, Check, X as XIcon, AlertTriangle, Briefcase } from 'lucide-react';
import { Card } from '../components/Card';
import { PRESET_TIMEZONES, PROFILE_VISIBILITY_OPTIONS } from '../constants';
import { isE164, normalizeWebsiteUrl, notDisposable } from '@/lib/validation';

/** Returns null if valid, otherwise an error message. Empty input is allowed. */
function validateField(
  kind: 'email' | 'phone' | 'website' | 'name' | 'company',
  value: string,
  isArabic?: boolean,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  switch (kind) {
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return isArabic ? 'بريد إلكتروني غير صالح' : 'Invalid email address';
      }
      if (!notDisposable(trimmed)) {
        return isArabic ? 'لا يمكن استخدام بريد مؤقت' : 'Disposable emails are not allowed';
      }
      return null;
    case 'phone':
      if (!isE164(trimmed)) {
        return isArabic
          ? 'صيغة دولية مثل +201001234567'
          : 'Use international format e.g. +201001234567';
      }
      return null;
    case 'website':
      if (!normalizeWebsiteUrl(trimmed)) {
        return isArabic ? 'رابط غير صالح (يجب أن يبدأ بـ https)' : 'Invalid URL (must use https)';
      }
      return null;
    case 'name':
      if (trimmed.length < 2 || trimmed.length > 80) {
        return isArabic ? 'يجب أن يكون بين 2 و80 حرفاً' : 'Must be 2–80 characters';
      }
      return null;
    case 'company':
      if (trimmed.length < 2 || trimmed.length > 80) {
        return isArabic ? 'يجب أن يكون بين 2 و80 حرفاً' : 'Must be 2–80 characters';
      }
      return null;
    default:
      return null;
  }
}

/** Apply field-specific normalization before persisting. */
function normalizeField(kind: 'email' | 'phone' | 'website' | 'name' | 'company', value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (kind === 'email') return trimmed.toLowerCase();
  if (kind === 'website') return normalizeWebsiteUrl(trimmed) || trimmed;
  return trimmed;
}

interface ProfileData {
  display_name?: string;
  tagline?: string;
  bio?: string;
  website?: string;
  location?: string;
  timezone?: string;
  theme_accent?: string;
  brand_colors?: string[];
  profile_visibility?: string;
}

interface ClientInfo {
  email?: string;
  phone_number?: string;
  company_name?: string;
  industry?: string;
  role?: string;
  username: string;
}

interface Props {
  clientInfo: ClientInfo;
  profile: ProfileData;
  onUpdate: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
  onSignOut: () => void;
  hasSecurityQuestion: boolean;
  accent: string;
  isArabic?: boolean;
}

interface EditableFieldInlineProps {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  isArabic?: boolean;
  validate?: (value: string) => string | null;
  normalize?: (value: string) => string;
}

function EditableFieldInline({ value, onSave, placeholder, type = 'text', readOnly, isArabic, validate, normalize }: EditableFieldInlineProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const next = normalize ? normalize(draft) : draft;
    const validation = validate ? validate(next) : null;
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    onSave(next);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setError(null);
    setEditing(false);
  };

  if (readOnly) {
    return <span className="font-mono text-sm text-slate-700">@{value}</span>;
  }

  if (!editing) {
    return (
      <div className="group flex items-center gap-2">
        <span className="text-sm text-slate-800">{value || <span className="text-slate-400">{placeholder}</span>}</span>
        <button
          type="button"
          onClick={() => { setDraft(value); setError(null); setEditing(true); }}
          className="shrink-0 rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <input
          type={type}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); if (error) setError(null); }}
          className={`w-full min-w-0 rounded-lg border bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-300 focus:border-slate-400 focus:ring-slate-200'
          }`}
          autoFocus
          aria-invalid={!!error}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        />
        <button type="button" onClick={commit} className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50"><Check className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={cancel} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><XIcon className="h-3.5 w-3.5" /></button>
      </div>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}

interface SectionProps {
  title: string;
  titleAr: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accent: string;
  isArabic?: boolean;
}

function CollapsibleSection({ title, titleAr, icon: Icon, defaultOpen = false, children, accent, isArabic }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50/80"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-900">{isArabic ? titleAr : title}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-slate-100 px-5 py-4">{children}</div>}
    </div>
  );
}

export function AccountSection({ clientInfo, profile, onUpdate, onSignOut, hasSecurityQuestion, accent, isArabic }: Props) {
  return (
    <div className="space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
      <Card title={isArabic ? 'معلومات الحساب' : 'Account Information'}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Mail className="h-3.5 w-3.5" /> {isArabic ? 'البريد الإلكتروني' : 'Email'}
            </div>
            <EditableFieldInline
              value={clientInfo.email || ''}
              onSave={(v) => onUpdate('email' as never, v)}
              isArabic={isArabic}
              type="email"
              validate={(v) => validateField('email', v, isArabic)}
              normalize={(v) => normalizeField('email', v)}
            />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Phone className="h-3.5 w-3.5" /> {isArabic ? 'الموبايل' : 'Phone'}
            </div>
            <EditableFieldInline
              value={clientInfo.phone_number || ''}
              onSave={(v) => onUpdate('phone_number' as never, v)}
              placeholder={isArabic ? '+20 ...' : '+20 ...'}
              isArabic={isArabic}
              type="tel"
              validate={(v) => validateField('phone', v, isArabic)}
              normalize={(v) => normalizeField('phone', v)}
            />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="text-xs">@</span> {isArabic ? 'اسم المستخدم' : 'Username'}
            </div>
            <EditableFieldInline
              value={clientInfo.username}
              onSave={() => {}}
              readOnly
              isArabic={isArabic}
            />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Building2 className="h-3.5 w-3.5" /> {isArabic ? 'الشركة' : 'Company'}
            </div>
            <EditableFieldInline
              value={clientInfo.company_name || ''}
              onSave={(v) => onUpdate('company_name' as never, v)}
              placeholder={isArabic ? 'اسم الشركة' : 'Company name'}
              isArabic={isArabic}
              validate={(v) => validateField('company', v, isArabic)}
              normalize={(v) => normalizeField('company', v)}
            />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Briefcase className="h-3.5 w-3.5" /> {isArabic ? 'الصناعة' : 'Industry'}
            </div>
            <EditableFieldInline
              value={clientInfo.industry || ''}
              onSave={(v) => onUpdate('industry' as never, v)}
              placeholder={isArabic ? 'مثال: التسويق الرقمي' : 'e.g. Digital Marketing'}
              isArabic={isArabic}
            />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Globe className="h-3.5 w-3.5" /> {isArabic ? 'الموقع الإلكتروني' : 'Website'}
            </div>
            <EditableFieldInline
              value={profile.website || ''}
              onSave={(v) => onUpdate('website', v)}
              placeholder="https://..."
              type="url"
              isArabic={isArabic}
              validate={(v) => validateField('website', v, isArabic)}
              normalize={(v) => normalizeField('website', v)}
            />
          </div>
        </div>
      </Card>

      <CollapsibleSection title="Location & Timezone" titleAr="الموقع والمنطقة الزمنية" icon={MapPin} accent={accent} isArabic={isArabic}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{isArabic ? 'الموقع' : 'Location'}</label>
            <input
              type="text"
              value={profile.location || ''}
              onChange={(e) => onUpdate('location', e.target.value)}
              placeholder={isArabic ? 'المدينة، البلد' : 'City, Country'}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{isArabic ? 'المنطقة الزمنية' : 'Timezone'}</label>
            <select
              value={profile.timezone || ''}
              onChange={(e) => onUpdate('timezone', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="">— Select —</option>
              {PRESET_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Preferences" titleAr="التفضيلات" icon={Eye} accent={accent} isArabic={isArabic}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{isArabic ? 'ظهور الملف الشخصي' : 'Profile visibility'}</label>
            <select
              value={profile.profile_visibility || 'private'}
              onChange={(e) => onUpdate('profile_visibility', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              {PROFILE_VISIBILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{isArabic ? o.labelAr : o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{isArabic ? 'لون التمييز' : 'Accent Color'}</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={profile.theme_accent || accent}
                onChange={(e) => onUpdate('theme_accent', e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-lg border border-slate-200"
              />
              <span className="text-sm text-slate-600">{profile.theme_accent || accent}</span>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Security" titleAr="الأمان" icon={Shield} defaultOpen={false} accent={accent} isArabic={isArabic}>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-700">{isArabic ? 'سؤال الأمان' : 'Security question'}</span>
            <span className={`text-sm font-medium ${hasSecurityQuestion ? 'text-emerald-600' : 'text-amber-600'}`}>
              {hasSecurityQuestion ? (isArabic ? 'مفعّل ✅' : 'Enabled ✅') : (isArabic ? 'غير مفعّل' : 'Not set')}
            </span>
          </div>
          <p className="text-xs text-slate-500">{isArabic ? 'لتغيير كلمة السر أو سؤال الأمان، تواصل مع الدعم.' : 'Password and security question changes go through our secure flow. Contact support to update them.'}</p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Danger Zone" titleAr="المنطقة الخطرة" icon={AlertTriangle} accent={accent} isArabic={isArabic} defaultOpen={false}>
        <div className="space-y-3">
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-4 w-4" />
            {isArabic ? 'تسجيل الخروج' : 'Sign out'}
          </button>
        </div>
      </CollapsibleSection>
    </div>
  );
}