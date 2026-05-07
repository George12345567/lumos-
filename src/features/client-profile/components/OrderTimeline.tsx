import { Check, Clock, Loader2 } from 'lucide-react';
import type { MockOrder } from '../mockData';

interface Props {
  timeline: MockOrder['timeline'];
  accent: string;
  isArabic?: boolean;
}

export function OrderTimeline({ timeline, accent, isArabic }: Props) {
  return (
    <div className="relative flex flex-col gap-0">
      {timeline.map((step, i) => {
        const isLast = i === timeline.length - 1;
        const isFuture = !step.completed && !step.active;

        return (
          <div key={step.status} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  step.completed
                    ? 'border-transparent text-white'
                    : step.active
                      ? 'border-transparent text-white animate-pulse'
                      : 'border-slate-200 bg-white text-slate-300'
                }`}
                style={
                  step.completed || step.active
                    ? { backgroundColor: accent }
                    : undefined
                }
              >
                {step.completed ? (
                  <Check className="h-4 w-4" />
                ) : step.active ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-[2rem] transition ${
                    step.completed ? '' : 'bg-slate-200'
                  }`}
                  style={step.completed ? { backgroundColor: accent } : undefined}
                />
              )}
            </div>

            <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-sm font-semibold ${
                    isFuture ? 'text-slate-400' : 'text-slate-900'
                  }`}
                >
                  {isArabic ? step.labelAr : step.label}
                </span>
                {step.active && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {isArabic ? 'الخطوة الحالية' : 'Current'}
                  </span>
                )}
              </div>
              {step.date && (
                <p className={`text-xs ${isFuture ? 'text-slate-300' : 'text-slate-500'}`}>
                  {new Date(step.date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}