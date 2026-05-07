import { Mail, Phone, Globe, Building2, MapPin, Briefcase, Shield, Activity, Target, Star } from 'lucide-react';
import { Card } from '../components/Card';
import { EditableField } from '../components/EditableField';
import type { AdminNotification } from '../mockData';

interface ProfileData {
  display_name?: string;
  tagline?: string;
  bio?: string;
  website?: string;
  location?: string;
  timezone?: string;
  avatar_url?: string;
  theme_accent?: string;
  brand_colors?: string[];
}

interface ClientInfo {
  email?: string;
  phone_number?: string;
  company_name?: string;
  industry?: string;
  role?: string;
  package_name?: string;
  status?: string;
  is_verified?: boolean;
}

interface Props {
  profile: ProfileData;
  clientInfo: ClientInfo;
  packageName?: string;
  status?: string;
  progress?: number;
  nextSteps?: string;
  accent: string;
  onUpdate: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
  isArabic?: boolean;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
}

export function OverviewSection({ profile, clientInfo, packageName, status, progress, nextSteps, accent, onUpdate, isArabic }: Props) {
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  const displayName = profile.display_name || 'User';

  return (
    <div className="space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Identity Summary */}
      <Card icon={Shield} title={isArabic ? 'ملخص الهوية' : 'Identity Summary'}>
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold"
            style={{ backgroundColor: accent, color: '#fff' }}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initials(displayName)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900 truncate">{displayName}</h3>
              {clientInfo.is_verified && (
                <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
              )}
            </div>
            {profile.tagline && (
              <p className="text-sm text-slate-500 truncate">{profile.tagline}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {clientInfo.email && (
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" />{clientInfo.email}</span>
              )}
              {clientInfo.phone_number && (
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{clientInfo.phone_number}</span>
              )}
              {profile.website && (
                <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-slate-400" />{profile.website}</span>
              )}
              {clientInfo.company_name && (
                <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-400" />{clientInfo.company_name}</span>
              )}
              {clientInfo.industry && (
                <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-slate-400" />{clientInfo.industry}</span>
              )}
              {profile.location && (
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{profile.location}</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {packageName && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: accent }}>
                  {packageName}
                </span>
              )}
              {status && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {status === 'active' ? (isArabic ? 'نشط' : 'Active') : status}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Project Progress */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card icon={Target} title={isArabic ? 'تقدم المشروع' : 'Project Progress'} className="lg:col-span-2">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-slate-900">{pct}%</span>
              {status && <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{status}</span>}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: accent }} />
            </div>
            {packageName && (
              <p className="text-sm text-slate-500">
                Plan: <span className="font-medium text-slate-700">{packageName}</span>
              </p>
            )}
          </div>
        </Card>

        <Card icon={Activity} title={isArabic ? 'الخطوات التالية' : 'Next Steps'}>
          {nextSteps ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{nextSteps}</p>
          ) : (
            <p className="text-sm text-slate-400">{isArabic ? 'الفريق هشارك الخطوات التالية هنا.' : 'Your team will share next steps here.'}</p>
          )}
        </Card>
      </div>

      {/* Bio */}
      <Card icon={Building2} title={isArabic ? 'نبذة' : 'About'} description={isArabic ? 'وصف قصير يظهر في ملفك الشخصي.' : 'A short bio shown on your profile.'} className="lg:col-span-3">
        <EditableField
          value={profile.bio || ''}
          placeholder={isArabic ? 'احكي عن نفسك وش بتشتغل وش بتفرق.' : 'Tell people who you are, what you do, and what makes you different.'}
          onCommit={(v) => onUpdate('bio', v)}
          multiline
          maxLength={500}
          ariaLabel="Bio"
          displayClassName="text-sm leading-relaxed text-slate-700 whitespace-pre-line"
        />
      </Card>
    </div>
  );
}