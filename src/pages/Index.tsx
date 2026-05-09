import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { EnhancedNavbar, Footer } from "@/components/layout";
import TypewriterHero from "@/features/hero";
import { useScrollReveal } from "@/hooks";

const LivePreviewToolLazy = lazy(() => import("@/features/live-preview"));
const TechStackLazy = lazy(() => import("@/features/tech-stack"));
const AboutStatsLazy = lazy(() => import("@/features/about"));
const EnhancedServicesLazy = lazy(() => import("@/features/services"));
const EnhancedContactLazy = lazy(() => import("@/features/contact"));
const FAQLazy = lazy(() => import("@/features/faq"));
const ProcessTimelineLazy = lazy(() => import("@/features/process"));
const TeamModalLazy = lazy(() => import("@/features/team/TeamModal"));

function StudioFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="rounded-3xl border border-border/70 bg-card/50 p-6 sm:p-8 animate-pulse">
        <div className="h-6 w-48 rounded bg-muted/60 mb-4" />
        <div className="h-4 w-72 rounded bg-muted/50 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 rounded-2xl bg-muted/50" />
          <div className="h-64 rounded-2xl bg-muted/50" />
          <div className="h-64 rounded-2xl bg-muted/50" />
        </div>
      </div>
    </div>
  );
}

function SectionFallback() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border/60 bg-card/45 p-6 shadow-sm animate-pulse">
        <div className="mx-auto mb-4 h-4 w-32 rounded-full bg-muted/60" />
        <div className="mx-auto mb-8 h-8 w-64 max-w-full rounded bg-muted/50" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-xl bg-muted/45" />
          <div className="h-28 rounded-xl bg-muted/45" />
          <div className="h-28 rounded-xl bg-muted/45" />
        </div>
      </div>
    </div>
  );
}

function LazySection({ id, children }: { id?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "520px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section id={id} ref={ref} className="scroll-section-optimized">
      {shouldRender ? <Suspense fallback={<SectionFallback />}>{children}</Suspense> : <SectionFallback />}
    </section>
  );
}

const Index = () => {
  useScrollReveal();
  const [teamOpen, setTeamOpen] = useState(false);
  const openTeamModal = () => setTeamOpen(true);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnhancedNavbar />
      <section className="scroll-section-optimized">
        <TypewriterHero onOpenTeam={openTeamModal} />
      </section>

      <LazySection id="live-preview">
        <Suspense fallback={<StudioFallback />}>
          <LivePreviewToolLazy />
        </Suspense>
      </LazySection>
      <LazySection id="core-expertise">
        <TechStackLazy />
      </LazySection>
      <LazySection id="about">
        <AboutStatsLazy />
      </LazySection>
      <LazySection id="services">
        <EnhancedServicesLazy />
      </LazySection>
      <LazySection id="contact">
        <EnhancedContactLazy />
      </LazySection>
      <LazySection id="faq">
        <FAQLazy />
      </LazySection>
      <LazySection id="process">
        <ProcessTimelineLazy />
      </LazySection>
      <Footer onOpenTeam={openTeamModal} />
      {teamOpen && (
        <Suspense fallback={null}>
          <TeamModalLazy open={teamOpen} onClose={() => setTeamOpen(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default Index;
