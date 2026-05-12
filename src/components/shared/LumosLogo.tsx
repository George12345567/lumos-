import { cn } from '@/lib/utils';

const LUMOS_LOGO_SRC = '/brand/lumos-logo.png';

type LumosLogoSize = 'sm' | 'md' | 'lg' | 'xl';
type LumosLogoVariant = 'default' | 'nav' | 'badge' | 'hero' | 'iconOnly';

interface LumosLogoProps {
  size?: LumosLogoSize;
  variant?: LumosLogoVariant;
  showText?: boolean;
  className?: string;
}

const imageSizes: Record<LumosLogoSize, { width: number; height: number; className: string }> = {
  sm: { width: 30, height: 28, className: 'h-7 w-auto' },
  md: { width: 38, height: 36, className: 'h-9 w-auto' },
  lg: { width: 51, height: 48, className: 'h-12 w-auto' },
  xl: { width: 85, height: 80, className: 'h-16 w-auto sm:h-20' },
};

const wordmarkSizes: Record<LumosLogoSize, string> = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-4xl',
};

export default function LumosLogo({
  size = 'md',
  variant = 'default',
  showText = false,
  className,
}: LumosLogoProps) {
  const image = imageSizes[size];
  const isLogoOnly = variant === 'iconOnly' || variant === 'badge';

  return (
    <span
      className={cn(
        'lumos-logo inline-flex shrink-0 items-center gap-2.5',
        variant === 'hero' && 'flex-col text-center',
        className,
      )}
    >
      <img
        src={LUMOS_LOGO_SRC}
        alt="Lumos"
        width={image.width}
        height={image.height}
        loading={variant === 'nav' ? 'eager' : 'lazy'}
        decoding="async"
        className={cn('block object-contain', image.className)}
      />
      {showText && !isLogoOnly ? (
        <span className="min-w-0 leading-none">
          <span className={cn('block font-bold tracking-tight text-foreground', wordmarkSizes[size])}>Lumos</span>
          {variant === 'hero' ? (
            <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Digital Ascent</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
