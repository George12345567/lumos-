import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function SoftCard({
  children,
  className,
  as: Tag = 'div',
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
  style?: CSSProperties;
}) {
  return (
    <Tag
      className={cn(
        'rounded-3xl bg-white/80 backdrop-blur-sm border border-emerald-900/5',
        'shadow-[0_2px_24px_-12px_rgba(8,49,38,0.08)]',
        'dark:bg-slate-900/60 dark:border-white/5',
        className,
      )}
      style={style}
    >
      {children}
    </Tag>
  );
}

type BadgeTone =
  | 'mint'
  | 'teal'
  | 'amber'
  | 'rose'
  | 'slate'
  | 'sky'
  | 'violet'
  | 'emerald'
  | 'lime';

const TONE_CLASSES: Record<BadgeTone, string> = {
  mint: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  lime: 'bg-lime-50 text-lime-700 ring-lime-100',
};

export function SoftBadge({
  children,
  tone = 'slate',
  icon: Icon,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[11px] font-semibold ring-1 ring-inset',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {Icon ? <Icon className="w-3 h-3" /> : null}
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  delta,
  tone = 'mint',
  icon: Icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
}) {
  const accent = TONE_CLASSES[tone].split(' ').slice(0, 2).join(' ');
  return (
    <SoftCard className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        {Icon ? (
          <span className={cn('w-8 h-8 rounded-2xl flex items-center justify-center', accent)}>
            <Icon className="w-4 h-4" />
          </span>
        ) : null}
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      {delta ? <p className="text-xs text-slate-500 dark:text-slate-400">{delta}</p> : null}
    </SoftCard>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <SoftCard className="p-10 flex flex-col items-center text-center gap-3">
      {Icon ? (
        <span className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </span>
      ) : null}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">{description}</p>
      {action}
    </SoftCard>
  );
}

export function SoftButton({
  children,
  variant = 'ghost',
  size = 'md',
  onClick,
  disabled,
  type = 'button',
  className,
  title,
}: {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'soft' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  title?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  } as const;
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
    ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5',
    soft: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-1 ring-emerald-100',
    danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100 ring-1 ring-rose-100',
    outline: 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5',
  } as const;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(base, sizes[size], variants[variant], className)}
    >
      {children}
    </button>
  );
}
