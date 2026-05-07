import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { EnhancedNavbar, Footer } from "@/components/layout";
import { useLanguage } from "@/context/LanguageContext";

interface LegalPageLayoutProps {
  /** Translated page title — pass the localized string already resolved. */
  title: string;
  /** Last-updated date string, shown to the user. */
  lastUpdated: string;
  children: React.ReactNode;
}

/**
 * Shared shell for /privacy-policy, /terms-and-conditions, /cookie-policy.
 * Reuses the marketing nav + footer and the existing glass-card styling so
 * legal pages match the rest of the site without redesign.
 */
export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  const { isArabic, t } = useLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
      <EnhancedNavbar />

      <section className="relative pt-24 sm:pt-28 pb-6 sm:pb-10 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-[hsl(150,100%,40%)]/8 blur-[100px] animate-orb" />
          <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#00bcd4]/6 blur-[80px] animate-orb-delayed" />
        </div>

        <div className="container mx-auto max-w-3xl relative z-10 text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase shadow-[0_0_12px_rgba(0,188,212,0.1)] mb-4">
            {t("معلومات قانونية", "LEGAL")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">{title}</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-3">
            {t("آخر تحديث", "Last updated")}: {lastUpdated}
          </p>
          <div className="mt-6 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent shimmer-line" />
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20">
        <div className="container mx-auto max-w-3xl">
          <article
            className="glass-card rounded-2xl glow-border-hover p-6 sm:p-8 leading-relaxed text-sm sm:text-base text-foreground/90 [&>section]:mt-6 first:[&>section]:mt-0 [&_h2]:text-lg [&_h2]:sm:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mb-2 [&_p]:text-muted-foreground [&_p]:leading-7 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:rtl:pr-5 [&_ul]:rtl:pl-0 [&_ul]:text-muted-foreground [&_ul]:space-y-1.5 [&_ul]:mb-3 [&_a]:text-primary [&_a]:hover:underline [&_strong]:text-foreground"
            dir={isArabic ? "rtl" : "ltr"}
          >
            {children}
          </article>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">
              {t("سياسة الخصوصية", "Privacy Policy")}
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/terms-and-conditions" className="text-muted-foreground hover:text-primary transition-colors">
              {t("الشروط والأحكام", "Terms & Conditions")}
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/cookie-policy" className="text-muted-foreground hover:text-primary transition-colors">
              {t("سياسة الكوكيز", "Cookie Policy")}
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary/80 hover:text-primary transition-colors"
            >
              {isArabic ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              {t("العودة للصفحة الرئيسية", "Back to home")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
