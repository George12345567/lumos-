import { Mail, Phone, MapPin, Clock, Eye, LogOut, Shield } from 'lucide-react';
import type { ProfileData } from '@/services/profileService';
import { Card } from '../components/Card';
import { EditableField } from '../components/EditableField';
import { PRESET_TIMEZONES, PROFILE_VISIBILITY_OPTIONS } from '../constants';

interface Props {
  email?: string;
  phoneNumber?: string;
  username: string;
  profile: ProfileData;
  onUpdate: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
  onSignOut: () => void;
  hasSecurityQuestion: boolean;
}

interface RowProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function Row({ label, icon: Icon, children }: RowProps) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500 sm:w-44">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        {label}
      </div>
      <div className="flex-1 text-sm text-slate-800">{children}</div>
    </div>
  );
}

export function AccountSection({ email, phoneNumber, username, profile, onUpdate, onSignOut, hasSecurityQuestion }: Props) {
  return (
    <div className="grid gap-4">
      <Card title="Contact details">
        <Row label="Email" icon={Mail}>
          <span className="text-slate-700">{email || '—'}</span>
        </Row>
        <Row label="Phone" icon={Phone}>
          <span className="text-slate-700">{phoneNumber || '—'}</span>
        </Row>
        <Row label="Username">
          <span className="font-mono text-slate-700">@{username}</span>
        </Row>
      </Card>

      <Card title="Location & timezone">
        <Row label="Location" icon={MapPin}>
          <EditableField
            value={profile.location || ''}
            placeholder="City, Country"
            onCommit={(v) => onUpdate('location', v)}
            ariaLabel="Location"
            displayClassName="text-sm text-slate-700"
            inputClassName="text-sm"
            maxLength={120}
          />
        </Row>
        <Row label="Timezone" icon={Clock}>
          <select
            value={profile.timezone || ''}
            onChange={(e) => onUpdate('timezone', e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="">— Select —</option>
            {PRESET_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </Row>
      </Card>

      <Card title="Visibility">
        <Row label="Profile visibility" icon={Eye}>
          <select
            value={profile.profile_visibility || 'private'}
            onChange={(e) => onUpdate('profile_visibility', e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
          >
            {PROFILE_VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Row>
      </Card>

      <Card title="Security" icon={Shield}>
        <div className="flex flex-col gap-2 text-sm text-slate-600">
          <p>
            Security question:{' '}
            <span className={hasSecurityQuestion ? 'font-medium text-emerald-600' : 'font-medium text-amber-600'}>
              {hasSecurityQuestion ? 'Enabled' : 'Not set'}
            </span>
          </p>
          <p className="text-xs text-slate-500">
            Password and security question changes go through our secure flow. Contact support to update them.
          </p>
        </div>
      </Card>

      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
