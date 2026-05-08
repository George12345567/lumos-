import { motion } from 'framer-motion';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import type { StatusHistoryEntry } from '@/types/dashboard';
import {
  normalizeRequestStatus,
  requestStatusIndex,
  requestStatusLabel,
  REQUEST_STATUS_FLOW,
} from './requestStatus';

type RequestStatusTimelineProps = {
  status?: string | null;
  status_history?: StatusHistoryEntry[] | null;
  mode?: 'compact' | 'full';
  animated?: boolean;
  className?: string;
};

export function RequestStatusTimeline({
  status,
  status_history,
  mode = 'full',
  animated = true,
  className,
}: RequestStatusTimelineProps) {
  const { isArabic } = useLanguage();
  const normalized = normalizeRequestStatus(status);
  const exceptional = normalized === 'cancelled' || normalized === 'rejected';
  const currentIndex = requestStatusIndex(normalized);
  const latestHistory = status_history?.[status_history.length - 1];

  if (exceptional) {
    const isCancelled = normalized === 'cancelled';
    return (
      <section className={cn('rounded-lg border bg-white p-4', isCancelled ? 'border-slate-200' : 'border-rose-200', className)}>
        <div className="flex items-start gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', isCancelled ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-700')}>
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className={cn('text-sm font-black', isCancelled ? 'text-slate-900' : 'text-rose-900')}>
              {requestStatusLabel(normalized, isArabic)}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {isCancelled
                ? (isArabic ? 'تم إلغاء الطلب والاحتفاظ بسجله.' : 'This request was cancelled and kept in history.')
                : (isArabic ? 'تم إيقاف مسار الطلب. تواصل مع Lumos للتفاصيل.' : 'This request path has stopped. Contact Lumos for details.')}
            </p>
            {latestHistory?.note ? <p className="mt-2 text-xs font-semibold text-slate-600">{latestHistory.note}</p> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('rounded-lg border border-emerald-900/10 bg-white p-4', className)}>
      <div className="hidden items-start md:flex">
        {REQUEST_STATUS_FLOW.map((step, index) => {
          const complete = index < currentIndex;
          const current = index === currentIndex;
          return (
            <div key={step.key} className="flex flex-1 items-start">
              <div className="flex flex-1 flex-col items-center text-center">
                <motion.div
                  initial={animated && current ? { scale: 0.85, opacity: 0.7 } : false}
                  animate={animated && current ? { scale: [1, 1.08, 1], opacity: 1 } : undefined}
                  transition={{ duration: 1.8, repeat: animated && current ? Infinity : 0 }}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white',
                    complete && 'border-emerald-500 bg-emerald-500 text-white',
                    current && 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-[0_0_0_6px_rgba(16,185,129,0.10)]',
                    !complete && !current && 'border-slate-200 text-slate-300',
                  )}
                >
                  {complete ? <CheckCircle2 className="h-5 w-5" /> : current ? <Circle className="h-4 w-4 fill-current" /> : <Circle className="h-4 w-4" />}
                </motion.div>
                <p className={cn('mt-2 text-xs font-black', current || complete ? 'text-slate-900' : 'text-slate-400')}>
                  {isArabic ? step.ar : step.en}
                </p>
              </div>
              {index < REQUEST_STATUS_FLOW.length - 1 ? (
                <div className={cn('mt-5 h-0.5 flex-1 rounded-full', index < currentIndex ? 'bg-emerald-500' : 'bg-slate-200')} />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-0 md:hidden">
        {REQUEST_STATUS_FLOW.map((step, index) => {
          const complete = index < currentIndex;
          const current = index === currentIndex;
          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white',
                    complete && 'border-emerald-500 bg-emerald-500 text-white',
                    current && 'border-emerald-500 bg-emerald-50 text-emerald-700',
                    !complete && !current && 'border-slate-200 text-slate-300',
                  )}
                >
                  {complete ? <CheckCircle2 className="h-4 w-4" /> : <Circle className={cn('h-3.5 w-3.5', current && 'fill-current')} />}
                </div>
                {index < REQUEST_STATUS_FLOW.length - 1 ? <div className={cn('h-8 w-0.5', index < currentIndex ? 'bg-emerald-500' : 'bg-slate-200')} /> : null}
              </div>
              <div className="pt-1">
                <p className={cn('text-sm font-bold', current || complete ? 'text-slate-900' : 'text-slate-400')}>
                  {isArabic ? step.ar : step.en}
                </p>
                {mode === 'full' && current ? (
                  <p className="mt-1 text-xs text-emerald-700">
                    {isArabic ? 'المرحلة الحالية' : 'Current step'}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
