import { useState } from 'react';
import { X } from 'lucide-react';
import { PRESET_TIMEZONES } from '../constants';

interface ProfileData {
  display_name?: string;
  tagline?: string;
  bio?: string;
  website?: string;
  location?: string;
  timezone?: string;
  theme_accent?: string;
  brand_colors?: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData;
  accent: string;
  isArabic?: boolean;
  onSave?: (updates: Partial<ProfileData>) => void;
}

export function EditProfileModal({ open, onOpenChange, profile, accent, isArabic, onSave }: Props) {
  const [draft, setDraft] = useState<ProfileData>({ ...profile });

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setDraft({ ...profile });
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    onSave?.(draft);
    onOpenChange(false);
  };

  if (!open) return null;

  const fields: { key: keyof ProfileData; label: string; labelAr: string; type?: string; multiline?: boolean; maxLength?: number; placeholder?: string; placeholderAr?: string }[] = [
    { key: 'display_name', label: 'Display Name', labelAr: 'الاسم الظاهر', placeholder: 'Your name', placeholderAr: 'اسمك' },
    { key: 'tagline', label: 'Tagline', labelAr: 'الشعار', maxLength: 140, placeholder: 'A short slogan', placeholderAr: 'شعار قصير' },
    { key: 'bio', label: 'Bio', labelAr: 'نبذة', multiline: true, maxLength: 500, placeholder: 'Tell people about yourself', placeholderAr: 'احكمنا عن نفسك' },
    { key: 'website', label: 'Website', labelAr: 'الموقع', type: 'url', placeholder: 'https://yoursite.com', placeholderAr: 'https://yoursite.com' },
    { key: 'location', label: 'Location', labelAr: 'الموقع', placeholder: 'City, Country', placeholderAr: 'المدينة، البلد' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => handleOpen(false)} />
      <div
        className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isArabic ? 'تعديل الملف الشخصي' : 'Edit Profile'}
          </h2>
          <button
            type="button"
            onClick={() => handleOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(90vh - 130px)' }}>
          <div className="space-y-4">
            {fields.map((f) => (
              <label key={f.key} className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">
                  {isArabic ? f.labelAr : f.label}
                </span>
                {f.multiline ? (
                  <textarea
                    value={(draft[f.key] as string) || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    maxLength={f.maxLength}
                    rows={3}
                    placeholder={isArabic ? f.placeholderAr : f.placeholder}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={(draft[f.key] as string) || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    maxLength={f.maxLength}
                    placeholder={isArabic ? f.placeholderAr : f.placeholder}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
                  />
                )}
              </label>
            ))}

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-slate-700">
                {isArabic ? 'المنطقة الزمنية' : 'Timezone'}
              </span>
              <select
                value={draft.timezone || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
              >
                <option value="">— Select —</option>
                {PRESET_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={() => handleOpen(false)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            {isArabic ? 'حفظ' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}