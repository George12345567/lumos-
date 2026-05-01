import { Sparkles } from 'lucide-react';
import type { ProfileData } from '@/services/profileService';
import { AvatarPicker } from '../components/AvatarPicker';
import { EditableField } from '../components/EditableField';
import { SaveIndicator } from '../components/SaveIndicator';
import type { SaveState } from '../types';

interface Props {
  clientId: string;
  username: string;
  packageName?: string;
  profile: ProfileData;
  accent: string;
  saveState: SaveState;
  onUpdate: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
}

function bandStyle(accent: string): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${accent}1A 0%, ${accent}10 50%, ${accent}06 100%)`,
  };
}

export function ProfileHero({ clientId, username, packageName, profile, accent, saveState, onUpdate }: Props) {
  const displayName = profile.display_name || username;

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-8"
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-32" style={bandStyle(accent)} />
      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-end">
        <AvatarPicker
          clientId={clientId}
          avatarUrl={profile.avatar_url}
          displayName={displayName}
          accent={accent}
          onUpload={(url) => onUpdate('avatar_url', url)}
          onSelectPreset={(preset) => {
            if (preset.style) onUpdate('avatar_style', preset.style);
            if (preset.seed) onUpdate('avatar_seed', preset.seed);
            if (preset.preview_url) onUpdate('avatar_url', preset.preview_url);
          }}
          size={104}
        />

        <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {packageName && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${accent}15`, color: accent }}
              >
                <Sparkles className="h-3 w-3" />
                {packageName}
              </span>
            )}
            <SaveIndicator state={saveState} />
          </div>

          <EditableField
            value={profile.display_name || ''}
            placeholder={username}
            onCommit={(v) => onUpdate('display_name', v)}
            ariaLabel="Display name"
            displayClassName="text-2xl font-semibold text-slate-900 sm:text-3xl"
            inputClassName="text-2xl font-semibold sm:text-3xl"
            maxLength={80}
          />

          <EditableField
            value={profile.tagline || ''}
            placeholder="Add a slogan or tagline"
            onCommit={(v) => onUpdate('tagline', v)}
            ariaLabel="Slogan"
            displayClassName="text-sm text-slate-500"
            inputClassName="text-sm"
            maxLength={140}
          />
        </div>
      </div>
    </section>
  );
}
