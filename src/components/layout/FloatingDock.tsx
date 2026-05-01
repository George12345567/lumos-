/**
 * ═══════════════════════════════════════════════════════════════════
 * FloatingDock.tsx — macOS-STYLE FLOATING DOCK NAVIGATION
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Home,
    LayoutDashboard,
    User,
    UserPlus,
    DollarSign,
    LogOut,
    LogIn,
    Sparkles,
    Folder,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

type DockTheme = "dark" | "light";
type ProfileTabId = "home" | "library" | "brand" | "account";

const DockItem = ({
    icon: Icon,
    label,
    description,
    onClick,
    isActive = false,
    variant = "default",
    highlighted = false,
    forceTooltip = false,
    theme = "dark",
    compact = false,
}: {
    icon: typeof Home;
    label: string;
    description?: string;
    onClick: () => void;
    isActive?: boolean;
    variant?: "default" | "cta" | "danger";
    highlighted?: boolean;
    forceTooltip?: boolean;
    theme?: DockTheme;
    compact?: boolean;
}) => {
    const [hovered, setHovered] = useState(false);

    const baseClasses = compact
        ? "relative flex h-10 w-10 items-center justify-center rounded-[12px] transition-all duration-300 ease-out outline-none"
        : "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ease-out outline-none";

    const variantClasses = theme === "light"
        ? {
            default: isActive
                ? "bg-gradient-to-br from-[#077F5B]/15 to-[#06694c]/10 text-[#077F5B] shadow-[0_8px_24px_rgba(7,127,91,0.15)] border border-[#077F5B]/20"
                : "text-[#537257] hover:text-[#077F5B] hover:bg-[#077F5B]/8 border border-transparent hover:border-[#077F5B]/10",
            cta: "bg-gradient-to-br from-[#077F5B] to-[#06694c] text-white shadow-[0_12px_32px_rgba(7,127,91,0.28)] border border-[#077F5B]/40 hover:shadow-[0_16px_40px_rgba(7,127,91,0.35)]",
            danger: "text-[#537257] hover:text-[#dc2626] hover:bg-red-500/12 border border-transparent hover:border-red-500/20",
        }
        : {
            default: isActive
                ? "bg-gradient-to-br from-[#64ffda]/20 to-cyan-400/10 text-[#64ffda] shadow-[0_0_24px_rgba(100,255,218,0.25)] border border-[#64ffda]/30"
                : "text-slate-400 hover:text-[#64ffda] hover:bg-[#64ffda]/8 border border-transparent hover:border-[#64ffda]/20",
            cta: "bg-gradient-to-br from-[#64ffda] via-cyan-300 to-cyan-400 text-[#0a0f1c] shadow-[0_0_32px_rgba(100,255,218,0.4)] border border-[#64ffda]/50 hover:shadow-[0_0_40px_rgba(100,255,218,0.5)]",
            danger: "text-slate-400 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/12 border border-transparent hover:border-[#ff6b6b]/20",
        };

    const tooltipClasses = theme === "light"
        ? "border border-[#077F5B]/20 bg-gradient-to-br from-white/98 to-white/96 text-[#1E1E1E] shadow-[0_16px_48px_rgba(36,119,54,0.16)] backdrop-blur-xl"
        : "border border-cyan-400/20 bg-gradient-to-br from-[#0c1222]/98 to-[#0a0f1c]/96 text-white shadow-[0_16px_48px_rgba(100,255,218,0.12)] backdrop-blur-xl";

    const tooltipArrowClasses = theme === "light"
        ? "border-b border-r border-[#077F5B]/20 bg-gradient-to-br from-white/98 to-white/96"
        : "border-b border-r border-cyan-400/20 bg-gradient-to-br from-[#0c1222]/98 to-[#0a0f1c]/96";

    const activeDotClasses = theme === "light"
        ? "bg-[#077F5B] shadow-[0_0_10px_rgba(7,127,91,0.6)]"
        : "bg-[#64ffda] shadow-[0_0_10px_rgba(100,255,218,0.8)]";

    const highlightClasses = theme === "light"
        ? "ring-2 ring-[#077F5B]/40 bg-[#077F5B]/12"
        : "ring-2 ring-cyan-400/50 bg-cyan-400/15";

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            data-dock-item
            className={`${baseClasses} ${variantClasses[variant]} ${highlighted ? highlightClasses : ""} active:scale-95`}
            aria-label={label}
        >
            <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />

            <span
                className={`pointer-events-none absolute -top-[72px] left-1/2 w-max max-w-[240px] -translate-x-1/2 rounded-[12px] px-3 py-2 text-[11px] font-semibold transition-all duration-300 ${(hovered || forceTooltip) ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${tooltipClasses}`}
            >
                <span className="block whitespace-nowrap">{label}</span>
                {description && <span className="mt-1 block whitespace-normal text-[10px] font-normal leading-4 opacity-70">{description}</span>}
                <span className={`absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 ${tooltipArrowClasses}`} />
            </span>

            {isActive && variant === "default" && (
                <span className={`absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${activeDotClasses}`} />
            )}
        </button>
    );
};

const DockSeparator = ({ theme = "dark" }: { theme?: DockTheme }) => (
    <div className={`mx-1 h-7 w-px ${theme === "light" ? "bg-[#077F5B]/15" : "bg-[#64ffda]/15"}`} />
);

const FloatingDock = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isAdmin, logout } = useAuth();
    const { isArabic, t } = useLanguage();

    const isHomePage = location.pathname === "/";
    const isDashboard = location.pathname === "/dashboard";
    const isClientProfile = location.pathname === "/clients/profile";
    const isAdminProfile = location.pathname === "/admin/profile";
    const isProfile = isAdminProfile || isClientProfile;
    const dockTheme: DockTheme = isProfile ? "light" : "dark";

    const [showGetStartedMenu, setShowGetStartedMenu] = useState(false);
    const [guideStep, setGuideStep] = useState<0 | 1 | 2>(0);
    const [typedGuideText, setTypedGuideText] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    const [currentClientTab, setCurrentClientTab] = useState<ProfileTabId>("home");
    const dockRef = useRef<HTMLDivElement>(null);

    const guideText = guideStep === 1
        ? t("مودال الأسعار دي عشان تبدأوا رحلتكم معانا وتختاروا الخطة الأنسب ليكم.", "Use the pricing modal first to compare plans and choose the best starting path.")
        : guideStep === 2
            ? t("بعد اختيار الخطة، اعملوا إنشاء حساب علشان نقدر نبدأ التنفيذ والمتابعة معاكم.", "After choosing a plan, create your account so we can start execution and track everything with you.")
            : "";

    const handleSignOut = useCallback(() => {
        try {
            logout();
        } catch (error) {
            console.error("Logout error:", error);
        }
        navigate("/client-login", { replace: true });
    }, [logout, navigate]);

    const scrollToSection = useCallback((id: string) => {
        if (location.pathname !== "/") {
            navigate("/");
            const tryScroll = (attempts: number) => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "start" });
                } else if (attempts > 0) {
                    setTimeout(() => tryScroll(attempts - 1), 200);
                }
            };
            setTimeout(() => tryScroll(5), 300);
            return;
        }

        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [location.pathname, navigate]);

    useEffect(() => {
        if (location.pathname !== "/" || isAuthenticated) return;
        if (sessionStorage.getItem("lumos_dock_guide_seen") === "1") return;

        const id = setTimeout(() => setGuideStep(1), 30000);
        return () => clearTimeout(id);
    }, [location.pathname, isAuthenticated]);

    useEffect(() => {
        if (guideStep !== 1) return;
        const id = setTimeout(() => setGuideStep(2), 8500);
        return () => clearTimeout(id);
    }, [guideStep]);

    useEffect(() => {
        if (guideStep !== 2) return;
        const id = setTimeout(() => {
            setGuideStep(0);
            sessionStorage.setItem("lumos_dock_guide_seen", "1");
        }, 8500);
        return () => clearTimeout(id);
    }, [guideStep]);

    useEffect(() => {
        if (!guideText) {
            setTypedGuideText("");
            return;
        }

        let index = 0;
        setTypedGuideText("");
        const id = setInterval(() => {
            index += 1;
            setTypedGuideText(guideText.slice(0, index));
            if (index >= guideText.length) clearInterval(id);
        }, 28);

        return () => clearInterval(id);
    }, [guideText]);

    useEffect(() => {
        const onOutsideClick = (event: MouseEvent) => {
            if (!showGetStartedMenu) return;
            if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
                setShowGetStartedMenu(false);
            }
        };

        document.addEventListener("mousedown", onOutsideClick);
        return () => document.removeEventListener("mousedown", onOutsideClick);
    }, [showGetStartedMenu]);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 639px)");
        const syncMobile = () => setIsMobile(mediaQuery.matches);
        syncMobile();
        mediaQuery.addEventListener("change", syncMobile);
        return () => mediaQuery.removeEventListener("change", syncMobile);
    }, []);

    useEffect(() => {
        const handleProfileState = (event: Event) => {
            const customEvent = event as CustomEvent<{ tab?: ProfileTabId }>;
            const nextTab = customEvent.detail?.tab;
            if (nextTab === "home" || nextTab === "library" || nextTab === "brand" || nextTab === "account") {
                setCurrentClientTab(nextTab);
            }
        };

        window.addEventListener("lumos:client-profile-dock-state", handleProfileState as EventListener);
        return () => window.removeEventListener("lumos:client-profile-dock-state", handleProfileState as EventListener);
    }, []);

    const triggerProfileDockAction = useCallback((action: string) => {
        window.dispatchEvent(new CustomEvent("lumos:client-profile-dock-action", { detail: { action } }));
    }, []);

    const profileTabs = useMemo<Array<{ id: ProfileTabId; label: string; icon: typeof Home }>>(() => [
        { id: "home", label: t("الواجهة", "Workspace"), icon: LayoutDashboard },
        { id: "library", label: t("المكتبة", "Library"), icon: Folder },
        { id: "brand", label: t("الهوية", "Brand"), icon: Sparkles },
        { id: "account", label: t("الحساب", "Account"), icon: User },
    ], [t]);

    const orderedProfileTabs = useMemo(() =>
        [...profileTabs].sort((left, right) => {
            if (left.id === currentClientTab) return -1;
            if (right.id === currentClientTab) return 1;
            return 0;
        }),
    [profileTabs, currentClientTab]);

    const isCompactProfileDock = isClientProfile && isMobile;

    const navRef = useRef<HTMLElement>(null);

    const handleDockMouseMove = useCallback((e: React.MouseEvent) => {
        const items = navRef.current?.querySelectorAll<HTMLElement>("[data-dock-item]");
        items?.forEach((item) => {
            const rect = item.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const dist = Math.abs(e.clientX - cx);
            const scale = dist < 120 ? 1 + 0.4 * Math.max(0, 1 - dist / 120) : 1;
            item.style.transform = `scale(${scale})`;
            item.style.transition = "transform 100ms ease-out";
        });
    }, []);

    const handleDockMouseLeave = useCallback(() => {
        navRef.current?.querySelectorAll<HTMLElement>("[data-dock-item]").forEach((item) => {
            item.style.transform = "";
        });
    }, []);

    const dockContent = useMemo(() => (
        <div
            ref={dockRef}
            className={`fixed left-1/2 -translate-x-1/2 ${isCompactProfileDock ? "w-[calc(100vw-20px)] max-w-[356px]" : ""} bottom-6`}
            style={{
                zIndex: 99990,
                bottom: isCompactProfileDock ? "calc(env(safe-area-inset-bottom, 0px) + 10px)" : undefined,
            }}
        >
            {guideStep > 0 && (
                <div className={`absolute bottom-[80px] left-1/2 w-[340px] max-w-[90vw] -translate-x-1/2 rounded-[16px] px-4 py-3.5 shadow-2xl backdrop-blur-xl ${dockTheme === "light" ? "border border-[#077F5B]/25 bg-gradient-to-br from-white/96 to-white/92" : "border border-cyan-300/30 bg-gradient-to-br from-[#0c1222]/96 to-[#0a0f1c]/94"}`}>
                    <p className={`mb-2 text-xs font-bold uppercase tracking-wide ${dockTheme === "light" ? "text-[#077F5B]" : "text-cyan-300"}`}>
                        {guideStep === 1 ? t("الخطوة 1 - الأسعار", "Step 1 - Pricing") : t("الخطوة 2 - إنشاء حساب", "Step 2 - Sign Up")}
                    </p>
                    <p className={`min-h-[48px] text-xs leading-relaxed ${dockTheme === "light" ? "text-[#1E1E1E]" : "text-slate-100"}`}>
                        {typedGuideText}
                        <span className={`ml-0.5 inline-block h-[14px] w-[6px] animate-pulse align-middle ${dockTheme === "light" ? "bg-[#077F5B]/70" : "bg-cyan-300/80"}`} />
                    </p>
                    <div className={`absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 ${dockTheme === "light" ? "border-b border-r border-[#077F5B]/25 bg-gradient-to-br from-white/96 to-white/92" : "border-b border-r border-cyan-300/30 bg-gradient-to-br from-[#0c1222]/96 to-[#0a0f1c]/94"}`} />
                </div>
            )}

            {showGetStartedMenu && (
                <div className={`absolute bottom-[72px] left-1/2 w-[240px] -translate-x-1/2 rounded-[16px] p-2.5 shadow-2xl backdrop-blur-xl ${dockTheme === "light" ? "border border-[#077F5B]/20 bg-gradient-to-b from-white/96 to-white/92" : "border border-cyan-300/20 bg-gradient-to-b from-[#0c1222]/95 to-[#0a0f1c]/92"}`}>
                    <button
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent("lumos:open-pricing"));
                            setShowGetStartedMenu(false);
                        }}
                        className={`w-full rounded-[12px] px-3 py-3 text-left text-sm font-semibold transition-all ${dockTheme === "light" ? "text-[#1E1E1E] hover:bg-[#077F5B]/8 border border-transparent hover:border-[#077F5B]/15" : "text-white/90 hover:bg-[#64ffda]/12 border border-transparent hover:border-[#64ffda]/20"}`}
                    >
                        {t("افتح مودال الأسعار", "Open Pricing Modal")}
                    </button>
                    <button
                        onClick={() => {
                            scrollToSection("contact");
                            setShowGetStartedMenu(false);
                        }}
                        className={`w-full rounded-[12px] px-3 py-3 text-left text-sm font-semibold transition-all ${dockTheme === "light" ? "text-[#1E1E1E] hover:bg-[#077F5B]/8 border border-transparent hover:border-[#077F5B]/15" : "text-white/90 hover:bg-[#64ffda]/12 border border-transparent hover:border-[#64ffda]/20"}`}
                    >
                        {t("اذهب إلى النموذج", "Go To Form")}
                    </button>
                </div>
            )}

            <nav
                ref={navRef}
                onMouseMove={handleDockMouseMove}
                onMouseLeave={handleDockMouseLeave}
                className={`flex items-center justify-center gap-2 rounded-full backdrop-blur-xl ${isCompactProfileDock ? "px-2.5 py-2" : "px-4 py-3"} ${dockTheme === "light" ? "border border-[#077F5B]/20 bg-gradient-to-b from-white/92 to-white/88 shadow-[0_24px_64px_rgba(36,119,54,0.14),inset_0_1px_1px_rgba(255,255,255,0.5)]" : "border border-[#64ffda]/15 bg-gradient-to-b from-[#0c1222]/94 to-[#0a0f1c]/92 shadow-[0_24px_64px_rgba(100,255,218,0.08),inset_0_1px_1px_rgba(100,255,218,0.05)]"}`}
                role="navigation"
                aria-label={t("تنقل الدوك السفلي", "Floating dock navigation")}
            >
                {isClientProfile ? (
                    <>
                        <DockItem icon={Home} label={t("الرئيسية", "Home")} onClick={() => navigate("/")} theme={dockTheme} compact={isCompactProfileDock} />
                        {orderedProfileTabs.map(item => (
                            <DockItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                description={`Open the ${item.label.toLowerCase()} section inside your client portal.`}
                                onClick={() => triggerProfileDockAction(item.id)}
                                isActive={item.id === currentClientTab}
                                theme={dockTheme}
                                compact={isCompactProfileDock}
                            />
                        ))}
                        <DockItem
                            icon={DollarSign}
                            label={t("الخطط والأسعار", "Plans & Pricing")}
                            description={t("افتح الباقات واطلب تحديثات أو تسعير من نافذة الأسعار.", "Open pricing packages and request updates from the pricing modal.")}
                            onClick={() => window.dispatchEvent(new CustomEvent("lumos:open-pricing"))}
                            theme={dockTheme}
                            compact={isCompactProfileDock}
                        />
                        {!isCompactProfileDock && <DockSeparator theme={dockTheme} />}
                        {!isCompactProfileDock && <DockItem icon={LogOut} label={t("تسجيل الخروج", "Sign Out")} onClick={handleSignOut} variant="danger" theme={dockTheme} />}
                    </>
                ) : isAuthenticated ? (
                    <>
                        <DockItem
                            icon={Home}
                            label={t("الرئيسية", "Home")}
                            description={t("ارجع إلى مقدمة الصفحة الرئيسية.", "Return to the home page hero section.")}
                            onClick={() => (isHomePage ? scrollToSection("hero") : navigate("/"))}
                            isActive={isHomePage}
                            theme={dockTheme}
                        />
                        {isAdmin && (
                            <DockItem
                                icon={LayoutDashboard}
                                label={t("لوحة التحكم", "Dashboard")}
                                description={t("افتح لوحة الإدارة والنظرة التشغيلية العامة.", "Open the admin dashboard and operational overview.")}
                                onClick={() => navigate("/dashboard")}
                                isActive={isDashboard}
                                theme={dockTheme}
                            />
                        )}
                        <DockItem
                            icon={User}
                            label={isAdmin ? t("ملفي", "My Profile") : t("بوابتي", "My Portal")}
                            description={isAdmin ? t("افتح ملفك الإداري وإعداداتك الشخصية.", "Open your admin profile and personal settings.") : t("افتح بوابة العميل والملفات وتقدّم المشروع.", "Open your client portal, files, and project progress.")}
                            onClick={() => navigate(isAdmin ? "/admin/profile" : "/clients/profile")}
                            isActive={isProfile}
                            theme={dockTheme}
                        />
                        <DockItem
                            icon={DollarSign}
                            label={t("خطط الأسعار", "Pricing Plans")}
                            description={t("قارن الباقات أو اطلب عرض سعر مخصص.", "Compare packages or request a custom quote.")}
                            onClick={() => window.dispatchEvent(new CustomEvent("lumos:open-pricing"))}
                            theme={dockTheme}
                        />
                        <DockSeparator theme={dockTheme} />
                        <DockItem icon={LogOut} label={t("تسجيل الخروج", "Sign Out")} onClick={handleSignOut} variant="danger" theme={dockTheme} />
                    </>
                ) : (
                    <>
                        <DockItem
                            icon={DollarSign}
                            label={guideStep === 1 ? t("الخطوة 1: الأسعار", "Step 1: Pricing") : t("خطط الأسعار", "Pricing Plans")}
                            description={t("ابدأ هنا إذا كنت تريد باقة أو عرض سعر مخصص.", "Start here if you want package pricing or a custom quote request.")}
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent("lumos:open-pricing"));
                                if (guideStep === 1) setGuideStep(2);
                            }}
                            highlighted={guideStep === 1}
                            forceTooltip={guideStep === 1}
                            theme={dockTheme}
                        />
                        <DockItem icon={LogIn} label={t("دخول العميل", "Client Login")} description={t("للعملاء الحاليين الذين لديهم حساب بالفعل.", "For returning clients who already have an account.")} onClick={() => navigate("/client-login")} theme={dockTheme} />
                        <DockItem
                            icon={UserPlus}
                            label={guideStep === 2 ? t("الخطوة 2: إنشاء حساب", "Step 2: Sign Up") : t("إنشاء حساب", "Create Account")}
                            description={t("أنشئ حساب عميل جديد لمتابعة طلبات التسعير وتقدم المشروع.", "Create a new client account to track pricing requests and project progress.")}
                            onClick={() => {
                                navigate("/client-signup");
                                setGuideStep(0);
                                sessionStorage.setItem("lumos_dock_guide_seen", "1");
                            }}
                            highlighted={guideStep === 2}
                            forceTooltip={guideStep === 2}
                            theme={dockTheme}
                        />
                        <DockSeparator theme={dockTheme} />
                        <DockItem
                            icon={Sparkles}
                            label={t("قائمة البدء", "Start Menu")}
                            description={t("افتح قائمة البداية السريعة للتسعير أو التواصل المباشر.", "Open the quick start menu for pricing or direct contact.")}
                            onClick={() => setShowGetStartedMenu(value => !value)}
                            variant="cta"
                            theme={dockTheme}
                        />
                    </>
                )}
            </nav>
        </div>
    ), [
        isCompactProfileDock, isClientProfile, isAdminProfile, isHomePage, isDashboard, isProfile,
        dockTheme, guideStep, typedGuideText, showGetStartedMenu,
        isAuthenticated, isAdmin, orderedProfileTabs, currentClientTab,
        navigate, scrollToSection, handleSignOut, triggerProfileDockAction, t,
        handleDockMouseMove, handleDockMouseLeave,
    ]);

    return createPortal(dockContent, document.body);
};

export default FloatingDock;
