import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedClientBadgeProps {
  label?: string | null;
  compact?: boolean;
  className?: string;
}

export default function VerifiedClientBadge({
  label,
  compact = false,
  className,
}: VerifiedClientBadgeProps) {
  const tooltip = label?.trim() || 'Verified Lumos Client';

  return (
    <span
      role="img"
      tabIndex={0}
      title={tooltip}
      aria-label={tooltip}
      className={cn(
        'lumos-verified-social group relative inline-flex shrink-0 items-center justify-center align-middle outline-none',
        compact ? 'h-4 w-4' : 'h-5 w-5 sm:h-[22px] sm:w-[22px]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 rounded-full bg-emerald-400/25 blur-[5px] opacity-70 transition-opacity group-hover:opacity-90',
          compact && 'blur-[4px]',
        )}
      />
      <span
        aria-hidden="true"
        className="relative flex h-full w-full items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white shadow-[0_2px_10px_rgba(16,185,129,0.32)] transition-transform duration-150 group-hover:scale-105 group-focus-visible:scale-105 group-focus-visible:ring-emerald-200 dark:ring-slate-950"
      >
        <Check className={cn('stroke-[3.4]', compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5')} />
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-lg group-hover:block group-focus-visible:block"
      >
        {tooltip}
      </span>
    </span>
  );
}
