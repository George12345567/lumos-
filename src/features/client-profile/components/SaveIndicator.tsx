import { Check, Loader2, AlertCircle } from 'lucide-react';
import type { SaveState } from '../types';

interface Props {
  state: SaveState;
  className?: string;
}

const COPY: Record<SaveState, { en: string; ar: string }> = {
  idle: { en: 'All changes saved', ar: 'كل التغييرات محفوظة' },
  saving: { en: 'Saving…', ar: 'جارٍ الحفظ…' },
  saved: { en: 'Saved', ar: 'تم الحفظ' },
  error: { en: 'Save failed', ar: 'فشل الحفظ' },
};

export function SaveIndicator({ state, className = '' }: Props) {
  const Icon =
    state === 'saving' ? Loader2 :
      state === 'error' ? AlertCircle :
        Check;
  const tone =
    state === 'error' ? 'text-rose-600 bg-rose-50 border-rose-200' :
      state === 'saving' ? 'text-slate-600 bg-slate-50 border-slate-200' :
        'text-emerald-600 bg-emerald-50 border-emerald-200';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone} ${className}`}>
      <Icon className={`h-3.5 w-3.5 ${state === 'saving' ? 'animate-spin' : ''}`} />
      {COPY[state].en}
    </span>
  );
}
