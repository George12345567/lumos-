import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import SafeAvatarImage from '@/components/shared/SafeAvatarImage';
import { AVATAR_PRESETS, COVER_GRADIENT_PRESETS } from '../constants';

interface Props {
  open: boolean;
  onClose: () => void;
  currentAvatarUrl: string;
  currentCoverGradient: string;
  accent: string;
  isArabic?: boolean;
  onAvatarSelect: (url: string) => void;
  onCoverSelect: (gradient: string) => void;
  /** @deprecated use onAvatarFile — kept for backwards-compat with the test view. */
  onAvatarUpload: (url: string) => void;
  /** @deprecated use onCoverFile — kept for backwards-compat with the test view. */
  onCoverUpload: (url: string) => void;
  /** Called with the raw File so the parent can do a real Supabase upload. */
  onAvatarFile?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Called with the raw File so the parent can do a real Supabase upload. */
  onCoverFile?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

type Tab = 'avatar' | 'cover';

export function CoverAvatarPicker({
  open,
  onClose,
  currentAvatarUrl,
  currentCoverGradient,
  accent,
  isArabic,
  onAvatarSelect,
  onCoverSelect,
  onAvatarUpload,
  onCoverUpload,
  onAvatarFile,
  onCoverFile,
}: Props) {
  const [tab, setTab] = useState<Tab>('avatar');
  const [avatarMode, setAvatarMode] = useState<'presets' | 'upload'>('presets');
  const [coverMode, setCoverMode] = useState<'presets' | 'upload' | 'gradient'>('gradient');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onAvatarFile) {
      onAvatarFile(e);
      return;
    }
    // Legacy preview-only path (used by ClientProfileTestView): create a local
    // blob URL for visual preview without persisting anywhere.
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onAvatarUpload(url);
    onClose();
  };

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onCoverFile) {
      onCoverFile(e);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onCoverUpload(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isArabic ? 'تغيير الصورة والغلاف' : 'Change Photo & Cover'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-5">
          <button
            type="button"
            onClick={() => setTab('avatar')}
            className={`flex-1 border-b-2 py-2.5 text-sm font-medium transition ${
              tab === 'avatar' ? 'border-current' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
            style={tab === 'avatar' ? { color: accent } : undefined}
          >
            {isArabic ? 'الصورة الشخصية' : 'Avatar'}
          </button>
          <button
            type="button"
            onClick={() => setTab('cover')}
            className={`flex-1 border-b-2 py-2.5 text-sm font-medium transition ${
              tab === 'cover' ? 'border-current' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
            style={tab === 'cover' ? { color: accent } : undefined}
          >
            {isArabic ? 'غلاف الصفحة' : 'Cover'}
          </button>
        </div>

        <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {tab === 'avatar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div
                  className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white text-2xl font-bold shadow-lg"
                  style={{ backgroundColor: accent, color: '#fff' }}
                >
                  <SafeAvatarImage
                    src={currentAvatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    fallback="?"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAvatarMode('presets')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    avatarMode === 'presets' ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={avatarMode === 'presets' ? { backgroundColor: accent } : undefined}
                >
                  {isArabic ? 'اختيار من المجموعة' : 'Choose Preset'}
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarMode('upload')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    avatarMode === 'upload' ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={avatarMode === 'upload' ? { backgroundColor: accent } : undefined}
                >
                  {isArabic ? 'رفع من الجهاز' : 'Upload'}
                </button>
              </div>

              {avatarMode === 'presets' && (
                <div className="grid grid-cols-3 gap-3">
                  {AVATAR_PRESETS.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => { onAvatarSelect(url); onClose(); }}
                      className={`group relative aspect-square overflow-hidden rounded-2xl border-2 transition hover:border-slate-400 ${
                        currentAvatarUrl === url ? 'border-current ring-2 ring-offset-2' : 'border-slate-200'
                      }`}
                      style={currentAvatarUrl === url ? { borderColor: accent } : undefined}
                    >
                      <SafeAvatarImage
                        src={url}
                        alt={`Avatar ${i + 1}`}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        fallback={<ImageIcon className="m-auto h-6 w-6 text-slate-400" />}
                      />
                    </button>
                  ))}
                </div>
              )}

              {avatarMode === 'upload' && (
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  <Upload className="h-8 w-8 text-slate-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">{isArabic ? 'اضغط لرفع صورة' : 'Click to upload'}</p>
                    <p className="text-xs text-slate-500">JPG, PNG · Max 5 MB</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'cover' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div
                  className="h-20 w-full max-w-xs overflow-hidden rounded-xl"
                  style={{
                    background: currentCoverGradient || `linear-gradient(135deg, ${accent}dd 0%, #3b82f699 100%)`,
                  }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCoverMode('gradient')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    coverMode === 'gradient' ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={coverMode === 'gradient' ? { backgroundColor: accent } : undefined}
                >
                  {isArabic ? 'تدرجات' : 'Gradients'}
                </button>
                <button
                  type="button"
                  onClick={() => setCoverMode('upload')}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    coverMode === 'upload' ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={coverMode === 'upload' ? { backgroundColor: accent } : undefined}
                >
                  {isArabic ? 'رفع صورة' : 'Upload'}
                </button>
              </div>

              {coverMode === 'gradient' && (
                <div className="grid grid-cols-2 gap-3">
                  {COVER_GRADIENT_PRESETS.map((gradient) => (
                    <button
                      key={gradient}
                      type="button"
                      onClick={() => { onCoverSelect(gradient); onClose(); }}
                      className={`h-20 overflow-hidden rounded-xl border-2 transition hover:border-slate-400 ${
                        currentCoverGradient === gradient ? 'border-current ring-2 ring-offset-2' : 'border-slate-200'
                      }`}
                      style={{
                        background: gradient,
                        borderColor: currentCoverGradient === gradient ? accent : undefined,
                      }}
                    />
                  ))}
                </div>
              )}

              {coverMode === 'upload' && (
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">{isArabic ? 'اضغط لرفع صورة غلاف' : 'Click to upload cover'}</p>
                    <p className="text-xs text-slate-500">JPG, PNG · Max 5 MB</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFile}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCoverFile}
        />
      </div>
    </div>
  );
}
