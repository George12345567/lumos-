import { useState } from 'react';
import { Package, MessageCircle, TrendingUp, BadgeCheck, Pencil, Camera, Megaphone, X } from 'lucide-react';
import { CoverAvatarPicker } from '../components/CoverAvatarPicker';
import { EditProfileModal } from '../components/EditProfileModal';
import { AVATAR_PRESETS } from '../constants';
import type { AdminNotification } from '../mockData';

interface ProfileData {
  display_name?: string;
  tagline?: string;
  bio?: string;
  website?: string;
  location?: string;
  timezone?: string;
  avatar_url?: string;
  avatar_style?: string;
  avatar_seed?: string;
  theme_accent?: string;
  brand_colors?: string[];
  cover_url?: string;
  cover_gradient?: string;
}

interface Stats {
  orders: number;
  messages: number;
  progress: number;
}

interface Props {
  clientId: string;
  username: string;
  packageName?: string;
  profile: ProfileData;
  accent: string;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  onUpdate: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
  isArabic?: boolean;
  stats?: Stats;
  isVerified?: boolean;
  notifications?: AdminNotification[];
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
}

function timeAgo(ts: string, isArabic?: boolean): string {
  const now = new Date();
  const d = new Date(ts);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return isArabic ? 'الآن' : 'Just now';
  if (diffMins < 60) return isArabic ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
  if (diffHours < 24) return isArabic ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
  if (diffDays < 7) return isArabic ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
  return d.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
}

export function ProfileHero({ username, packageName, profile, accent, isArabic, stats, isVerified, notifications }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const displayName = profile.display_name || username;
  const colors = profile.brand_colors?.length ? profile.brand_colors : [accent, '#3b82f6'];
  const coverGradient = profile.cover_gradient || profile.cover_url || `linear-gradient(135deg, ${colors[0]}dd 0%, ${colors[1] || colors[0]}99 40%, ${accent}66 100%)`;

  const unreadNotifs = notifications?.filter((n) => !n.is_read) ?? [];
  const hasNotifs = unreadNotifs.length > 0;

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl" dir={isArabic ? 'rtl' : 'ltr'}>
        {/* Cover */}
        <div className="group/cover relative h-40 sm:h-52 cursor-pointer" onClick={() => setPickerOpen(true)}>
          {profile.cover_url ? (
            <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: coverGradient }} />
          )}
          <div aria-hidden className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)',
          }} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover/cover:bg-black/30">
            <Camera className="h-8 w-8 text-white opacity-0 transition group-hover/cover:opacity-100" />
          </div>
        </div>

        {/* Content */}
        <div className="relative -mt-16 bg-white px-5 pb-5 sm:-mt-20 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
            {/* Avatar */}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="group/avatar relative shrink-0"
            >
              <div
                className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white text-3xl font-bold shadow-xl sm:h-32 sm:w-32 sm:text-4xl"
                style={{ backgroundColor: accent, color: '#fff' }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  initials(displayName)
                )}
              </div>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover/avatar:bg-black/30">
                <Camera className="h-6 w-6 text-white opacity-0 transition group-hover/avatar:opacity-100" />
              </span>
              {isVerified && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white">
                  <BadgeCheck className="h-6 w-6" style={{ color: accent }} />
                </span>
              )}
            </button>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{displayName}</h1>
                {isVerified && (
                  <BadgeCheck className="h-6 w-6 shrink-0" style={{ color: accent }} />
                )}
                <span className="text-sm text-slate-400">@{username}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {packageName && (
                  <span className="text-xs text-slate-500">
                    {packageName}
                  </span>
                )}
                {profile.tagline && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">{profile.tagline}</span>
                  </>
                )}
                {profile.location && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">{profile.location}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:mt-0">
              {hasNotifs && (
                <button
                  type="button"
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Megaphone className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                    {unreadNotifs.length}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:border-slate-300"
              >
                <Pencil className="h-3.5 w-3.5" />
                {isArabic ? 'تعديل' : 'Edit'}
              </button>
            </div>
          </div>

          {stats && (
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}15`, color: accent }}>
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-xl font-bold text-slate-900">{stats.orders}</span>
                <span className="text-[11px] font-medium text-slate-500">{isArabic ? 'الطلبات' : 'Orders'}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}15`, color: accent }}>
                  <MessageCircle className="h-4 w-4" />
                </div>
                <span className="text-xl font-bold text-slate-900">{stats.messages}</span>
                <span className="text-[11px] font-medium text-slate-500">{isArabic ? 'الرسائل' : 'Messages'}</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}15`, color: accent }}>
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span className="text-xl font-bold text-slate-900">{stats.progress}%</span>
                <span className="text-[11px] font-medium text-slate-500">{isArabic ? 'التقدم' : 'Progress'}</span>
              </div>
            </div>
          )}

          {/* Admin notifications banner */}
          {hasNotifs && showNotifs && (
            <div className="mt-3 space-y-2">
              {unreadNotifs.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}12`, color: accent }}>
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">{isArabic ? n.messageAr : n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{timeAgo(n.created_at, isArabic)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotifs(false)}
                    className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <EditProfileModal
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        accent={accent}
        isArabic={isArabic}
      />

      <CoverAvatarPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentAvatarUrl={profile.avatar_url || ''}
        currentCoverGradient={coverGradient}
        accent={accent}
        isArabic={isArabic}
        onAvatarSelect={(url) => { /* no-op for test */ }}
        onCoverSelect={(gradient) => { /* no-op for test */ }}
        onAvatarUpload={(url) => { /* no-op for test */ }}
        onCoverUpload={(url) => { /* no-op for test */ }}
      />
    </>
  );
}