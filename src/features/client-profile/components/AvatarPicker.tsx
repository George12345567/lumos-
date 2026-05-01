import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { profileService } from '@/services/profileService';
import { ImageUpload } from './ImageUpload';
import { STORAGE_PATHS } from '../constants';

interface Preset {
  id: string;
  style?: string;
  seed?: string;
  preview_url?: string;
  config?: Record<string, unknown>;
}

interface Props {
  clientId: string;
  avatarUrl?: string;
  displayName: string;
  onUpload: (url: string) => void;
  onSelectPreset: (preset: Preset) => void;
  size?: number;
  accent: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0] || '').join('').toUpperCase() || '·';
}

export function AvatarPicker({ clientId, avatarUrl, displayName, onUpload, onSelectPreset, size = 96, accent }: Props) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void profileService.getAvatarPresets().then((rows) => {
      if (cancelled) return;
      setPresets((rows as unknown as Preset[]) ?? []);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 sm:items-start">
      <div className="relative">
        <ImageUpload
          clientId={clientId}
          pathPrefix={STORAGE_PATHS.avatar}
          currentUrl={avatarUrl}
          onChange={onUpload}
          size={size}
        >
          {({ trigger, uploading }) => (
            <button
              type="button"
              onClick={trigger}
              className="group relative flex items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-[0_2px_8px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ width: size, height: size, color: accent }}
              aria-label="Change profile picture"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold" style={{ color: accent }}>{initialsOf(displayName)}</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </span>
              {uploading && <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs">…</span>}
            </button>
          )}
        </ImageUpload>
      </div>

      {presets.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPresets((v) => !v)}
          className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
        >
          {showPresets ? 'Hide preset avatars' : 'Choose a preset avatar'}
        </button>
      )}

      {showPresets && presets.length > 0 && (
        <div className="flex w-full max-w-xs flex-wrap gap-2 sm:max-w-sm">
          {presets.slice(0, 12).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPreset(p)}
              className="h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-slate-50 transition hover:border-slate-400"
              aria-label={`Select preset ${p.style || ''}`}
            >
              {p.preview_url ? (
                <img src={p.preview_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">{p.style?.slice(0, 6)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
