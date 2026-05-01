import { lazy, Suspense } from "react";
import { EnhancedNavbar, Footer } from "@/components/layout";
import TypewriterHero from "@/features/hero";
import TechStack from "@/features/tech-stack";
import AboutStats from "@/features/about";
import EnhancedServices from "@/features/services";
import EnhancedContact from "@/features/contact";
import FAQ from "@/features/faq";
import ProcessTimeline from "@/features/process";
import { useScrollReveal } from "@/hooks";

const LivePreviewToolLazy = lazy(() => import("@/features/live-preview"));

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

const Index = () => {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnhancedNavbar />
      <section className="scroll-section-optimized">
        <TypewriterHero />
      </section>

      <section id="live-preview">
        <Suspense fallback={<StudioFallback />}>
          <LivePreviewToolLazy />
        </Suspense>
      </section>

      <section className="scroll-section-optimized">
        <TechStack />
      </section>
      <section className="scroll-section-optimized">
        <AboutStats />
      </section>
      <section className="scroll-section-optimized">
        <EnhancedServices />
      </section>
      <section className="scroll-section-optimized">
        <EnhancedContact />
      </section>
      <section className="scroll-section-optimized">
        <FAQ />
      </section>
      <section className="scroll-section-optimized">
        <ProcessTimeline />
      </section>
      <Footer />
    </div>
  );
};

export default Index;
