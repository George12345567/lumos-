/**
* ═══════════════════════════════════════════════════════════════════
* EnhancedNavbar.tsx — PREMIUM TOP BAR + FLOATING DOCK
* ═══════════════════════════════════════════════════════════════════
*
* Architecture:
* ┌─────────────────────────────────────────────────┐
* │  TOP BAR (fixed top)                            │
* │  Logo · Section pills (desktop) · CTA           │
* └─────────────────────────────────────────────────┘
*                      ...page...
* ┌─────────────────────────────────────────────────┐
* │  FLOATING DOCK (fixed bottom center, portal)    │
* │  Home · Dashboard · Profile · Pricing · SignOut  │
* └─────────────────────────────────────────────────┘
*
* The top bar handles branding + section navigation.
* The floating dock handles auth actions (Dashboard, Profile,
* Sign Out) via portal — completely immune to z-index bugs.
*
* ═══════════════════════════════════════════════════════════════════
*/

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Briefcase,
  ChevronDown,
  DollarSign,
  Eye,
  HelpCircle,
  Home,
  Languages,
  LogOut,
  MessageSquare,
  Moon,
  Settings,
  Sparkles,
  Sun,
  UserCircle,
  X,
} from "lucide-react";
import PricingModal from "@/components/pricing/PricingModal";
import FloatingDock from "@/components/layout/FloatingDock";
import { useAuthActions, useAuthState } from "@/context/AuthContext";
import { useAppearance } from "@/context/AppearanceContext";
import { profileService } from "@/services/profileService";
import type { PricingRequest } from "@/types/dashboard";
import { useLanguage } from "@/context/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EnhancedNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollIntensity, setScrollIntensity] = useState(0);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingDraft, setPricingDraft] = useState<PricingRequest | null>(null);
  const [showGetStartedMenu, setShowGetStartedMenu] = useState(false);
  const [showNavGuide, setShowNavGuide] = useState(false);
  const [guideStep, setGuideStep] = useState<0 | 1 | 2>(0);
  const [activeSection, setActiveSection] = useState("hero");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [clientAvatarUrl, setClientAvatarUrl] = useState<string | null>(null);
  const [clientDisplayName, setClientDisplayName] = useState<string>("");
  const lastScrollY = useRef(0);
  const getStartedRef = useRef<HTMLDivElement>(null);
  const navGuideRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAdmin, client } = useAuthState();
  const { logout } = useAuthActions();
  const { theme, toggleTheme } = useAppearance();
  const { isArabic, t, toggleLanguage } = useLanguage();

  const openPricingModal = useCallback((request: PricingRequest | null = null) => {
    setPricingDraft(request);
    setPricingOpen(true);
  }, []);

  const handlePricingOpenChange = useCallback((nextOpen: boolean) => {
    setPricingOpen(nextOpen);
    if (!nextOpen) {
      setPricingDraft(null);
    }
  }, []);

  // Navigation items — ordered to match actual page section flow
  const navItems = useMemo(() => [
    { id: "hero", label: t("الرئيسية", "Home"), desc: t("ارجع إلى مقدمة الموقع والملخص السريع.", "Jump to the hero and main overview."), icon: Home },
    { id: "live-preview", label: t("المعاينة", "Preview"), desc: t("افتح قسم الاستوديو والمعاينة الحية.", "Open the live design studio section."), icon: Eye },
    { id: "services", label: t("الخدمات", "Services"), desc: t("شاهد ما الذي يمكن أن يبنيه Lumos لعملك.", "See what Lumos can build for you."), icon: Briefcase },
    { id: "contact", label: t("تواصل", "Contact"), desc: t("اذهب مباشرة إلى نموذج الطلب والتواصل.", "Go directly to the inquiry form."), icon: MessageSquare },
    { id: "faq", label: t("الأسئلة", "FAQ"), desc: t("اقرأ الإجابات السريعة قبل التواصل مع الفريق.", "Read quick answers before contacting the team."), icon: HelpCircle },
  ], [t]);

  const homeNavigationGuide = useMemo(() => ([
    {
      group: t("شريط التنقل العلوي", "Top Navigation"), items: [
        { label: t("الرئيسية", "Home"), desc: t("يعيدك إلى أعلى الصفحة والقيمة الأساسية للخدمة.", "Returns to the top hero section and the main value proposition.") },
        { label: t("المعاينة", "Preview"), desc: t("ينقلك إلى قسم المعاينة الحية واستوديو التصميم.", "Takes you to the Live Preview / Design Studio area.") },
        { label: t("الخدمات", "Services"), desc: t("يعرض فئات الخدمات وما وظيفة كل واحدة منها.", "Shows the service categories and what each one is for.") },
        { label: t("تواصل", "Contact"), desc: t("ينقلك إلى نموذج التواصل لإرسال طلب مباشر.", "Moves you to the contact form to send a direct request.") },
        { label: t("الأسئلة", "FAQ"), desc: t("يفتح قسم الأسئلة الشائعة للحصول على إجابات سريعة.", "Opens the common questions section for quick self-service answers.") },
        { label: t("الأسعار", "Pricing"), desc: t("يفتح نافذة التسعير لتكوين باقة أو إرسال طلب سعر.", "Opens the pricing modal so you can build a package or request a quote.") },
        { label: t("إنشاء حساب", "Sign Up"), desc: t("ينشئ حساب عميل لمتابعة الطلبات والتقدم والمشاريع.", "Creates a client account so requests, pricing, and progress can be tracked.") },
        { label: t("ابدأ الآن", "Get Started"), desc: t("يعرض أسرع طريقتين للبدء: التسعير أو نموذج التواصل.", "Shows the fastest starting actions: pricing or direct contact form.") },
      ]
    },
    {
      group: t("الدوك السفلي", "Floating Dock"), items: [
        { label: t("خطط الأسعار", "Pricing Plans"), desc: t("اختصار سريع إلى الباقات وطلبات التسعير المخصصة.", "Fast shortcut to package pricing and custom quote requests.") },
        { label: t("مساعد الذكاء", "AI Guide"), desc: t("يفتح Lumos AI ليشرح أفضل خطوة تالية حسب هدفك.", "Opens Lumos AI to explain the best next step based on your goal.") },
        { label: t("الدخول / البوابة", "Login / Portal"), desc: t("ينقل العملاء الحاليين إلى تسجيل الدخول أو البوابة الخاصة بهم.", "Takes returning clients to login or their portal and dashboard.") },
        { label: t("إنشاء حساب", "Create Account"), desc: t("يبدأ رحلة التسجيل للعملاء الجدد الذين يريدون متابعة واضحة.", "Starts the signup flow for new clients who want tracked access.") },
        { label: t("قائمة البدء", "Start Menu"), desc: t("قائمة مختصرة تفتح التسعير أو تنقلك إلى نموذج التواصل.", "Small shortcut menu that opens pricing or jumps to the contact form.") },
      ]
    },
  ]), [t]);

  // Listen for pricing-open event dispatched by the FloatingDock
  useEffect(() => {
    const handlePricingEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ request?: PricingRequest | null }>;
      openPricingModal(customEvent.detail?.request || null);
    };
    window.addEventListener("lumos:open-pricing", handlePricingEvent as EventListener);
    return () => window.removeEventListener("lumos:open-pricing", handlePricingEvent as EventListener);
  }, [openPricingModal]);

  // Close Get Started menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showGetStartedMenu && getStartedRef.current && !getStartedRef.current.contains(event.target as Node)) {
        setShowGetStartedMenu(false);
      }

      if (showNavGuide && navGuideRef.current && !navGuideRef.current.contains(event.target as Node)) {
        setShowNavGuide(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showGetStartedMenu, showNavGuide]);

  // Guide: after 30 seconds, show Pricing hint, then Signup hint
  useEffect(() => {
    if (location.pathname !== "/") return;
    if (sessionStorage.getItem("lumos_nav_guide_seen") === "1") return;

    const id = setTimeout(() => {
      setGuideStep(1);
    }, 30000);

    return () => clearTimeout(id);
  }, [location.pathname]);

  useEffect(() => {
    if (guideStep !== 1) return;
    const id = setTimeout(() => {
      if (!isAuthenticated) {
        setGuideStep(2);
      } else {
        setGuideStep(0);
        sessionStorage.setItem("lumos_nav_guide_seen", "1");
      }
    }, 4500);
    return () => clearTimeout(id);
  }, [guideStep, isAuthenticated]);

  useEffect(() => {
    if (guideStep !== 2) return;
    const id = setTimeout(() => {
      setGuideStep(0);
      sessionStorage.setItem("lumos_nav_guide_seen", "1");
    }, 4500);
    return () => clearTimeout(id);
  }, [guideStep]);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated || !client || isAdmin) {
      setClientAvatarUrl(null);
      setClientDisplayName("");
      return;
    }

    setClientDisplayName(client.display_name || client.company_name || client.username);

    const loadClientAvatar = async () => {
      const profile = await profileService.getProfile(client.id);
      if (cancelled) return;
      const avatarUrl = await profileService.getAvatarUrl(profile?.avatar_url || client.avatar_url);
      if (!cancelled) setClientAvatarUrl(avatarUrl);
      if (profile?.display_name?.trim()) {
        setClientDisplayName(profile.display_name);
      }
    };

    void loadClientAvatar();

    return () => {
      cancelled = true;
    };
  }, [client, isAdmin, isAuthenticated]);

  // Scroll tracking: progress + direction-based hide/show
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

      setScrollProgress(progress);
      setIsScrolled(scrollTop > 30);
      setScrollIntensity(Math.min(1, scrollTop / 400));

      if (scrollTop > 300) {
        setIsHidden(scrollTop > lastScrollY.current && scrollTop - lastScrollY.current > 5);
      } else {
        setIsHidden(false);
      }
      lastScrollY.current = scrollTop;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Active section tracking with IntersectionObserver
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -80% 0px",
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    navItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [navItems]);

  const scrollToSection = useCallback((id: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      const tryScroll = (attempts: number) => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (attempts > 0) {
          setTimeout(() => tryScroll(attempts - 1), 200);
        }
      };
      setTimeout(() => tryScroll(5), 300);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [location.pathname, navigate]);

  const handleClientSignOut = useCallback(async () => {
    await logout();
    navigate("/client-login", { replace: true });
  }, [logout, navigate]);

  // SVG circle progress for logo ring
  const circumference = 2 * Math.PI * 14;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <>
      {/* ════════════════════════════════════════════════════ */}
      {/* ── TOP BAR ──────────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${isHidden ? "-translate-y-full" : "translate-y-0"
          }`}
      >
        <div className={`transition-all duration-700 ${isScrolled ? "pt-2.5 px-4 lg:px-8" : "pt-0 px-0"
          }`}>
          <div className={`relative transition-all duration-700 ${isScrolled ? "rounded-2xl mx-auto max-w-6xl" : ""
            }`}>
            {/* Animated gradient border (visible only when scrolled) */}
            {isScrolled && (
              <div className="absolute -inset-[1px] rounded-2xl overflow-hidden pointer-events-none">
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: `linear-gradient(${135 + scrollProgress * 3.6}deg, hsla(150,100%,40%,${0.12 + scrollIntensity * 0.15}), hsla(160,70%,18%,${0.06 + scrollIntensity * 0.08}), transparent 40%, transparent 60%, rgba(139,92,246,${0.06 + scrollIntensity * 0.08}), hsla(150,100%,40%,${0.12 + scrollIntensity * 0.15}))`,
                  }}
                />
                <div className="absolute inset-0 rounded-2xl navbar-shimmer" />
              </div>
            )}

            {/* Neon underglow */}
            {isScrolled && (
              <div
                className="absolute -bottom-2 left-[10%] right-[10%] h-8 rounded-full blur-xl pointer-events-none transition-opacity duration-700"
                style={{
                  background: `radial-gradient(ellipse, hsla(150,100%,40%,${0.06 + scrollIntensity * 0.1}) 0%, transparent 70%)`,
                  opacity: scrollIntensity,
                }}
              />
            )}

            {/* Glass surface */}
            <div
              className={`relative transition-all duration-700 ${isScrolled
                ? "bg-background/85 backdrop-blur-2xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
                : "bg-background/50 backdrop-blur-xl border-b border-border/50"
                }`}
              style={isScrolled ? {
                backdropFilter: `blur(${20 + scrollIntensity * 12}px) saturate(${1.2 + scrollIntensity * 0.6})`,
              } : undefined}
            >
              <div className="container mx-auto px-5 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 sm:h-[68px]">

                  {/* ── Logo with scroll progress ring ── */}
                  <div
                    className="flex items-center gap-2.5 cursor-pointer group"
                    onClick={() => scrollToSection("hero")}
                  >
                    <div className="relative w-9 h-9 flex items-center justify-center">
                      <svg className="absolute inset-0 -rotate-90" width="36" height="36" viewBox="0 0 36 36">
                        <circle
                          cx="18" cy="18" r="14"
                          fill="none"
                          stroke="hsla(150,100%,40%,0.08)"
                          strokeWidth="2"
                        />
                        <circle
                          cx="18" cy="18" r="14"
                          fill="none"
                          stroke="url(#progressGradient)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300"
                        />
                        <defs>
                          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#64ffda" />
                            <stop offset="100%" stopColor="#00bcd4" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="text-[hsl(150,100%,40%)] text-lg font-bold transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_6px_hsla(150,100%,40%,0.6)]">
                        ★
                      </span>
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent transition-all duration-300 group-hover:from-[hsl(150,100%,40%)] group-hover:to-[hsl(160,70%,18%)]">
                      Lumos
                    </span>
                  </div>

                  {/* ── Desktop Navigation Pills (section scroll) ── */}
                  <div className="hidden lg:flex items-center">
                    <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
                      {navItems.map((item) => {
                        const isActive = activeSection === item.id;
                        const isHovered = hoveredItem === item.id;

                        return (
                          <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id)}
                            onMouseEnter={() => setHoveredItem(item.id)}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${isActive
                              ? "text-background"
                              : "text-white/50 hover:text-white/90"
                              }`}
                          >
                            {isActive && (
                              <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-[hsl(150,100%,40%)] to-[hsl(160,70%,18%)] shadow-[0_0_16px_hsla(150,100%,40%,0.3)]" />
                            )}
                            {!isActive && isHovered && (
                              <span className="absolute inset-0 rounded-lg bg-white/[0.06] transition-opacity duration-300" />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                              {item.label}
                              {isHovered && !isActive && <span className="text-[10px] font-semibold text-white/45">{item.desc}</span>}
                            </span>
                          </button>
                        );
                      })}

                      {/* Pricing button inside pill bar */}
                      <button
                        onClick={() => openPricingModal()}
                        onMouseEnter={() => setHoveredItem("pricing")}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`relative px-4 py-2 text-sm font-medium text-white/50 hover:text-white/90 rounded-lg transition-all duration-300 ${guideStep === 1 ? "ring-2 ring-cyan-300/80 bg-cyan-300/10" : ""}`}
                      >
                        {hoveredItem === "pricing" && (
                          <span className="absolute inset-0 rounded-lg bg-white/[0.06] transition-opacity duration-300" />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5" />
                          {t("الأسعار", "Pricing")}
                        </span>
                        {guideStep === 1 && (
                          <span className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-cyan-300/50 bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-cyan-200 shadow-xl z-50">
                            {t("ابدأ من هنا: افتح خطط الأسعار", "Start here: open Pricing plans")}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ── Right side: Get Started CTA ── */}
                  <div className="flex items-center gap-2" ref={getStartedRef}>
                    {/* "How To Use" navigation guide is intentionally not rendered. */}

                    {isAuthenticated && client && !isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="group inline-flex h-10 max-w-[188px] items-center gap-2 rounded-full border border-border/70 bg-card/55 py-1 pl-1.5 pr-2.5 text-foreground shadow-[0_10px_28px_rgba(2,6,23,0.08)] backdrop-blur-xl transition-all duration-300 hover:border-border hover:bg-card/80 hover:shadow-[0_14px_32px_rgba(2,6,23,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                            aria-label={t("افتح قائمة الحساب", "Open account menu")}
                            title={t("افتح قائمة الحساب", "Open account menu")}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background/80 ring-1 ring-black/5 dark:border-white/10 dark:bg-white/10">
                              {clientAvatarUrl ? (
                                <img src={clientAvatarUrl} alt={clientDisplayName || client.username} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold uppercase text-[hsl(150,100%,40%)]">
                                  {(clientDisplayName || client.username || "LC").slice(0, 2)}
                                </span>
                              )}
                            </span>
                            <span className="hidden min-w-0 max-w-[108px] truncate text-xs font-semibold text-foreground md:inline">
                              {clientDisplayName || client.username}
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          sideOffset={10}
                          className="z-[80] w-64 rounded-2xl border border-border bg-card/95 p-2 text-card-foreground shadow-[0_24px_60px_rgba(2,6,23,0.18)] backdrop-blur-xl dark:bg-slate-950/95"
                        >
                          <DropdownMenuLabel className="p-2">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
                                {clientAvatarUrl ? (
                                  <img src={clientAvatarUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-xs font-bold uppercase text-[hsl(150,100%,40%)]">
                                    {(clientDisplayName || client.username || "LC").slice(0, 2)}
                                  </span>
                                )}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-card-foreground">
                                  {clientDisplayName || client.username}
                                </span>
                                <span className="block truncate text-xs font-normal text-muted-foreground">
                                  @{client.username}
                                </span>
                              </span>
                            </div>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="my-1 bg-border" />
                          <DropdownMenuItem
                            onSelect={() => navigate("/profile")}
                            className="cursor-pointer rounded-xl px-3 py-2.5 text-sm text-card-foreground focus:bg-muted focus:text-foreground"
                          >
                            <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                            {t("عرض الملف", "View Profile")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => navigate("/profile?tab=account")}
                            className="cursor-pointer rounded-xl px-3 py-2.5 text-sm text-card-foreground focus:bg-muted focus:text-foreground"
                          >
                            <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                            {t("إعدادات الحساب", "Account Settings")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={toggleLanguage}
                            className="cursor-pointer rounded-xl px-3 py-2.5 text-sm text-card-foreground focus:bg-muted focus:text-foreground"
                          >
                            <Languages className="mr-2 h-4 w-4 text-muted-foreground" />
                            {isArabic ? "English" : "العربية"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={toggleTheme}
                            className="cursor-pointer rounded-xl px-3 py-2.5 text-sm text-card-foreground focus:bg-muted focus:text-foreground"
                          >
                            {theme === "dark" ? (
                              <Sun className="mr-2 h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Moon className="mr-2 h-4 w-4 text-muted-foreground" />
                            )}
                            {theme === "dark" ? t("الوضع الفاتح", "Light Mode") : t("الوضع الداكن", "Dark Mode")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-border" />
                          <DropdownMenuItem
                            onSelect={() => void handleClientSignOut()}
                            className="cursor-pointer rounded-xl px-3 py-2.5 text-sm text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:text-rose-300 dark:focus:bg-rose-950/40 dark:focus:text-rose-200"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            {t("تسجيل الخروج", "Sign out")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {!isAuthenticated && (
                      <button
                        onClick={() => {
                          navigate("/client-signup");
                          setGuideStep(0);
                          sessionStorage.setItem("lumos_nav_guide_seen", "1");
                        }}
                        className={`relative px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-white/20 text-white/85 hover:text-white hover:bg-white/10 transition-all duration-300 ${guideStep === 2 ? "ring-2 ring-cyan-300/80 bg-cyan-300/10" : ""}`}
                        title={t("أنشئ حساب عميل جديد لمتابعة طلبات التسعير وتقدم المشروع", "Create a new client account to track pricing requests and project progress")}
                      >
                        {t("إنشاء حساب", "Sign Up")}
                        {guideStep === 2 && (
                          <span className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-cyan-300/50 bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-cyan-200 shadow-xl z-50">
                            {t("ثم أنشئ حسابك من هنا", "Then create your account here")}
                          </span>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => setShowGetStartedMenu(v => !v)}
                      className="relative px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-background rounded-xl overflow-hidden group/cta transition-all duration-300 hover:shadow-[0_0_24px_hsla(150,100%,40%,0.35)] hover:scale-[1.03] active:scale-[0.97]"
                      title={t("افتح قائمة البدء السريعة التي تعرض أسرع الخطوات الأولى", "Open the quick start menu with the fastest first actions")}
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-[hsl(150,100%,40%)] to-[hsl(160,70%,18%)]" />
                      <span className="absolute inset-0 bg-gradient-to-r from-[hsl(160,70%,18%)] to-[hsl(150,100%,40%)] opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100" />
                      <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                        <Sparkles className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                        <span className="hidden sm:inline">{t("ابدأ الآن", "Get Started")}</span>
                        <span className="sm:hidden">{t("ابدأ", "Start")}</span>
                      </span>
                    </button>

                    {showGetStartedMenu && (
                      <div className="absolute top-[calc(100%+10px)] right-0 w-[240px] rounded-2xl border border-white/15 bg-[#0c1222]/95 backdrop-blur-xl p-2 shadow-2xl z-[70]">
                        <button
                          onClick={() => {
                            openPricingModal();
                            setShowGetStartedMenu(false);
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-white/90 hover:bg-white/10 transition-all"
                        >
                          {t("افتح خطط الأسعار", "Open Pricing Plans")}
                          <span className="mt-1 block text-[11px] font-normal text-white/45">{t("كوّن باقة أو قارن الخطط أو أرسل طلب تسعير.", "Build a package, compare plans, or send a pricing request.")}</span>
                        </button>
                        <button
                          onClick={() => {
                            scrollToSection("contact");
                            setShowGetStartedMenu(false);
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-white/90 hover:bg-white/10 transition-all"
                        >
                          {t("اذهب إلى نموذج التواصل", "Jump To Contact Form")}
                          <span className="mt-1 block text-[11px] font-normal text-white/45">{t("استخدم هذا الخيار إذا كنت تعرف احتياجك بالفعل وتريد مراسلة الفريق مباشرة.", "Use this if you already know your case and want to message the team directly.")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════ */}
      {/* ── FLOATING DOCK (portal-rendered to document.body) */}
      {/* ════════════════════════════════════════════════════ */}
      <FloatingDock />

      {/* Pricing Modal */}
      <PricingModal open={pricingOpen} onOpenChange={handlePricingOpenChange} initialRequest={pricingDraft} />

      {/* Top bar animation styles */}
      <style>{`
        @keyframes navbarShimmer {
          0% { transform: translateX(-100%) rotate(15deg); }
          100% { transform: translateX(200%) rotate(15deg); }
        }
        .navbar-shimmer {
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsla(150,100%,40%,0.08) 25%,
            hsla(150,100%,40%,0.15) 50%,
            hsla(150,100%,40%,0.08) 75%,
            transparent 100%
          );
          animation: navbarShimmer 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default EnhancedNavbar;
