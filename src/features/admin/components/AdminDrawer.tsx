import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  badge,
  children,
  footer,
  width = 'lg',
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg' | 'xl';
}) {
  const widths = {
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-3xl',
  } as const;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'p-0 flex flex-col bg-[#f7faf7] dark:bg-slate-950 border-l border-emerald-900/5 dark:border-white/5',
          widths[width],
        )}
      >
        {/*
          Radix requires a DialogTitle (and ideally a DialogDescription) on
          every DialogContent for accessibility. We render a *visible* title
          via the SheetTitle primitive — which gives Radix the aria binding
          it expects — and a screen-reader-only description.
        */}
        <header className="px-6 py-5 border-b border-emerald-900/5 dark:border-white/5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <SheetTitle className="text-lg font-bold tracking-tight text-foreground truncate">
                {title}
              </SheetTitle>
              {badge}
            </div>
            {subtitle ? (
              <SheetDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </SheetDescription>
            ) : (
              <SheetDescription className="sr-only">
                {title}
              </SheetDescription>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-muted-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <footer className="px-6 py-4 border-t border-emerald-900/5 dark:border-white/5 bg-card/50 flex items-center justify-end gap-2">
            {footer}
          </footer>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
