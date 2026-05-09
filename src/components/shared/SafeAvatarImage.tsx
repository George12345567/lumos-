import { useMemo, useState, type ReactNode } from 'react';

const brokenAvatarUrls = new Set<string>();

interface SafeAvatarImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
}

export default function SafeAvatarImage({
  src,
  alt = '',
  className,
  fallback = null,
}: SafeAvatarImageProps) {
  const normalizedSrc = useMemo(() => src?.trim() || '', [src]);
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const isBroken = !normalizedSrc || brokenAvatarUrls.has(normalizedSrc) || brokenSrc === normalizedSrc;

  if (isBroken) return <>{fallback}</>;

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      onError={() => {
        brokenAvatarUrls.add(normalizedSrc);
        setBrokenSrc(normalizedSrc);
      }}
    />
  );
}
