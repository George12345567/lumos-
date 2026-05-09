import { Facebook, Mail, MessageCircle, Phone, Star, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";

type FooterProps = {
  onOpenTeam?: () => void;
};

const Footer = ({ onOpenTeam }: FooterProps) => {
  const { isArabic, t } = useLanguage();

  const navigation = [
    { label: t("الرئيسية", "Home"), href: "#hero" },
    { label: t("المعاينة", "Preview"), href: "#live-preview" },
    { label: t("الخدمات", "Services"), href: "#services" },
    { label: t("الأسئلة", "FAQ"), href: "#faq" },
    { label: t("تواصل", "Contact"), href: "#contact" },
  ];

  const services = [
    { label: t("تطوير الويب", "Websites"), href: "/services/web-systems" },
    { label: t("هوية بصرية", "Brand Identity"), href: "/services/brand-identity" },
    { label: t("سوشيال ميديا", "Content"), href: "/services/social-growth" },
    { label: t("النمو والتحويل", "Growth"), href: "#services" },
  ];

  return (
    <>
      <footer className="relative overflow-hidden border-t border-border bg-secondary/35 px-4 py-10 sm:px-6 sm:py-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />

        <div className="container mx-auto max-w-7xl" dir={isArabic ? "rtl" : "ltr"}>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Star className="h-4 w-4 fill-current" />
                </span>
                <h3 className="text-2xl font-bold text-foreground">Lumos</h3>
              </div>
              <p className="max-w-sm text-sm leading-7 text-muted-foreground">
                {t(
                  "شريكك في بناء هوية واضحة، مواقع عالية التحويل، وحضور رقمي يدعم نمو أعمالك.",
                  "Your partner for clear identity, high-converting websites, and digital presence that supports business growth."
                )}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a
                  href="https://www.facebook.com/lumos.agency"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href="https://wa.me/201279897482"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-[#25D366] transition-colors hover:border-[#25D366]/40"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href="tel:+201279897482"
                  aria-label="Phone"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
                >
                  <Phone className="h-4 w-4" />
                </a>
                <a
                  href="mailto:contact@getlumos.studio"
                  aria-label="Email"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
                >
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            <nav aria-label={t("التنقل", "Navigation")}>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-foreground">
                {t("التنقل", "Navigation")}
              </h4>
              <ul className="space-y-3">
                {navigation.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {item.label}
                    </a>
                  </li>
                ))}
                <li className="pt-1">
                  <button
                    type="button"
                    onClick={onOpenTeam}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    <Users className="h-3.5 w-3.5" />
                    {t("تعرف على الفريق", "Meet the Team")}
                  </button>
                </li>
              </ul>
            </nav>

            <nav aria-label={t("الخدمات", "Services")}>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-foreground">
                {t("الخدمات", "Services")}
              </h4>
              <ul className="space-y-3">
                {services.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-foreground">
                {t("تواصل", "Contact")}
              </h4>
              <div className="space-y-3">
                <a
                  href="tel:+201279897482"
                  className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-3 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  <span dir="ltr">+20 127 989 7482</span>
                </a>
                <a
                  href="mailto:contact@getlumos.studio"
                  className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-3 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">contact@getlumos.studio</span>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>
              {t(
                `© ${new Date().getFullYear()} وكالة Lumos. جميع الحقوق محفوظة.`,
                `© ${new Date().getFullYear()} Lumos Agency. All rights reserved.`
              )}
            </p>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label={t("روابط قانونية", "Legal links")}>
              <Link to="/privacy-policy" className="transition-colors hover:text-primary">
                {t("سياسة الخصوصية", "Privacy Policy")}
              </Link>
              <Link to="/terms-and-conditions" className="transition-colors hover:text-primary">
                {t("الشروط", "Terms")}
              </Link>
              <Link to="/cookie-policy" className="transition-colors hover:text-primary">
                {t("سياسة الكوكيز", "Cookie Policy")}
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
