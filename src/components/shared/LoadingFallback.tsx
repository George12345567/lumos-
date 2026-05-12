import LumosLogo from './LumosLogo';

const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <LumosLogo variant="iconOnly" size="lg" className="mx-auto mb-4" />
      <div className="mx-auto mb-6 h-6 w-6 rounded-full border-2 border-primary/60 border-t-transparent animate-spin" />
      <p className="text-muted-foreground text-sm font-medium animate-pulse">Loading...</p>
    </div>
  </div>
);

export default LoadingFallback;
