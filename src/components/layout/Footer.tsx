import { Facebook, MessageCircle, Mail, Phone } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const Footer = () => {
  const { isArabic, t } = useLanguage();
  return (
    <footer className="bg-secondary/40 border-t border-border py-6 sm:py-10 md:py-12 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-glow-pulse pointer-events-none" />
      <div className="container mx-auto relative z-10">
        {/* Mobile: Horizontal Layout */}
        <div className="block md:hidden" dir={isArabic ? "rtl" : "ltr"}>
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-primary text-xl">★</span>
            <h3 className="text-xl font-bold text-foreground">Lumos</h3>
          </div>

          {/* Quick Links - Horizontal */}
          <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
            <a href="#hero" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("الرئيسية", "Home")}</a>
            <a href="#services" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("الخدمات", "Services")}</a>
            <a href="#process" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("العملية", "Process")}</a>
            <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("الأسئلة", "FAQ")}</a>
            <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors text-sm">{t("تواصل", "Contact")}</a>
          </div>

          {/* Social & Contact - Horizontal */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="https://www.facebook.com/lumos.agency"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-sm"
              title="Facebook"
            >
              <Facebook size={16} />
            </a>
            <a
              href="https://wa.me/201279897482"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-[#25D366] transition-colors text-sm"
              title="WhatsApp"
            >
              <MessageCircle size={16} className="text-[#25D366]" />
            </a>
            <a
              href="tel:+201279897482"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-sm"
              title="Phone"
            >
              <Phone size={16} />
            </a>
            <a
              href="mailto:contact@getlumos.studio"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-sm"
              title="Email"
            >
              <Mail size={16} />
            </a>
          </div>
        </div>

        {/* Desktop: Grid Layout */}
        <div className="hidden md:grid md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8" dir={isArabic ? "rtl" : "ltr"}>
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="text-primary text-xl sm:text-2xl">★</span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">Lumos</h3>
            </div>
            <p className="text-muted-foreground mb-4 text-sm sm:text-base leading-relaxed">
              {t("شريكك في التحول الرقمي. نساعد الشركات من كل الأحجام على الظهور بقوة في العالم الرقمي.", "Your partner for digital transformation. We help businesses of all sizes shine in the digital world.")}
            </p>
            <div className="flex flex-row gap-3">
              <a
                href="https://www.facebook.com/lumos.agency"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors hover-lift text-sm"
                title="Facebook"
              >
                <Facebook size={18} />
                <span className="font-medium">Facebook</span>
              </a>
              <a
                href="https://wa.me/201279897482"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-[#25D366] transition-colors hover-lift text-sm"
                title="WhatsApp: +20 127 989 7482"
              >
                <MessageCircle size={18} className="text-[#25D366]" />
                <span className="font-medium">WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 sm:mb-4 text-base sm:text-lg">{t("روابط سريعة", "Quick Links")}</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <a
                  href="#hero"
                  className="text-muted-foreground hover:text-primary transition-colors link-underline text-sm sm:text-base"
                >
                  {t("الرئيسية", "Home")}
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  className="text-muted-foreground hover:text-primary transition-colors link-underline text-sm sm:text-base"
                >
                  {t("الخدمات", "Services")}
                </a>
              </li>
              <li>
                <a
                  href="#process"
                  className="text-muted-foreground hover:text-primary transition-colors link-underline text-sm sm:text-base"
                >
                  {t("العملية", "Process")}
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-muted-foreground hover:text-primary transition-colors link-underline text-sm sm:text-base"
                >
                  {t("الأسئلة", "FAQ")}
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="text-muted-foreground hover:text-primary transition-colors link-underline text-sm sm:text-base"
                >
                  {t("تواصل", "Contact")}
                </a>
              </li>
              <li>
                <a
                  href="/services/web-systems"
                  className="text-muted-foreground hover:text-primary transition-colors link-underline text-sm sm:text-base"
                >
                  {t("خدمة الويب", "Web Service")}
                </a>
              </li>
              <li>
                <a
                  href="/services/brand-identity"
                  className="text-muted-foreground hover:text-primary transition-colors link-underline text-sm sm:text-base"
                >
                  {t("خدمة الهوية", "Branding Service")}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 sm:mb-4 text-base sm:text-lg">{t("تواصل", "Contact")}</h4>
            <div className="flex flex-col gap-3">
              <a
                href="tel:+201279897482"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors hover-lift p-2.5 sm:p-3 rounded-lg sm:rounded-full bg-secondary/50 hover:bg-primary/10 text-sm sm:text-base"
                title="+20 127 989 7482"
              >
                <Phone size={18} className="sm:w-5 sm:h-5" />
                <span>+20 127 989 7482</span>
              </a>
              <a
                href="mailto:contact@getlumos.studio"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors hover-lift p-2.5 sm:p-3 rounded-lg sm:rounded-full bg-secondary/50 hover:bg-primary/10 text-sm sm:text-base"
                title="contact@getlumos.studio"
              >
                <Mail size={18} className="sm:w-5 sm:h-5" />
                <span className="truncate">contact@getlumos.studio</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4 sm:pt-8 text-center text-muted-foreground">
          <p className="text-xs sm:text-sm">{t(`© ${new Date().getFullYear()} وكالة Lumos. جميع الحقوق محفوظة.`, `© ${new Date().getFullYear()} Lumos Agency. All rights reserved.`)}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

