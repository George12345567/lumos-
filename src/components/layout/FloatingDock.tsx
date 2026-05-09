/**
 * ═══════════════════════════════════════════════════════════════════
 * FloatingDock.tsx — macOS-STYLE FLOATING DOCK NAVIGATION
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
    motion,
    AnimatePresence,
    useMotionValue,
    useSpring,
    useTransform,
    useScroll,
    useMotionValueEvent,
    MotionValue
} from "framer-motion";
import {
    Home,
    LayoutDashboard,
    User,
    UserPlus,
    DollarSign,
    LogOut,
    LogIn,
    Sparkles,
} from "lucide-react";
import { useIsAuthenticated, useIsAdmin, useAuthActions } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAppearance } from "@/context/AppearanceContext";

type DockTheme = "dark" | "light";

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
    mouseX,
    isMobile = false,
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
    mouseX?: MotionValue;
    isMobile?: boolean;
}) => {
    const [hovered, setHovered] = useState(false);
    const ref = useRef<HTMLButtonElement>(null);

    const defaultMouseX = useMotionValue(Infinity);
    const distance = useTransform(mouseX ?? defaultMouseX, (val) => {
        if (!ref.current || isMobile) return Infinity;
        const bounds = ref.current.getBoundingClientRect();
        return val - bounds.x - bounds.width / 2;
    });

    const sizeSync = useTransform(distance, [-150, 0, 150], [52, 80, 52]);
    const springConfig = { mass: 0.1, stiffness: 150, damping: 12 };
    const size = useSpring(sizeSync, springConfig);

    const mobileSize = 50;

    const baseClasses = "relative flex items-center justify-center transition-colors duration-200 outline-none";

    const variantClasses = theme === "light"
        ? {
            default: isActive
                ? "bg-[rgba(0,188,212,0.15)] text-[#00bcd4] shadow-[0_10px_24px_rgba(0,188,212,0.14)]"
                : "text-slate-500 hover:text-slate-900 hover:bg-white/80",
            cta: "bg-gradient-to-br from-[#00bcd4] to-emerald-500 text-white shadow-[0_14px_30px_rgba(0,188,212,0.24)] hover:shadow-[0_18px_34px_rgba(0,188,212,0.35)]",
            danger: "text-slate-500 hover:text-red-600 hover:bg-red-500/10",
        }
        : {
            default: isActive
                ? "bg-[#00bcd4]/20 text-[#00bcd4] shadow-[0_0_15px_rgba(0,188,212,0.3)]"
                : "text-slate-400 hover:text-white hover:bg-white/10",
            cta: "bg-gradient-to-br from-[#00bcd4] to-emerald-400 text-white shadow-[0_0_20px_rgba(0,188,212,0.4)] hover:shadow-[0_0_30px_rgba(0,188,212,0.6)]",
            danger: "text-slate-400 hover:text-red-400 hover:bg-red-500/10",
        };

    const tooltipClasses = theme === "light"
        ? "border border-slate-200 bg-white/95 text-slate-800 shadow-[0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-md"
        : "border border-white/10 bg-[#040812]/95 text-white shadow-lg backdrop-blur-md";

    const tooltipArrowClasses = theme === "light"
        ? "border-b border-r border-slate-200 bg-white/95"
        : "border-b border-r border-white/10 bg-[#040812]/95";

    const activeDotClasses = theme === "light"
        ? "bg-[#00bcd4] shadow-[0_0_6px_rgba(0,188,212,0.5)]"
        : "bg-[#00bcd4] shadow-[0_0_8px_rgba(0,188,212,0.8)]";

    const highlightClasses = theme === "light"
        ? "ring-2 ring-[#00bcd4]/30 bg-[#00bcd4]/10"
        : "ring-2 ring-[#00bcd4]/50 bg-[#00bcd4]/20";

    const showTooltip = (hovered || forceTooltip) && !isMobile;

    return (
        <motion.button
            ref={ref}
            variants={{
                initial: { opacity: 0, y: 20, scale: 0.5 },
                animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 25 } }
            }}
            style={{
                width: isMobile ? mobileSize : size,
                height: isMobile ? mobileSize : size,
                borderRadius: 22
            }}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            whileTap={{ scale: 0.88, transition: { type: "spring", stiffness: 400, damping: 17 } }}
            className={`${baseClasses} ${variantClasses[variant]} ${highlighted ? highlightClasses : ""}`}
            aria-label={label}
        >
            <Icon className={`h-5.5 w-5.5 ${theme === "dark" && isActive ? "drop-shadow-[0_0_8px_rgba(0,188,212,0.8)]" : ""}`} />

            <span
                className={`pointer-events-none absolute -top-[66px] left-1/2 w-max max-w-[220px] -translate-x-1/2 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all duration-200 ${showTooltip ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${tooltipClasses}`}
            >
                <span className="block whitespace-nowrap">{label}</span>
                {description && <span className="mt-0.5 block whitespace-normal text-[10px] font-normal leading-4 opacity-75">{description}</span>}
                <span className={`absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 ${tooltipArrowClasses}`} />
            </span>

            {isActive && variant === "default" && (
                <span className={`absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${activeDotClasses}`} />
            )}
        </motion.button>
    );
};

const DockSeparator = ({ theme = "dark" }: { theme?: DockTheme }) => (
    <div className={`mx-0.5 h-6 w-px ${theme === "light" ? "bg-[rgba(127,142,106,0.2)]" : "bg-black/10"}`} />
);

const FloatingDock = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = useIsAuthenticated();
    const isAdmin = useIsAdmin();
    const { logout } = useAuthActions();
    const { isArabic, t } = useLanguage();
    const { theme } = useAppearance();

    const isHomePage = location.pathname === "/";
    const isDashboard = location.pathname === "/lumos-admin";
    const isClientProfile = location.pathname === "/profile";
    const isAdminProfile = location.pathname === "/lumos-admin";
    const isProfile = isAdminProfile || isClientProfile;
    const dockTheme: DockTheme = isProfile || theme === "light" ? "light" : "dark";

    const [showGetStartedMenu, setShowGetStartedMenu] = useState(false);
    const [guideStep, setGuideStep] = useState<0 | 1 | 2>(0);
    const [typedGuideText, setTypedGuideText] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);
    const dockRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(Infinity);

    const { scrollY } = useScroll();
    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = lastScrollY.current;
        const diff = latest - previous;
        if (latest < 50) setIsVisible(true);
        else if (diff > 5) setIsVisible(false);
        else if (diff < -5) setIsVisible(true);
        lastScrollY.current = latest;
    });

    const guideText = guideStep === 1
        ? t("مودال الأسعار دي عشان تبدأوا رحلتكم معانا وتختاروا الخطة الأنسب ليكم.", "Use the pricing modal first to compare plans and choose the best starting path.")
        : guideStep === 2
            ? t("بعد اختيار الخطة، افتحوا قائمة البدء عشان توصلوا للنموذج ونتابع معاكم أسرع.", "After choosing a plan, open the Start Menu to jump to the form and follow up faster.")
            : "";

    const handleSignOut = useCallback(() => {
        try {
            logout();
        } catch (error) {
            console.error("Logout error:", error);
        }
        navigate("/", { replace: true });
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

    // Section navigation lives in the in-page sidebar of /profile, so the
    // floating dock only carries cross-page actions when the user is on the
    // profile route (Home / Plans & Pricing / Sign Out).
    // On small profile screens the profile's own bottom tab bar owns section
    // switching, so the dock is intentionally hidden to avoid overlapping
    // account actions and form controls.
    if (isClientProfile && isMobile) return null;

    const isCompactProfileDock = isClientProfile && isMobile;
    const isCompactActive = isMobile || isCompactProfileDock;

    const dockContent = (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 150, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 150, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed inset-x-0 bottom-8 z-[99990] flex justify-center pointer-events-none"
                >
                    <div ref={dockRef} className="pointer-events-auto w-max max-w-[calc(100vw-32px)]">
                        {guideStep > 0 && (
                            <div className={`absolute bottom-[80px] left-1/2 w-[320px] max-w-[90vw] -translate-x-1/2 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-md ${dockTheme === "light" ? "border border-slate-200 bg-white/95" : "border border-[#00bcd4]/30 bg-[#040812]/95"}`}>
                                <p className={`mb-1.5 text-[12px] font-bold ${dockTheme === "light" ? "text-[#00bcd4]" : "text-[#00bcd4]"}`}>
                                    {guideStep === 1 ? t("الخطوة 1 - الأسعار", "Step 1 - Pricing") : t("الخطوة 2 - قائمة البدء", "Step 2 - Start Menu")}
                                </p>
                                <p className={`min-h-[40px] text-xs sm:text-sm leading-relaxed ${dockTheme === "light" ? "text-slate-800" : "text-white"}`}>
                                    {typedGuideText}
                                    <span className={`ml-0.5 inline-block h-[14px] w-[6px] animate-pulse align-middle ${dockTheme === "light" ? "bg-[#00bcd4]" : "bg-[#00bcd4]"}`} />
                                </p>
                                <div className={`absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 ${dockTheme === "light" ? "border-b border-r border-slate-200 bg-white/95" : "border-b border-r border-[#00bcd4]/30 bg-[#040812]"}`} />
                            </div>
                        )}

                        {showGetStartedMenu && (
                            <div className={`absolute bottom-[76px] left-1/2 w-[240px] -translate-x-1/2 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md ${dockTheme === "light" ? "border border-slate-200 bg-white/95" : "border border-white/10 bg-[#040812]/95"}`}>
                                <button
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent("lumos:open-pricing"));
                                        setShowGetStartedMenu(false);
                                    }}
                                    className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all ${dockTheme === "light" ? "text-slate-800 hover:bg-slate-100" : "text-white/90 hover:bg-white/10"}`}
                                >
                                    {t("افتح مودال الأسعار", "Open Pricing Modal")}
                                </button>
                                <button
                                    onClick={() => {
                                        scrollToSection("contact");
                                        setShowGetStartedMenu(false);
                                    }}
                                    className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-all ${dockTheme === "light" ? "text-slate-800 hover:bg-slate-100" : "text-white/90 hover:bg-white/10"}`}
                                >
                                    {t("اذهب إلى النموذج", "Go To Form")}
                                </button>
                            </div>
                        )}

                        <motion.nav
                            onMouseMove={(e) => mouseX.set(e.pageX)}
                            onMouseLeave={() => mouseX.set(Infinity)}
                            initial="initial"
                            animate="animate"
                            variants={{
                                animate: {
                                    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
                                }
                            }}
                            className={`flex items-end justify-center gap-1.5 rounded-[32px] backdrop-blur-xl ${isCompactActive ? "px-2.5 py-2 overflow-x-auto no-scrollbar w-full" : "px-4 py-2.5"} ${dockTheme === "light" ? "border border-slate-200 bg-white/50 shadow-[0_24px_60px_rgba(0,0,0,0.1)]" : "border border-white/10 bg-[#040812]/50 shadow-[0_24px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/5"}`}
                            role="navigation"
                            aria-label={t("تنقل الدوك السفلي", "Floating dock navigation")}
                        >
                            {isClientProfile ? (
                                <>
                                    <DockItem mouseX={mouseX} isMobile={isMobile} icon={Home} label={t("الرئيسية", "Home")} onClick={() => navigate("/")} theme={dockTheme} compact={isCompactProfileDock} />
                                    <DockItem mouseX={mouseX} isMobile={isMobile}
                                        icon={DollarSign}
                                        label={t("الخطط والأسعار", "Plans & Pricing")}
                                        description={t("افتح الباقات واطلب تحديثات أو تسعير من نافذة الأسعار.", "Open pricing packages and request updates from the pricing modal.")}
                                        onClick={() => window.dispatchEvent(new CustomEvent("lumos:open-pricing"))}
                                        theme={dockTheme}
                                        compact={isCompactProfileDock}
                                    />
                                    {!isCompactProfileDock && <DockSeparator theme={dockTheme} />}
                                    {!isCompactProfileDock && <DockItem mouseX={mouseX} isMobile={isMobile} icon={LogOut} label={t("تسجيل الخروج", "Sign Out")} onClick={handleSignOut} variant="danger" theme={dockTheme} />}
                                </>
                            ) : isAuthenticated ? (
                                <>
                                    <DockItem mouseX={mouseX} isMobile={isMobile}
                                        icon={Home}
                                        label={t("الرئيسية", "Home")}
                                        description={t("ارجع إلى مقدمة الصفحة الرئيسية.", "Return to the home page hero section.")}
                                        onClick={() => (isHomePage ? scrollToSection("hero") : navigate("/"))}
                                        isActive={isHomePage}
                                        theme={dockTheme}
                                    />
                                    {isAdmin && (
                                        <DockItem mouseX={mouseX} isMobile={isMobile}
                                            icon={LayoutDashboard}
                                            label={t("لوحة التحكم", "Dashboard")}
                                            description={t("افتح لوحة الإدارة والنظرة التشغيلية العامة.", "Open the admin dashboard and operational overview.")}
                                            onClick={() => navigate("/lumos-admin")}
                                            isActive={isDashboard}
                                            theme={dockTheme}
                                        />
                                    )}
                                    <DockItem mouseX={mouseX} isMobile={isMobile}
                                        icon={User}
                                        label={isAdmin ? t("ملفي", "My Profile") : t("بوابتي", "My Portal")}
                                        description={isAdmin ? t("افتح ملفك الإداري وإعداداتك الشخصية.", "Open your admin profile and personal settings.") : t("افتح بوابة العميل والملفات وتقدّم المشروع.", "Open your client portal, files, and project progress.")}
                                        onClick={() => navigate(isAdmin ? "/lumos-admin" : "/profile")}
                                        isActive={isProfile}
                                        theme={dockTheme}
                                    />
                                    {/* AI Chat dock button intentionally removed: AiChatSidebar is not
                                        mounted in production and the AI service relies on browser-exposed
                                        API keys. Re-enable only behind a backend proxy. */}
                                    <DockItem mouseX={mouseX} isMobile={isMobile}
                                        icon={DollarSign}
                                        label={t("خطط الأسعار", "Pricing Plans")}
                                        description={t("قارن الباقات أو اطلب عرض سعر مخصص.", "Compare packages or request a custom quote.")}
                                        onClick={() => window.dispatchEvent(new CustomEvent("lumos:open-pricing"))}
                                        theme={dockTheme}
                                    />
                                    <DockSeparator theme={dockTheme} />
                                    <DockItem mouseX={mouseX} isMobile={isMobile} icon={LogOut} label={t("تسجيل الخروج", "Sign Out")} onClick={handleSignOut} variant="danger" theme={dockTheme} />
                                </>
                            ) : (
                                <>
                                    <DockItem mouseX={mouseX} isMobile={isMobile}
                                        icon={Home}
                                        label={t("الرئيسية", "Home")}
                                        description={t("ارجع إلى مقدمة الصفحة الرئيسية.", "Return to the home page hero section.")}
                                        onClick={() => (isHomePage ? scrollToSection("hero") : navigate("/"))}
                                        isActive={isHomePage}
                                        theme={dockTheme}
                                    />
                                    <DockItem mouseX={mouseX} isMobile={isMobile}
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
                                    <DockItem mouseX={mouseX} isMobile={isMobile}
                                        icon={LogIn}
                                        label={t("دخول العميل", "Client Login")}
                                        description={t("للعملاء الحاليين الذين لديهم حساب بالفعل.", "For returning clients who already have an account.")}
                                        onClick={() => navigate("/client-login")}
                                        theme={dockTheme}
                                    />
                                    <DockItem mouseX={mouseX} isMobile={isMobile}
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
                                    {/* AI Guide dock button intentionally removed — see comment above. */}
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
                        </motion.nav>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return createPortal(dockContent, document.body);
};

export default FloatingDock;
