import { Activity, Target, FileText } from 'lucide-react';
import type { ProfileData } from '@/services/profileService';
import { Card } from '../components/Card';
import { EditableField } from '../components/EditableField';

interface Props {
  profile: ProfileData;
  packageName?: string;
  status?: string;
  progress?: number;
  nextSteps?: string;
  accent: string;
  onUpdate: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
}

export function OverviewSection({ profile, packageName, status, progress, nextSteps, accent, onUpdate }: Props) {
  const pct = Math.max(0, Math.min(100, progress ?? 0));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card icon={Target} title="Project progress" className="lg:col-span-2">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-semibold text-slate-900">{pct}%</span>
            {status && <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{status}</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: accent }}
            />
          </div>
          {packageName && (
            <p className="text-sm text-slate-500">
              Plan: <span className="font-medium text-slate-700">{packageName}</span>
            </p>
          )}
        </div>
      </Card>

      <Card icon={Activity} title="Next steps">
        {nextSteps ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{nextSteps}</p>
        ) : (
          <p className="text-sm text-slate-400">Your team will share next steps here.</p>
        )}
      </Card>

      <Card icon={FileText} title="About" description="A short bio shown on your profile." className="lg:col-span-3">
        <EditableField
          value={profile.bio || ''}
          placeholder="Tell people who you are, what you do, and what you're building."
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
