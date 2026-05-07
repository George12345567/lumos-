import { useMemo } from 'react';
import {
  Mail,
  Phone,
  Globe,
  Building2,
  MapPin,
  Briefcase,
  Activity,
  Target,
  CheckCircle2,
  Circle,
  Briefcase as ProjectsIcon,
  MessageCircle,
  TrendingUp,
  CalendarClock,
  Pencil,
} from 'lucide-react';
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
  logo_url?: string;
  social_links?: Record<string, string | undefined>;
}

interface ClientInfo {
  email?: string;
  phone_number?: string;
  company_name?: string;
  industry?: string;
  role?: string;
  username?: string;
  is_verified?: boolean;
}

interface Stats {
  activeProjects: number;
  unreadMessages: number;
  progress: number;
  nextDelivery?: string;
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
  onEditAccount: () => void;
  isArabic?: boolean;
  stats: Stats;
  recentActivity: AdminNotification[];
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Target;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

interface CompletionRow {
  label: string;
  labelAr: string;
  done: boolean;
}

/**
 * Compute a simple "is your profile complete?" score from fields the user
 * actually owns. Avoids treating server-controlled fields like role / status
 * as completion checkboxes.
 */
function computeCompletion(profile: ProfileData, clientInfo: ClientInfo): {
  pct: number;
  rows: CompletionRow[];
} {
  const rows: CompletionRow[] = [
    { label: 'Display name', labelAr: 'الاسم المعروض', done: !!profile.display_name?.trim() },
    { label: 'Avatar', labelAr: 'الصورة الشخصية', done: !!profile.avatar_url?.trim() },
    { label: 'Phone', labelAr: 'الهاتف', done: !!clientInfo.phone_number?.trim() },
    { label: 'Company', labelAr: 'الشركة', done: !!clientInfo.company_name?.trim() },
    { label: 'Industry', labelAr: 'المجال', done: !!clientInfo.industry?.trim() },
    { label: 'Website', labelAr: 'الموقع', done: !!profile.website?.trim() },
    { label: 'Location', labelAr: 'الموقع الجغرافي', done: !!profile.location?.trim() },
    { label: 'Bio', labelAr: 'النبذة', done: !!profile.bio?.trim() },
  ];
  const done = rows.filter((r) => r.done).length;
  return { pct: Math.round((done / rows.length) * 100), rows };
}

function timeAgo(ts: string, isArabic?: boolean): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return isArabic ? 'الآن' : 'Just now';
  if (mins < 60) return isArabic ? `منذ ${mins} د` : `${mins}m ago`;
  if (hours < 24) return isArabic ? `منذ ${hours} س` : `${hours}h ago`;
  if (days < 7) return isArabic ? `منذ ${days} ي` : `${days}d ago`;
  return new Date(ts).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function OverviewSection({
  profile,
  clientInfo,
  packageName,
  progress,
  nextSteps,
  accent,
  onUpdate,
  onEditAccount,
  isArabic,
  stats,
  recentActivity,
}: Props) {
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  const completion = useMemo(() => computeCompletion(profile, clientInfo), [profile, clientInfo]);

  const nextDeliveryLabel = stats.nextDelivery
    ? new Date(stats.nextDelivery).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
      })
    : isArabic
      ? '—'
      : '—';

  return (
    <div className="space-y-5" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={ProjectsIcon}
          label={isArabic ? 'مشاريع نشطة' : 'Active projects'}
          value={stats.activeProjects}
          accent={accent}
        />
        <StatTile
          icon={MessageCircle}
          label={isArabic ? 'رسائل غير مقروءة' : 'Unread messages'}
          value={stats.unreadMessages}
          accent={accent}
        />
        <StatTile
          icon={TrendingUp}
          label={isArabic ? 'تقدم المشروع' : 'Project progress'}
          value={`${pct}%`}
          accent={accent}
        />
        <StatTile
          icon={CalendarClock}
          label={isArabic ? 'التسليم التالي' : 'Next delivery'}
          value={nextDeliveryLabel}
          accent={accent}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* About / account info */}
        <div className="lg:col-span-2 space-y-5">
          <Card
            title={isArabic ? 'نبذة عن الحساب' : 'About'}
            description={isArabic ? 'المعلومات الأساسية المرتبطة بحسابك.' : 'The basic info on your account.'}
            action={
              <button
                type="button"
                onClick={onEditAccount}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil className="h-3 w-3" />
                {isArabic ? 'تعديل المعلومات' : 'Edit information'}
              </button>
            }
          >
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Row icon={Building2} label={isArabic ? 'الشركة' : 'Company'} value={clientInfo.company_name} />
              <Row icon={Briefcase} label={isArabic ? 'المجال' : 'Industry'} value={clientInfo.industry} />
              <Row icon={Mail} label={isArabic ? 'البريد الإلكتروني' : 'Email'} value={clientInfo.email} />
              <Row icon={Phone} label={isArabic ? 'الهاتف' : 'Phone'} value={clientInfo.phone_number} />
              <Row icon={Globe} label={isArabic ? 'الموقع' : 'Website'} value={profile.website} />
              <Row icon={MapPin} label={isArabic ? 'المنطقة' : 'Location'} value={profile.location} />
            </dl>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isArabic ? 'نبذة' : 'Bio'}
              </h3>
              <EditableField
                value={profile.bio || ''}
                placeholder={
                  isArabic
                    ? 'اكتب وصفاً قصيراً يظهر في ملفك الشخصي.'
                    : 'A short bio shown on your profile.'
                }
                onCommit={(v) => onUpdate('bio', v)}
                multiline
                maxLength={500}
                ariaLabel="Bio"
                displayClassName="text-sm leading-relaxed text-slate-700 whitespace-pre-line"
              />
            </div>
          </Card>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          {/* Profile completion */}
          <Card
            icon={Target}
            title={isArabic ? 'اكتمال الملف' : 'Profile completion'}
          >
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold text-slate-900">{completion.pct}%</span>
                <span className="text-xs text-slate-500">
                  {completion.rows.filter((r) => r.done).length}/{completion.rows.length}{' '}
                  {isArabic ? 'حقول' : 'fields'}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${completion.pct}%`, backgroundColor: accent }}
                />
              </div>
              <ul className="mt-2 space-y-1.5">
                {completion.rows.map((row) => (
                  <li key={row.label} className="flex items-center gap-2 text-xs">
                    {row.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    )}
                    <span className={row.done ? 'text-slate-600' : 'text-slate-400'}>
                      {isArabic ? row.labelAr : row.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Recent activity */}
          <Card icon={Activity} title={isArabic ? 'النشاط الأخير' : 'Recent activity'}>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-400">
                {isArabic ? 'سيظهر نشاطك هنا.' : 'Your activity will appear here.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.slice(0, 4).map((n) => (
                  <li key={n.id} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-slate-700">
                        {isArabic ? n.messageAr : n.message}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {timeAgo(n.created_at, isArabic)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Next step */}
          <Card icon={Activity} title={isArabic ? 'الخطوة التالية' : 'Next step'}>
            {nextSteps ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{nextSteps}</p>
            ) : (
              <p className="text-sm text-slate-400">
                {isArabic
                  ? 'سيشارك فريق Lumos الخطوة التالية هنا.'
                  : 'Lumos will share the next step here.'}
              </p>
            )}
            {packageName && (
              <p className="mt-3 text-xs text-slate-500">
                {isArabic ? 'الباقة الحالية: ' : 'Current plan: '}
                <span className="font-medium text-slate-700">{packageName}</span>
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value?: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        <Icon className="h-3 w-3" />
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm text-slate-800">
        {value && value.trim() ? value : <span className="text-slate-300">—</span>}
      </dd>
    </div>
  );
}
