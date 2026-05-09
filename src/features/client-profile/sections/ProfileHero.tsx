import { useState } from 'react';
import { BadgeCheck, Pencil, Camera, MapPin, Globe, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import SafeAvatarImage from '@/components/shared/SafeAvatarImage';
import { CoverAvatarPicker } from '../components/CoverAvatarPicker';
import { EditProfileModal } from '../components/EditProfileModal';
import { STORAGE_BUCKET, STORAGE_PATHS, MAX_UPLOAD_BYTES } from '../constants';
import type { ProfileData } from '@/services/profileService';

interface Props {
  clientId: string;
  username: string;
  packageName?: string;
  profile: ProfileData;
  accent: string;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  onUpdate: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
  isArabic?: boolean;
  isVerified?: boolean;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
}

/**
 * Uploads a single image to the private `client-assets` bucket using the path
 * shape required by the storage RLS policy: `<auth.uid()>/<pathPrefix>/<timestamp>-<safe-name>`.
 * Returns a 1-year signed URL or throws.
 */
async function uploadToClientAssets(
  file: File,
  clientId: string,
  pathPrefix: string,
): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('file_too_large');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('not_an_image');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${clientId}/${pathPrefix}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (uploadError) throw uploadError;
  const ONE_YEAR = 60 * 60 * 24 * 365;
  const { data, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, ONE_YEAR);
  if (signError || !data?.signedUrl) {
    throw signError || new Error('sign_failed');
  }
  return data.signedUrl;
}

export function ProfileHero({
  clientId,
  username,
  packageName,
  profile,
  accent,
  saveState,
  onUpdate,
  isArabic,
  isVerified,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const displayName = profile.display_name || username;
  const colors = profile.brand_colors?.length ? profile.brand_colors : [accent, '#1e293b'];
  const coverGradient =
    profile.cover_gradient ||
    `linear-gradient(135deg, ${colors[0]}cc 0%, ${colors[1] || colors[0]}88 60%, ${accent}55 100%)`;
  const coverImage = profile.cover_url;

  const handleAvatarSelect = (url: string) => {
    onUpdate('avatar_url', url);
    onUpdate('avatar_style', '');
    onUpdate('avatar_seed', '');
    setPickerOpen(false);
  };

  const handleCoverSelect = (gradient: string) => {
    onUpdate('cover_gradient', gradient);
    onUpdate('cover_url', '');
    setPickerOpen(false);
  };

  const handleAvatarUpload = async (fileOrUrl: File | string) => {
    if (typeof fileOrUrl === 'string') {
      // CoverAvatarPicker currently emits blob URLs from its file input; ignore
      // those — the hero handles real uploads via the `onAvatarFile` path below.
      return;
    }
  };

  const handleCoverUpload = async (_fileOrUrl: File | string) => {
    // Same as above — the picker doesn't pass real Files yet. The custom
    // file inputs the hero owns drive uploadCover/uploadAvatar directly.
  };

  const onAvatarFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToClientAssets(file, clientId, STORAGE_PATHS.avatar);
      onUpdate('avatar_url', url);
      onUpdate('avatar_style', '');
      onUpdate('avatar_seed', '');
      setPickerOpen(false);
      toast.success(isArabic ? 'تم تحديث الصورة' : 'Avatar updated');
    } catch (err) {
      const code = err instanceof Error ? err.message : 'upload_failed';
      const msg =
        code === 'file_too_large'
          ? isArabic
            ? 'الصورة أكبر من 5 ميجابايت'
            : 'Image must be smaller than 5 MB'
          : code === 'not_an_image'
            ? isArabic
              ? 'يرجى اختيار ملف صورة'
              : 'Please pick an image file'
            : isArabic
              ? 'تعذّر رفع الصورة'
              : 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const onCoverFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToClientAssets(file, clientId, STORAGE_PATHS.cover);
      onUpdate('cover_url', url);
      onUpdate('cover_gradient', '');
      setPickerOpen(false);
      toast.success(isArabic ? 'تم تحديث الغلاف' : 'Cover updated');
    } catch (err) {
      const code = err instanceof Error ? err.message : 'upload_failed';
      const msg =
        code === 'file_too_large'
          ? isArabic
            ? 'الصورة أكبر من 5 ميجابايت'
            : 'Image must be smaller than 5 MB'
          : code === 'not_an_image'
            ? isArabic
              ? 'يرجى اختيار ملف صورة'
              : 'Please pick an image file'
            : isArabic
              ? 'تعذّر رفع الغلاف'
              : 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <section
        className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Cover */}
        <div className="group/cover relative h-44 sm:h-56 lg:h-64">
          {coverImage ? (
            <img src={coverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: coverGradient }} />
          )}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.10) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 50%)',
            }}
          />

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={`absolute top-4 ${isArabic ? 'left-4' : 'right-4'} inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-black/30 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/40`}
          >
            <Camera className="h-3.5 w-3.5" />
            {isArabic ? 'تغيير الغلاف' : 'Change cover'}
          </button>
        </div>

        {/* Body */}
        <div className="relative px-5 pb-6 pt-0 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-center -mt-14 sm:-mt-16 sm:flex-row sm:items-end sm:gap-5">
              {/* Avatar */}
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="group/avatar relative shrink-0"
                aria-label={isArabic ? 'تغيير الصورة' : 'Change avatar'}
              >
                <div
                  className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white text-3xl font-bold shadow-md sm:h-32 sm:w-32 sm:text-4xl"
                  style={{ backgroundColor: accent, color: '#fff' }}
                >
                  <SafeAvatarImage
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                    fallback={initials(displayName)}
                  />
                </div>
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover/avatar:bg-black/30">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <Camera className="h-6 w-6 text-white opacity-0 transition group-hover/avatar:opacity-100" />
                  )}
                </span>
                {isVerified && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white">
                    <BadgeCheck className="h-6 w-6" style={{ color: accent }} />
                  </span>
                )}
              </button>

              {/* Identity */}
              <div className="mt-3 flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{displayName}</h1>
                  {isVerified && (
                    <BadgeCheck className="h-5 w-5 shrink-0" style={{ color: accent }} />
                  )}
                </div>
                <p className="text-sm text-slate-400">@{username}</p>
                {profile.tagline && (
                  <p className="mt-1 max-w-md text-sm text-slate-600">{profile.tagline}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500 sm:justify-start">
                  {packageName && (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ backgroundColor: `${accent}14`, color: accent }}
                    >
                      {packageName}
                    </span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {profile.location}
                    </span>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-slate-700 hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                      {profile.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <span className="hidden text-xs text-slate-400 sm:inline" aria-live="polite">
                {saveState === 'saving' && (isArabic ? 'جارٍ الحفظ…' : 'Saving…')}
                {saveState === 'saved' && (isArabic ? 'تم الحفظ' : 'Saved')}
                {saveState === 'error' && (isArabic ? 'فشل الحفظ' : 'Save failed')}
              </span>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
              >
                <Pencil className="h-3.5 w-3.5" />
                {isArabic ? 'تعديل الملف' : 'Edit Profile'}
              </button>
            </div>
          </div>
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
        onAvatarSelect={handleAvatarSelect}
        onCoverSelect={handleCoverSelect}
        onAvatarUpload={handleAvatarUpload}
        onCoverUpload={handleCoverUpload}
        onAvatarFile={onAvatarFileChosen}
        onCoverFile={onCoverFileChosen}
      />
    </>
  );
}
