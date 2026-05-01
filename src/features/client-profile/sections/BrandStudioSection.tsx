import { Palette, Globe, Image as ImageIcon, Share2 } from 'lucide-react';
import type { ProfileData, SocialLinks } from '@/services/profileService';
import { Card } from '../components/Card';
import { EditableField } from '../components/EditableField';
import { ImageUpload } from '../components/ImageUpload';
import { ColorPicker } from '../components/ColorPicker';
import { STORAGE_PATHS } from '../constants';

interface Props {
  clientId: string;
  profile: ProfileData;
  accent: string;
  onUpdate: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
}

const SOCIAL_FIELDS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/yourbrand' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourbrand' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourbrand' },
  { key: 'behance', label: 'Behance', placeholder: 'https://behance.net/yourbrand' },
  { key: 'dribbble', label: 'Dribbble', placeholder: 'https://dribbble.com/yourbrand' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/yourbrand' },
];

export function BrandStudioSection({ clientId, profile, accent, onUpdate }: Props) {
  const updateSocial = (key: keyof SocialLinks, value: string) => {
    const next = { ...(profile.social_links || {}), [key]: value.trim() } as SocialLinks;
    if (!value.trim()) delete next[key];
    onUpdate('social_links', next);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card icon={ImageIcon} title="Logo" description="PNG or SVG up to 5 MB.">
        <ImageUpload
          clientId={clientId}
          pathPrefix={STORAGE_PATHS.logo}
          currentUrl={profile.logo_url}
          onChange={(url) => onUpdate('logo_url', url)}
          onClear={() => onUpdate('logo_url', '')}
          label="Brand logo"
          shape="square"
          size={88}
        />
      </Card>

      <Card icon={Globe} title="Website" description="Public link people see.">
        <EditableField
          value={profile.website || ''}
          placeholder="https://yourbrand.com"
          onCommit={(v) => onUpdate('website', v)}
          ariaLabel="Website"
          displayClassName="text-sm text-slate-700"
          inputClassName="text-sm"
          maxLength={200}
        />
      </Card>

      <Card
        icon={Palette}
        title="Brand colors"
        description="Tap a color to make it your accent."
        className="lg:col-span-2"
      >
        <ColorPicker
          colors={profile.brand_colors || []}
          onChange={(next) => onUpdate('brand_colors', next)}
          accent={accent}
          onAccentChange={(next) => onUpdate('theme_accent', next)}
        />
      </Card>

      <Card icon={Share2} title="Social links" className="lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">{f.label}</span>
              <input
                type="url"
                defaultValue={profile.social_links?.[f.key] || ''}
                placeholder={f.placeholder}
                onBlur={(e) => updateSocial(f.key, e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
