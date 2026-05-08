import { useState, useMemo, useCallback, useRef, memo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  MailCheck,
  Lock,
  Building2,
  Phone,
  Globe,
  Palette,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Upload,
  Camera,
  Wand2,
  RefreshCw,
  MessageSquareQuote,
  Image as ImageIcon,
  Briefcase,
  Target,
  DollarSign,
  Clock,
  Megaphone,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { INDUSTRY_OPTIONS, BUDGET_RANGE_OPTIONS, TIMELINE_OPTIONS, REFERRAL_SOURCE_OPTIONS, SERVICE_CATEGORY_OPTIONS } from "@/lib/constants";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EnhancedNavbar, Footer } from "@/components/layout";
import { useLanguage } from "@/context/LanguageContext";
import { useAuthActions, useIsAuthenticated, useAuthLoading, useAuthConfigured } from "@/context/AuthContext";
import { AlertTriangle } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { resendConfirmationEmail } from "@/services/authService";
import type { AvailabilityStatus } from "@/services/authService";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
import AvatarGenerator, { type AvatarStyle } from "@/components/shared/AvatarGenerator";
import {
  signupFormSchema,
  SignupInput,
  getPasswordStrength,
  getPasswordRules,
  ALLOWED_SECURITY_QUESTIONS,
  isStrongPassword,
  notReserved,
  isValidCompanyName,
  isValidFullName,
  isE164,
  notDisposable,
} from "@/lib/validation";

// ─── Constants ──────────────────────────────────────────────────────────

const AVATAR_PRESETS = [
  { url: "/AVATARS/avatar-1.jpg", labelAr: "إيلي", labelEn: "Elliy" },
  { url: "/AVATARS/avatar-2.jpg", labelAr: "آبي", labelEn: "Abby" },
  { url: "/AVATARS/avatar-3.jpg", labelAr: "دينا", labelEn: "Dina" },
  { url: "/AVATARS/avatar-4.jpg", labelAr: "جويل", labelEn: "Joel" },
  { url: "/AVATARS/avatar-5.jpg", labelAr: "ماكس", labelEn: "Max" },
  { url: "/AVATARS/avatar-6.jpg", labelAr: "نور", labelEn: "Nour" },
  { url: "/AVATARS/avatar-7.jpg", labelAr: "سام", labelEn: "Sam" },
  { url: "/AVATARS/avatar-8.jpg", labelAr: "ليو", labelEn: "Leo" },
  { url: "/AVATARS/avatar-9.jpg", labelAr: "زارا", labelEn: "Zara" },
];

const AVATAR_STYLES: { value: AvatarStyle; label: string; labelAr: string }[] = [
  { value: "nanoBanana", label: "Neural Mesh", labelAr: "شبكة عصبية" },
  { value: "cosmicDust", label: "Cosmic Dust", labelAr: "غبار كوني" },
  { value: "liquidMetal", label: "Liquid Metal", labelAr: "معدن سائل" },
  { value: "crystalFacet", label: "Crystal Facet", labelAr: "كريستال" },
  { value: "neonPulse", label: "Neon Pulse", labelAr: "نبض نيون" },
  { value: "holographic", label: "Holographic", labelAr: "هولوغرافي" },
  { value: "origami", label: "Origami", labelAr: "أوريغامي" },
];

const BRAND_PALETTES = [
  { nameAr: "تقني أخضر", nameEn: "Emerald Tech", primary: "#00cc66", secondary: "#00bcd4" },
  { nameAr: "أزرق محيطي", nameEn: "Ocean Deep", primary: "#0077b6", secondary: "#48cae4" },
  { nameAr: "غروب دافئ", nameEn: "Sunset Warm", primary: "#ff5a5f", secondary: "#ffb347" },
  { nameAr: "بنفسجي ليلي", nameEn: "Midnight Purple", primary: "#7c3aed", secondary: "#a78bfa" },
  { nameAr: "رصين داكن", nameEn: "Dark Stealth", primary: "#64748b", secondary: "#94a3b8" },
];

type AvatarMode = "preset" | "upload" | "generate";

const STEPS = [
  { key: "account", ar: "إنشاء حسابك", en: "Create Your Account", icon: User, descAr: "صورتك وبيانات الدخول", descEn: "Your avatar & credentials" },
  { key: "business", ar: "معلومات العمل", en: "Business Information", icon: Building2, descAr: "بيانات شركتك وطريقة التواصل", descEn: "Your company & contact details" },
  { key: "brand", ar: "الهوية والأمان", en: "Brand & Security", icon: ShieldCheck, descAr: "ألوان علامتك التجارية والأمان والموافقة", descEn: "Brand colors, security & agreement" },
  { key: "project", ar: "تفاصيل المشروع", en: "Project Details", icon: Target, descAr: "مجالك والخدمات والميزانية والجدول الزمني", descEn: "Your industry, services, budget & timeline" },
] as const;

const STEP_FIELDS: (keyof SignupInput)[][] = [
  ["username", "email", "password", "confirmPassword"],
  ["companyName", "tagline", "contactName", "phone", "website"],
  ["brandIdentity", "securityQuestion", "securityAnswer", "termsAccepted"],
  ["industry", "servicesNeeded", "budgetRange", "timeline", "referralSource", "projectSummary"],
];

// ─── Label / Placeholder / Error resolvers ──────────────────────────────

function F(field: keyof SignupInput, t: (a: string, e: string) => string): string {
  const m: Record<keyof SignupInput, [string, string]> = {
    username: ["اسم المستخدم", "Username"], email: ["البريد الإلكتروني", "Email Address"],
    password: ["كلمة المرور", "Password"], confirmPassword: ["تأكيد كلمة المرور", "Confirm Password"],
    companyName: ["اسم الشركة / النشاط", "Company / Business Name"], tagline: ["الشعار التجاري", "Business Tagline"],
    contactName: ["الاسم الكامل لجهة الاتصال", "Full Contact Name"], phone: ["رقم الهاتف", "Phone Number"],
    website: ["الموقع الإلكتروني", "Website"], brandIdentity: ["وصف هوية العلامة", "Describe Your Brand Feel"],
    securityQuestion: ["سؤال الأمان", "Security Question"], securityAnswer: ["إجابة سؤال الأمان", "Security Answer"],
    termsAccepted: ["الموافقة على الشروط", "Accept Terms"],
    industry: ["المجال / الصناعة", "Industry"],
    servicesNeeded: ["الخدمات المطلوبة", "Services Needed"],
    budgetRange: ["نطاق الميزانية", "Budget Range"],
    timeline: ["الجدول الزمني", "Timeline"],
    referralSource: ["كيف عرفت عن لوموس؟", "How did you hear about us?"],
    projectSummary: ["ملخص المشروع", "Project Summary"],
  };
  return t(...m[field]);
}

function P(field: keyof SignupInput, t: (a: string, e: string) => string): string {
  const m: Partial<Record<keyof SignupInput, [string, string]>> = {
    username: ["مثال: my_company", "e.g. my_company"], email: ["you@company.com", "you@company.com"],
    password: ["", ""], confirmPassword: ["", ""],
    companyName: ["اسم شركتك أو نشاطك التجاري", "Your company or business name"],
    tagline: ["الابتكار أولاً / Innovation First", "Innovation First / Quality Matters"],
    contactName: ["الاسم الأول والثاني", "First and last name"],
    phone: ["+201001234567", "+201001234567"], website: ["https://yoursite.com", "https://yoursite.com"],
    brandIdentity: ["ألوان العلامة التجارية، نمط التصميم...", "Brand colors, design style, vibes..."],
    securityAnswer: ["إجابتك السرية", "Your secret answer"],
    industry: ["اختر مجالك", "Select your industry"],
    projectSummary: ["أخبرنا باختصار عن مشروعك واحتياجاتك...", "Tell us briefly about your project and needs..."],
  };
  const p = m[field]; return p ? t(...p) : "";
}

function E(code: string, t: (a: string, e: string) => string): string {
  const m: Record<string, [string, string]> = {
    "email.required": ["البريد الإلكتروني مطلوب", "Email is required"],
    "email.invalid": ["صيغة البريد غير صحيحة", "Please enter a valid email"],
    "email.disposable_not_allowed": ["لا يمكن استخدام بريد مؤقت", "Disposable emails are not allowed"],
    "password.required": ["كلمة المرور مطلوبة", "Password is required"],
    "password.min_length": ["كلمة المرور يجب أن تكون 8 أحرف على الأقل", "Password must be at least 8 characters"],
    "password.too_weak": ["أحرف كبيرة وصغيرة وأرقام مطلوبة", "Needs uppercase, lowercase & a number"],
    "password.confirm_required": ["يرجى تأكيد كلمة المرور", "Please confirm your password"],
    "password.mismatch": ["كلمتا المرور غير متطابقتين", "Passwords do not match"],
    "username.required": ["اسم المستخدم مطلوب", "Username is required"],
    "username.too_short": ["3 أحرف على الأقل", "At least 3 characters"],
    "username.too_long": ["ألا يتجاوز 20 حرفاً", "Max 20 characters"],
    "username.invalid_format": ["يبدأ بحرف إنجليزي صغير وأرقام و _ فقط", "Start with a letter, only lowercase, numbers & _"],
    "username.reserved": ["هذا الاسم محجوز", "This username is reserved"],
    "company_name.invalid": ["اسم الشركة غير صالح (2-80 حرف)", "Invalid company name (2-80 chars)"],
    "full_name.invalid": ["اكتب الاسم الكامل (الاسم + العائلة)", "Enter your full name (first + last)"],
    "tagline.too_long": ["الشعار يجب ألا يتجاوز 120 حرفاً", "Tagline must be 120 characters or less"],
    "phone.invalid": ["صيغة دولية مثل +201001234567", "Use international format e.g. +201001234567"],
    "website.invalid": ["رابط غير صالح", "Invalid website URL"],
    "security_question.invalid": ["اختر من القائمة", "Select from the list"],
    "security_answer.invalid": ["حرفان على الأقل", "At least 2 characters"],
    "terms.required": ["يجب الموافقة على الشروط", "You must accept the terms"],
    "industry.invalid": ["يرجى اختيار مجال صحيح", "Please select a valid industry"],
    "budget_range.invalid": ["يرجى اختيار نطاق ميزانية صحيح", "Please select a valid budget range"],
    "timeline.invalid": ["يرجى اختيار جدول زمني صحيح", "Please select a valid timeline"],
    "referral_source.invalid": ["يرجى اختيار مصدر صحيح", "Please select a valid source"],
    "project_summary.too_long": ["ملخص المشروع يجب ألا يتجاوز 500 حرف", "Project summary must be 500 characters or less"],
  };
  const p = m[code]; return p ? t(...p) : code;
}

// ─── Validation Components ──────────────────────────────────────────────────

type VRule = { ok: boolean; ar: string; en: string };

const AvailabilityIndicator = memo(function AvailabilityIndicator({ status, t }: { status: AvailabilityStatus; t: (a: string, e: string) => string }) {
  if (status === "idle") return null;
  if (status === "checking") {
    return (
      <div className="flex items-center gap-1.5 mt-1 animate-in fade-in duration-200">
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">{t("جاري التحقق...", "Checking availability...")}</span>
      </div>
    );
  }
  if (status === "available") {
    return (
      <div className="flex items-center gap-1.5 mt-1 animate-in fade-in duration-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[11px] text-emerald-400 font-medium">{t("متاح ✓", "Available ✓")}</span>
      </div>
    );
  }
  if (status === "unknown") {
    return (
      <div className="flex items-center gap-1.5 mt-1 animate-in fade-in duration-200">
        <span className="text-[11px] text-muted-foreground/60">{t("تعذر التحقق", "Could not verify")}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 mt-1 animate-in fade-in duration-200">
      <XCircle className="w-3.5 h-3.5 text-destructive" />
      <span className="text-[11px] text-destructive font-medium">{t("مسجل بالفعل ✗", "Already taken ✗")}</span>
    </div>
  );
});

function RulesList({ rules, t }: { rules: VRule[]; t: (a: string, e: string) => string }) {
  const allDone = rules.every(r => r.ok);
  return (
    <div className={`mt-1.5 space-y-1 transition-opacity duration-300 ${allDone ? "opacity-50" : "opacity-80"}`}>
      {rules.map((r, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {r.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <XCircle className="w-3 h-3 text-destructive/60 shrink-0" />}
          <span className={`text-[11px] leading-tight ${r.ok ? "text-emerald-400" : "text-muted-foreground"}`}>{t(r.ar, r.en)}</span>
        </div>
      ))}
    </div>
  );
}

function UsernameRules({ v, t }: { v: string; t: (a: string, e: string) => string }) {
  if (!v) return null;
  return <RulesList t={t} rules={[
    { ok: v.length >= 3 && v.length <= 20, ar: "3-20 حرف", en: "3-20 characters" },
    { ok: /^[a-z]/.test(v), ar: "يبدأ بحرف إنجليزي صغير", en: "Starts with a lowercase letter" },
    { ok: /^[a-z][a-z0-9_-]*$/.test(v), ar: "فقط أحرف صغيرة وأرقام و _ و -", en: "Only lowercase, numbers, _ and -" },
    { ok: notReserved(v), ar: "الاسم غير محجوز", en: "Name is not reserved" },
  ]} />;
}

function EmailRules({ v, t }: { v: string; t: (a: string, e: string) => string }) {
  if (!v) return null;
  return <RulesList t={t} rules={[
    { ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), ar: "صيغة بريد صحيحة", en: "Valid email format" },
    { ok: notDisposable(v), ar: "بريد حقيقي (غير مؤقت)", en: "Not a disposable email" },
  ]} />;
}

function PhoneRules({ v, t }: { v: string; t: (a: string, e: string) => string }) {
  if (!v) return null;
  return <RulesList t={t} rules={[
    { ok: /^\+/.test(v), ar: "يبدأ برمز الدولة +", en: "Starts with country code +" },
    { ok: isE164(v), ar: "صيغة هاتف دولية صحيحة", en: "Valid international format" },
  ]} />;
}

function PasswordStrength({ password, confirmPassword, t }: { password: string; confirmPassword: string; t: (a: string, e: string) => string }) {
  const strength = getPasswordStrength(password);
  const rules = getPasswordRules(password, confirmPassword);
  const barColors = ["bg-red-500", "bg-orange-500", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500"];
  const labels = [t("ضعيفة جداً", "Very Weak"), t("ضعيفة", "Weak"), t("متوسطة", "Fair"), t("قوية", "Strong"), t("قوية جداً", "Excellent")];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < strength ? barColors[strength - 1] : "bg-muted/20"}`}
            style={i < strength && strength >= 3 ? { boxShadow: `0 0 8px ${strength >= 4 ? "hsla(150,100%,40%,0.4)" : "hsla(50,90%,50%,0.3)"}` } : undefined} />
        ))}
      </div>
      <p className={`text-xs font-semibold transition-colors duration-300 ${strength < 3 ? "text-muted-foreground" : "text-emerald-400"}`}>{labels[strength]}</p>
      <div className="space-y-1">
        {rules.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {r.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <XCircle className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
            <span className={`text-[11px] leading-tight ${r.ok ? "text-emerald-400" : "text-muted-foreground/60"}`}>{t(r.ar, r.en)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldIcon({ value, error, touched }: { value: string | undefined; error: string | undefined; touched: boolean }) {
  if (!touched || !value) return null;
  if (error) return <XCircle className="w-4 h-4 text-destructive shrink-0 animate-in fade-in duration-200" />;
  return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-in fade-in duration-200" />;
}

function ic(hasErr: boolean, isValid: boolean, isTouched: boolean, isPwd: boolean = false) {
  const base = "w-full bg-background/50 backdrop-blur-sm rounded-xl transition-all duration-300 text-sm h-11 text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2";
  let ring = " focus-visible:ring-primary/30 focus-visible:border-primary hover:border-primary/40";
  let border = "border-border/40";
  if (isTouched && hasErr) { border = "border-destructive/60"; ring = " focus-visible:ring-destructive/30 focus-visible:border-destructive"; }
  else if (isTouched && isValid) { border = "border-emerald-500/50"; ring = " focus-visible:ring-emerald-400/20 focus-visible:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.08)]"; }
  return `${base} ${border}${ring} ${isPwd ? "" : "px-4"}`;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

// ─── Glass Card wrapper ─────────────────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass-card rounded-2xl glow-border-hover p-5 sm:p-6 ${className}`}>{children}</div>;
}

function GlassCardHeader({ icon: Icon, label, t, ar, en }: { icon: React.ElementType; label?: string; t: (a: string, e: string) => string; ar: string; en: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-foreground">{label || t(ar, en)}</h3>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function SignUpPage() {
  const { t, isArabic } = useLanguage();
  const { signup } = useAuthActions();
  const authLoading = useAuthLoading();
  const isAuthenticated = useIsAuthenticated();
  const authConfigured = useAuthConfigured();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const [avatarMode, setAvatarMode] = useState<AvatarMode>("preset");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [generatedStyle, setGeneratedStyle] = useState<AvatarStyle>("nanoBanana");
  const [brandColors, setBrandColors] = useState<[string, string]>(["#00cc66", "#00bcd4"]);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupFormSchema),
    mode: "onTouched",
    defaultValues: {
      username: "", email: "", password: "", confirmPassword: "",
      companyName: "", tagline: "", contactName: "", phone: "", website: "",
      brandIdentity: "", securityQuestion: "", securityAnswer: "",
      termsAccepted: false,
      industry: "", servicesNeeded: [], budgetRange: "", timeline: "",
      referralSource: "", projectSummary: "",
    },
  });

  const { watch, trigger, getValues, formState: { errors, touchedFields } } = form;
  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const usernameVal = watch("username");
  const emailVal = watch("email");
  const phoneVal = watch("phone");

  const { status: availability, isBlocking: isAvailabilityBlocking } = useAvailabilityCheck(usernameVal, emailVal, phoneVal);

  const avatarSeed = usernameVal || "lumos-default";

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setUploadedPreview(URL.createObjectURL(file)); setAvatarMode("upload"); }
  }, []);

  const goToStep = useCallback(async (step: number) => {
    if (step > currentStep) { const valid = await trigger(STEP_FIELDS[currentStep]); if (!valid) return; setDirection(1); }
    else { setDirection(-1); }
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, trigger]);

  const onSubmit = async () => {
    if (!authConfigured) {
      toast.error(
        t(
          "نظام التسجيل غير مهيأ. يرجى التواصل مع دعم Lumos.",
          "Signup is not configured. Please contact Lumos support.",
        ),
      );
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const values = getValues();
      const result = await signup({
        ...values,
        brandColors,
        avatarMode,
        avatarFile: uploadedFile,
        avatarStyle: generatedStyle,
        avatarPresetUrl: avatarMode === "preset" ? AVATAR_PRESETS[selectedPreset]?.url : undefined,
        avatarSeed: usernameVal || "lumos-default",
      });
      if (result.success) {
        if (result.needsConfirmation) {
          setSignupEmail(getValues().email);
          setShowConfirmation(true);
        } else {
          toast.success(t("تم إنشاء الحساب بنجاح!", "Account created successfully!"));
        }
      } else {
        const errMsg = result.error || "signup.failed";
        if (errMsg === "auth.not_configured") {
          toast.error(
            t(
              "نظام التسجيل غير مهيأ. يرجى التواصل مع دعم Lumos.",
              "Signup is not configured. Please contact Lumos support.",
            ),
          );
        } else if (errMsg === "signup.email_exists") {
          toast.error(t("هذا البريد الإلكتروني مسجل بالفعل", "This email is already registered"));
        } else if (errMsg === "login.rate_limited") {
          toast.error(t("طلبات كثيرة. حاول مرة أخرى بعد دقيقة.", "Too many attempts. Please try again in a minute."));
        } else if (errMsg === "login.forbidden") {
          toast.error(t("غير مسموح بالوصول. تحقق من صلاحيات حسابك.", "Access denied. Please verify your account permissions."));
        } else if (errMsg === "login.network_error") {
          toast.error(t("خطأ في الاتصال. تحقق من الإنترنت وحاول مرة أخرى.", "Connection error. Check your internet and try again."));
        } else {
          toast.error(t("فشل إنشاء الحساب", "Failed to create account"));
        }
      }
    } catch { toast.error(t("حدث خطأ غير متوقع", "An unexpected error occurred")); }
    finally { setIsSubmitting(false); }
  };

  const handleResendConfirmation = useCallback(async () => {
    if (resendCooldown > 0 || !signupEmail) return;
    setIsResending(true);
    try {
      const result = await resendConfirmationEmail(signupEmail);
      if (result.success) {
        toast.success(t("تم إعادة إرسال الإيميل", "Confirmation email resent"));
        setResendCooldown(60);
        let elapsed = 0;
        const timer = setInterval(() => {
          elapsed += 1;
          if (elapsed >= 60) {
            clearInterval(timer);
            setResendCooldown(0);
          } else {
            setResendCooldown(60 - elapsed);
          }
        }, 1000);
      } else {
        toast.error(t("فشل إعادة الإرسال", "Failed to resend"));
      }
    } catch {
      toast.error(t("حدث خطأ غير متوقع", "An unexpected error occurred"));
    } finally {
      setIsResending(false);
    }
  }, [signupEmail, resendCooldown, t]);

  const renderAvatar = (size: number = 80) => {
    if (avatarMode === "preset") return <img src={AVATAR_PRESETS[selectedPreset].url} alt="Avatar" className="w-full h-full object-cover rounded-full" />;
    if (avatarMode === "upload" && uploadedPreview) return <img src={uploadedPreview} alt="Avatar" className="w-full h-full object-cover rounded-full" />;
    return <AvatarGenerator seed={avatarSeed} style={generatedStyle} size={size} colors={brandColors} staticRender />;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center" dir={isArabic ? "rtl" : "ltr"}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (showConfirmation) {
    const maskEmail = (email: string) => {
      const [local, domain] = email.split("@");
      if (!domain || !local) return email;
      if (local.length <= 2) return `${local[0]}***@${domain}`;
      return `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
    };

    return (
      <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
        <EnhancedNavbar />
        <section className="relative pt-24 sm:pt-28 pb-12 px-4 sm:px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-[hsl(150,100%,40%)]/8 blur-[100px] animate-orb" />
            <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#00bcd4]/6 blur-[80px] animate-orb-delayed" />
          </div>
          <div className="container mx-auto max-w-md relative z-10" dir={isArabic ? "rtl" : "ltr"}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="glass-card rounded-2xl glow-border-hover p-6 sm:p-8 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-6">
                <MailCheck className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{t("تحقق من بريدك الإلكتروني", "Check Your Email")}</h2>
              <p className="text-muted-foreground text-sm mb-1">{t("لقد أرسلنا رابط التأكيد إلى", "We've sent a confirmation link to")}</p>
              <p className="text-primary font-semibold text-sm mb-4">{maskEmail(signupEmail)}</p>
              <p className="text-muted-foreground/60 text-xs mb-6 max-w-xs mx-auto">{t("اضغط على الرابط في الإيميل لتفعيل حسابك. تحقق من مجلد البريد المزعج أيضاً.", "Click the link in the email to activate your account. Check your spam folder too.")}</p>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendCooldown > 0 || isResending}
                className="text-sm text-primary/70 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6 inline-flex items-center gap-1.5"
              >
                {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {resendCooldown > 0
                  ? t(`إعادة الإرسال بعد ${resendCooldown} ثانية`, `Resend in ${resendCooldown}s`)
                  : t("إعادة إرسال رابط التأكيد", "Resend confirmation link")
                }
              </button>
              <div className="h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent my-4" />
              <div className="flex items-center justify-center gap-1.5 text-sm">
                <span className="text-muted-foreground/60">{t("لديك حساب بالفعل؟", "Already have an account?")}</span>
                <Link to={ROUTES.CLIENT_LOGIN} className="text-primary/80 hover:text-primary transition-colors hover:underline font-medium">{t("تسجيل الدخول", "Sign in")}</Link>
              </div>
            </motion.div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
      <EnhancedNavbar />

      {/* ─── Hero Section ─── */}
      <section className="relative pt-24 sm:pt-28 pb-8 sm:pb-12 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-[hsl(150,100%,40%)]/8 blur-[100px] animate-orb" />
          <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#00bcd4]/6 blur-[80px] animate-orb-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full bg-[hsl(150,100%,40%)]/3 blur-[60px] animate-pulse" />
        </div>

        <div className="container mx-auto max-w-4xl relative z-10 text-center" dir={isArabic ? "rtl" : "ltr"}>
          <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase shadow-[0_0_12px_rgba(0,188,212,0.1)] mb-4">
              {t("شريكك الرقمي", "YOUR DIGITAL PARTNER")}
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
            {t("انضم إلى", "Join")}{" "}
            <span className="text-primary">Lumos</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-base md:text-lg mt-3 max-w-xl mx-auto">
            {t("أنشئ حسابك وابدأ رحلة نجاحك الرقمية معنا", "Create your account and start your digital success journey with us")}
          </motion.p>

          <div className="mt-6 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent shimmer-line" />
        </div>
      </section>

      {/* ─── Step Indicator ─── */}
      <section className="px-4 sm:px-6 pb-6 sm:pb-8">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center gap-0">
            {STEPS.map((step, i) => {
              const isCompleted = i < currentStep;
              const isActive = i === currentStep;
              const StepIcon = step.icon;
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <motion.div
                      animate={{ scale: isActive ? 1.1 : 1, backgroundColor: isActive || isCompleted ? "hsl(150,100%,40%)" : "hsla(150,20%,20%,0.4)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-shadow duration-300 ${isActive ? "shadow-[0_0_20px_hsla(150,100%,40%,0.4)]" : isCompleted ? "shadow-[0_0_10px_hsla(150,100%,40%,0.2)]" : ""}`}
                    >
                      {isCompleted ? <Check className="w-4 h-4 text-primary-foreground" /> : <StepIcon className={`w-4 h-4 transition-colors ${isActive ? "text-primary-foreground" : "text-muted-foreground/60"}`} />}
                    </motion.div>
                    <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap transition-colors duration-300 ${isActive || isCompleted ? "text-primary" : "text-muted-foreground/40"}`}>{t(step.ar, step.en)}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-10 sm:w-16 mx-2 flex items-center justify-center relative -top-2">
                      <div className="w-full h-[2px] rounded-full bg-muted/20 relative overflow-hidden">
                        <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/60 rounded-full" initial={{ width: "0%" }} animate={{ width: isCompleted ? "100%" : "0%" }} transition={{ duration: 0.5 }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">{t(STEPS[currentStep].descAr, STEPS[currentStep].descEn)}</p>
        </div>
      </section>

      {/* ─── Form Content ─── */}
      <section className="px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20">
        <div className="container mx-auto max-w-4xl">
          {!authConfigured && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-amber-300/50 bg-amber-50 p-3 flex items-start gap-2 max-w-xl mx-auto"
            >
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                {t(
                  "نظام التسجيل غير مهيأ. يمكنك تصفح النموذج لكن لن يتم إنشاء حساب فعلي.",
                  "Signup is not configured. You can browse the form, but no account will actually be created.",
                )}
              </p>
            </div>
          )}
          <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); if (currentStep === STEPS.length - 1) { form.handleSubmit(onSubmit)(e); } else { goToStep(currentStep + 1); } }}>

              <AnimatePresence mode="wait" custom={direction}>
                <motion.div key={currentStep} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: "easeInOut" }}>

                  {/* ═══ STEP 1: Account ═══ */}
                  {currentStep === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
                      {/* Avatar Card */}
                      <GlassCard>
                        <GlassCardHeader icon={Camera} t={t} ar="صورة الملف الشخصي" en="Profile Picture" />
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative group/av">
                            <div className="w-24 h-24 rounded-full overflow-hidden glow-border shadow-[0_0_15px_hsla(150,100%,40%,0.15)]">
                              {renderAvatar(96)}
                            </div>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/av:opacity-100 transition-opacity">
                              <Camera className="w-5 h-5 text-white" />
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                          </div>

                          <div className="flex gap-1 w-full">
                            {([
                              { mode: "preset" as AvatarMode, icon: ImageIcon, ar: "جاهزة", en: "Preset" },
                              { mode: "upload" as AvatarMode, icon: Upload, ar: "رفع", en: "Upload" },
                              { mode: "generate" as AvatarMode, icon: Wand2, ar: "إنشاء", en: "Create" },
                            ]).map(({ mode, icon: TabIcon, ar, en }) => (
                              <button key={mode} type="button" onClick={() => setAvatarMode(mode)}
                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[10px] font-medium transition-all ${avatarMode === mode ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_hsla(150,100%,40%,0.15)]" : "bg-muted/20 text-muted-foreground border border-transparent hover:bg-muted/30 hover:text-foreground"}`}>
                                <TabIcon className="w-3 h-3" /><span className="hidden sm:inline">{t(ar, en)}</span>
                              </button>
                            ))}
                          </div>

                          <AnimatePresence mode="wait">
                            {avatarMode === "preset" && (
                              <motion.div key="preset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2 flex-wrap justify-center">
                                {AVATAR_PRESETS.map((preset, i) => (
                                  <button key={preset.url} type="button" onClick={() => { setSelectedPreset(i); setAvatarMode("preset"); }}
                                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${selectedPreset === i && avatarMode === "preset" ? "border-primary shadow-[0_0_12px_hsla(150,100%,40%,0.3)] scale-105" : "border-border/30 hover:border-primary/40"}`}>
                                    <img src={preset.url} alt={t(preset.labelAr, preset.labelEn)} className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </motion.div>
                            )}
                            {avatarMode === "upload" && (
                              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-border/40 rounded-xl p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group/up">
                                {uploadedPreview ? (
                                  <div className="flex items-center gap-3 justify-center">
                                    <img src={uploadedPreview} alt="Preview" className="w-10 h-10 rounded-full object-cover" />
                                    <span className="text-xs text-muted-foreground">{t("تغيير الصورة", "Change photo")}</span>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="w-6 h-6 mx-auto text-muted-foreground group-hover/up:text-primary transition-colors" />
                                    <p className="text-xs text-muted-foreground mt-1">{t("اسحب صورة أو اضغط", "Drag or click to browse")}</p>
                                  </>
                                )}
                              </motion.div>
                            )}
                            {avatarMode === "generate" && (
                              <motion.div key="generate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-2">
                                <div className="grid grid-cols-4 gap-1.5">
                                  {AVATAR_STYLES.map((style) => (
                                    <button key={style.value} type="button" onClick={() => setGeneratedStyle(style.value)}
                                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${generatedStyle === style.value ? "border-primary shadow-[0_0_8px_hsla(150,100%,40%,0.25)]" : "border-border/20 hover:border-primary/30"}`}>
                                      <AvatarGenerator seed={avatarSeed} style={style.value} size={52} colors={brandColors} staticRender />
                                    </button>
                                  ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground text-center">
                                  {t("النمط: ", "Style: ")}<span className="text-foreground font-medium">{isArabic ? AVATAR_STYLES.find(s => s.value === generatedStyle)?.labelAr : AVATAR_STYLES.find(s => s.value === generatedStyle)?.label}</span>
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </GlassCard>

                      {/* Credentials Card */}
                      <GlassCard>
                        <GlassCardHeader icon={User} t={t} ar="بيانات الدخول" en="Credentials" />
                        <div className="space-y-4">
                          <FormField control={form.control} name="username" render={({ field }) => {
                            const hasErr = !!errors.username; const isValid = !hasErr && !!touchedFields.username && !!field.value;
                            return (<FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm"><User className="w-3.5 h-3.5 text-primary" />{F("username", t)}<span className="text-primary text-xs">*</span>{touchedFields.username && field.value && <FieldIcon value={field.value} error={errors.username?.message} touched={!!touchedFields.username} />}</FormLabel>
                              <FormControl><Input placeholder={P("username", t)} className={ic(hasErr, isValid, !!touchedFields.username)} {...field} /></FormControl>
                              <UsernameRules v={field.value} t={t} />
                              <AvailabilityIndicator status={availability.username} t={t} />
                              {hasErr && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="w-3 h-3 shrink-0" />{E(errors.username?.message || "", t)}</motion.p>}
                            </FormItem>);
                          }} />

                          <FormField control={form.control} name="email" render={({ field }) => {
                            const hasErr = !!errors.email; const isValid = !hasErr && !!touchedFields.email && !!field.value;
                            return (<FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm"><Mail className="w-3.5 h-3.5 text-primary" />{F("email", t)}<span className="text-primary text-xs">*</span>{touchedFields.email && field.value && <FieldIcon value={field.value} error={errors.email?.message} touched={!!touchedFields.email} />}</FormLabel>
                              <FormControl><Input type="email" placeholder={P("email", t)} className={ic(hasErr, isValid, !!touchedFields.email)} {...field} /></FormControl>
                              <EmailRules v={field.value} t={t} />
                              <AvailabilityIndicator status={availability.email} t={t} />
                              {hasErr && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="w-3 h-3 shrink-0" />{E(errors.email?.message || "", t)}</motion.p>}
                            </FormItem>);
                          }} />

                          <FormField control={form.control} name="password" render={({ field }) => {
                            const hasErr = !!errors.password;
                            return (<FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm"><Lock className="w-3.5 h-3.5 text-primary" />{F("password", t)}<span className="text-primary text-xs">*</span></FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className={`${ic(hasErr, false, false)} ${field.value && !hasErr && touchedFields.password ? "border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.06)]" : ""} pr-10`} {...field} />
                                  <button type="button" className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 ${isArabic ? "left-3" : "right-3"}`} onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                                </div>
                              </FormControl>
                              <PasswordStrength password={password} confirmPassword={confirmPassword} t={t} />
                              {hasErr && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="w-3 h-3 shrink-0" />{E(errors.password?.message || "", t)}</motion.p>}
                            </FormItem>);
                          }} />

                          <FormField control={form.control} name="confirmPassword" render={({ field }) => {
                            const hasErr = !!errors.confirmPassword; const isMatch = field.value && field.value === password && !hasErr;
                            return (<FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                                <Lock className="w-3.5 h-3.5 text-primary" />{F("confirmPassword", t)}<span className="text-primary text-xs">*</span>
                                {isMatch && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-400 text-xs font-medium flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />{t("متطابقتان ✓", "Match ✓")}</motion.span>}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" className={`${ic(hasErr, !!isMatch, !!touchedFields.confirmPassword)} pr-10`} {...field} />
                                  <button type="button" className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 ${isArabic ? "left-3" : "right-3"}`} onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                                </div>
                              </FormControl>
                              {hasErr && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="w-3 h-3 shrink-0" />{E(errors.confirmPassword?.message || "", t)}</motion.p>}
                            </FormItem>);
                          }} />
                        </div>
                      </GlassCard>
                    </div>
                  )}

                  {/* ═══ STEP 2: Business ═══ */}
                  {currentStep === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <GlassCard>
                        <GlassCardHeader icon={Building2} t={t} ar="الشركة" en="Company" />
                        <div className="space-y-4">
                          <FormField control={form.control} name="companyName" render={({ field }) => {
                            const hasErr = !!errors.companyName; const isValid = !hasErr && !!touchedFields.companyName && !!field.value;
                            return (<FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm"><Building2 className="w-3.5 h-3.5 text-primary" />{F("companyName", t)}<span className="text-primary text-xs">*</span>{touchedFields.companyName && field.value && <FieldIcon value={field.value} error={errors.companyName?.message} touched={!!touchedFields.companyName} />}</FormLabel>
                              <FormControl><Input placeholder={P("companyName", t)} className={ic(hasErr, isValid, !!touchedFields.companyName)} {...field} /></FormControl>
                              {hasErr && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="w-3 h-3 shrink-0" />{E(errors.companyName?.message || "", t)}</motion.p>}
                            </FormItem>);
                          }} />
                          <FormField control={form.control} name="tagline" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm"><MessageSquareQuote className="w-3.5 h-3.5 text-primary" />{F("tagline", t)}<span className="text-muted-foreground/60 text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted/30 border border-muted/20">{t("اختياري", "Optional")}</span></FormLabel>
                              <FormControl><Input placeholder={P("tagline", t)} className={ic(!!errors.tagline, !!touchedFields.tagline && !!field.value && !errors.tagline, !!touchedFields.tagline)} {...field} /></FormControl>
                              <p className="text-[10px] text-muted-foreground/50">{t("شعار قصير يعبر عن نشاطك التجاري", "A short phrase that captures your business essence")}</p>
                              {errors.tagline && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="w-3 h-3 shrink-0" />{E(errors.tagline?.message || "", t)}</motion.p>}
                            </FormItem>
                          )} />
                        </div>
                      </GlassCard>

                      <GlassCard>
                        <GlassCardHeader icon={Phone} t={t} ar="التواصل" en="Contact" />
                        <div className="space-y-4">
                          <FormField control={form.control} name="contactName" render={({ field }) => {
                            const hasErr = !!errors.contactName; const isValid = !hasErr && !!touchedFields.contactName && !!field.value;
                            return (<FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm"><User className="w-3.5 h-3.5 text-primary" />{F("contactName", t)}<span className="text-primary text-xs">*</span>{touchedFields.contactName && field.value && <FieldIcon value={field.value} error={errors.contactName?.message} touched={!!touchedFields.contactName} />}</FormLabel>
                              <FormControl><Input placeholder={P("contactName", t)} className={ic(hasErr, isValid, !!touchedFields.contactName)} {...field} /></FormControl>
                              {hasErr && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="w-3 h-3 shrink-0" />{E(errors.contactName?.message || "", t)}</motion.p>}
                            </FormItem>);
                          }} />
                          <FormField control={form.control} name="phone" render={({ field }) => {
                            const hasErr = !!errors.phone; const isValid = !hasErr && !!touchedFields.phone && !!field.value;
                            return (<FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm"><Phone className="w-3.5 h-3.5 text-primary" />{F("phone", t)}<span className="text-primary text-xs">*</span>{touchedFields.phone && field.value && <FieldIcon value={field.value} error={errors.phone?.message} touched={!!touchedFields.phone} />}</FormLabel>
                              <FormControl><Input placeholder={P("phone", t)} className={ic(hasErr, isValid, !!touchedFields.phone)} {...field} /></FormControl>
                              <PhoneRules v={field.value} t={t} />
                              <AvailabilityIndicator status={availability.phone} t={t} />
                              {hasErr && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="w-3 h-3 shrink-0" />{E(errors.phone?.message || "", t)}</motion.p>}
                            </FormItem>);
                          }} />
                          <FormField control={form.control} name="website" render={({ field }) => {
                            const hasErr = !!errors.website; const isValid = !hasErr && !!touchedFields.website && !!field.value;
                            return (<FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm"><Globe className="w-3.5 h-3.5 text-primary" />{F("website", t)}<span className="text-muted-foreground/60 text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted/30 border border-muted/20">{t("اختياري", "Optional")}</span></FormLabel>
                              <FormControl><Input placeholder={P("website", t)} className={ic(hasErr, isValid, !!touchedFields.website)} {...field} /></FormControl>
                              {hasErr && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive font-medium flex items-center gap-1"><XCircle className="w-3 h-3 shrink-0" />{E(errors.website?.message || "", t)}</motion.p>}
                            </FormItem>);
                          }} />
                        </div>
                      </GlassCard>
                    </div>
                  )}

                  {/* ═══ STEP 3: Brand & Security ═══ */}
                  {currentStep === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
                      {/* Brand Card */}
                      <GlassCard className="md:sticky md:top-24 md:self-start">
                        <GlassCardHeader icon={Palette} t={t} ar="ألوان العلامة" en="Brand Colors" />

                        <div className="grid grid-cols-5 gap-1.5 mb-4">
                          {BRAND_PALETTES.map((palette, i) => {
                            const isSelected = brandColors[0] === palette.primary && brandColors[1] === palette.secondary;
                            return (
                              <button key={i} type="button" onClick={() => setBrandColors([palette.primary, palette.secondary])}
                                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${isSelected ? "border-primary/60 shadow-[0_0_10px_hsla(150,100%,40%,0.2)] bg-primary/5" : "border-border/30 hover:border-primary/30 bg-background/30"}`}>
                                <div className="flex gap-0.5"><div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: palette.primary }} /><div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: palette.secondary }} /></div>
                                <span className="text-[8px] text-muted-foreground leading-tight text-center">{t(palette.nameAr, palette.nameEn)}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 flex items-center gap-2">
                            <label className="text-[10px] text-muted-foreground shrink-0">{t("أساسي", "Pri")}</label>
                            <input type="color" value={brandColors[0]} onChange={(e) => setBrandColors([e.target.value, brandColors[1]])}
                              className="w-7 h-7 rounded-full border-2 border-border/40 cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none" />
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <label className="text-[10px] text-muted-foreground shrink-0">{t("ثانوي", "Sec")}</label>
                            <input type="color" value={brandColors[1]} onChange={(e) => setBrandColors([brandColors[0], e.target.value])}
                              className="w-7 h-7 rounded-full border-2 border-border/40 cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none" />
                          </div>
                        </div>

                        <div className="h-3 rounded-full overflow-hidden mb-4" style={{ background: `linear-gradient(90deg, ${brandColors[0]}, ${brandColors[1]})` }} />

                        <FormField control={form.control} name="brandIdentity" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-1 text-foreground font-semibold text-xs"><Sparkles className="w-3 h-3 text-primary" />{F("brandIdentity", t)}<span className="text-muted-foreground/50 text-[9px]">({t("اختياري", "Optional")})</span></FormLabel>
                            <FormControl><Textarea placeholder={P("brandIdentity", t)} className="bg-background/50 backdrop-blur-sm border-border/40 rounded-xl focus-visible:ring-primary/30 focus-visible:border-primary hover:border-primary/40 focus-visible:ring-2 transition-all text-sm min-h-[70px]" {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </GlassCard>

                      {/* Security & Terms Card */}
                      <GlassCard>
                        <GlassCardHeader icon={Shield} t={t} ar="الأمان والموافقة" en="Security & Terms" />
                        <div className="space-y-4">
                          <FormField control={form.control} name="securityQuestion" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm"><Shield className="w-3.5 h-3.5 text-primary" />{F("securityQuestion", t)}<span className="text-muted-foreground/60 text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted/30 border border-muted/20">{t("اختياري", "Optional")}</span></FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl><SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/40 rounded-xl focus:ring-primary/30 focus:border-primary hover:border-primary/40 transition-all text-sm h-11"><SelectValue placeholder={t("اختر سؤال أمان...", "Select a security question...")} /></SelectTrigger></FormControl>
                                <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50 rounded-xl">{Array.from(ALLOWED_SECURITY_QUESTIONS).map(q => <SelectItem key={q} value={q} className="text-sm">{q}</SelectItem>)}</SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <AnimatePresence>
                            {watch("securityQuestion") && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                                <FormField control={form.control} name="securityAnswer" render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm"><ShieldCheck className="w-3.5 h-3.5 text-primary" />{F("securityAnswer", t)}</FormLabel>
                                    <FormControl><Input placeholder={P("securityAnswer", t)} className={ic(!!errors.securityAnswer, false, !!touchedFields.securityAnswer)} {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )} />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="pt-2">
                            <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 space-y-3">
                              <div className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary" /><span className="text-sm font-semibold text-foreground">{t("الموافقة على الشروط", "Terms Agreement")}</span></div>
                              <FormField control={form.control} name="termsAccepted" render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-start gap-3">
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5 border-primary/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4" /></FormControl>
                                    <label className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                                      {t("أوافق على الشروط والأحكام وسياسة الخصوصية الخاصة بـ Lumos Digital Ascent", "I agree to Lumos Digital Ascent Terms & Conditions and Privacy Policy")}
                                      <span className="text-primary ml-1">*</span>
                                    </label>
                                  </div>
                                  {errors.termsAccepted && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive font-medium flex items-center gap-1 mt-1"><XCircle className="w-3 h-3 shrink-0" />{E(errors.termsAccepted?.message || "", t)}</motion.p>}
                                </FormItem>
                              )} />
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </div>
                  )}

                  {/* ═══ STEP 4: Project Details ═══ */}
                  {currentStep === 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Left Card: Industry, Budget, Referral */}
                      <GlassCard>
                        <GlassCardHeader icon={Briefcase} t={t} ar="العمل والميزانية" en="Business & Budget" />
                        <div className="space-y-4">
                          <FormField control={form.control} name="industry" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                                <Briefcase className="w-3.5 h-3.5 text-primary" />
                                {t("المجال / الصناعة", "Industry")}
                                <span className="text-muted-foreground/60 text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted/30 border border-muted/20">{t("اختياري", "Optional")}</span>
                              </FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/40 rounded-xl focus:ring-primary/30 focus:border-primary hover:border-primary/40 transition-all text-sm h-11">
                                    <SelectValue placeholder={t("اختر مجالك", "Select your industry")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50 rounded-xl">
                                  {INDUSTRY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-sm">{t(opt.labelAr, opt.labelEn)}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="budgetRange" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                                <DollarSign className="w-3.5 h-3.5 text-primary" />
                                {t("نطاق الميزانية", "Budget Range")}
                                <span className="text-muted-foreground/60 text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted/30 border border-muted/20">{t("اختياري", "Optional")}</span>
                              </FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/40 rounded-xl focus:ring-primary/30 focus:border-primary hover:border-primary/40 transition-all text-sm h-11">
                                    <SelectValue placeholder={t("اختر نطاق الميزانية", "Select budget range")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50 rounded-xl">
                                  {BUDGET_RANGE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-sm">{t(opt.labelAr, opt.labelEn)}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="referralSource" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                                <Megaphone className="w-3.5 h-3.5 text-primary" />
                                {t("كيف عرفت عن لوموس؟", "How did you hear about us?")}
                                <span className="text-muted-foreground/60 text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted/30 border border-muted/20">{t("اختياري", "Optional")}</span>
                              </FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/40 rounded-xl focus:ring-primary/30 focus:border-primary hover:border-primary/40 transition-all text-sm h-11">
                                    <SelectValue placeholder={t("اختر المصدر", "Select source")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50 rounded-xl">
                                  {REFERRAL_SOURCE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-sm">{t(opt.labelAr, opt.labelEn)}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </GlassCard>

                      {/* Right Card: Services, Timeline, Summary */}
                      <GlassCard>
                        <GlassCardHeader icon={Target} t={t} ar="الخدمات والتفاصيل" en="Services & Details" />
                        <div className="space-y-4">
                          <FormField control={form.control} name="servicesNeeded" render={({ field }) => {
                            const selected = (field.value || []) as string[];
                            const toggle = (value: string) => {
                              const next = selected.includes(value)
                                ? selected.filter((v: string) => v !== value)
                                : [...selected, value];
                              field.onChange(next);
                            };
                            return (
                              <FormItem>
                                <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                                  <Globe className="w-3.5 h-3.5 text-primary" />
                                  {t("الخدمات المطلوبة", "Services You Need")}
                                  <span className="text-muted-foreground/60 text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted/30 border border-muted/20">{t("اختياري", "Optional")}</span>
                                </FormLabel>
                                <div className="grid grid-cols-1 gap-1.5 mt-1.5">
                                  {SERVICE_CATEGORY_OPTIONS.map((cat) => {
                                    const isSelected = selected.includes(cat.value);
                                    return (
                                      <button key={cat.value} type="button" onClick={() => toggle(cat.value)}
                                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all text-xs ${isSelected ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_8px_hsla(150,100%,40%,0.12)]" : "border-border/30 bg-background/30 text-muted-foreground hover:border-primary/30 hover:bg-primary/5"}`}>
                                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-muted/30"}`}>
                                          {isSelected && <Check className="w-3 h-3" />}
                                        </div>
                                        <span className="font-medium">{t(cat.labelAr, cat.labelEn)}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                <FormMessage />
                              </FormItem>
                            );
                          }} />

                          <FormField control={form.control} name="timeline" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                {t("الجدول الزمني", "Timeline")}
                                <span className="text-muted-foreground/60 text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted/30 border border-muted/20">{t("اختياري", "Optional")}</span>
                              </FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl>
                                  <SelectTrigger className="bg-background/50 backdrop-blur-sm border-border/40 rounded-xl focus:ring-primary/30 focus:border-primary hover:border-primary/40 transition-all text-sm h-11">
                                    <SelectValue placeholder={t("اختر الجدول الزمني", "Select timeline")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-popover/95 backdrop-blur-md border-border/50 rounded-xl">
                                  {TIMELINE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-sm">{t(opt.labelAr, opt.labelEn)}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="projectSummary" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                {t("ملخص المشروع", "Project Summary")}
                                <span className="text-muted-foreground/60 text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted/30 border border-muted/20">{t("اختياري", "Optional")}</span>
                              </FormLabel>
                              <FormControl>
                                <Textarea placeholder={t("أخبرنا باختصار عن مشروعك واحتياجاتك...", "Tell us briefly about your project and needs...")} className="bg-background/50 backdrop-blur-sm border-border/40 rounded-xl focus-visible:ring-primary/30 focus-visible:border-primary hover:border-primary/40 focus-visible:ring-2 transition-all text-sm min-h-[80px]" {...field} />
                              </FormControl>
                              <p className="text-[10px] text-muted-foreground/50">{t("بحد أقصى 500 حرف", "Max 500 characters")}</p>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      </GlassCard>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* ─── Navigation ─── */}
              <div className="mt-8">
                <div className="h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent mb-6" />
                <div className="flex items-center justify-between gap-3">
                  {currentStep > 0 ? (
                    <Button type="button" variant="outline" onClick={() => goToStep(currentStep - 1)} className="rounded-xl border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all text-sm h-11 px-5">
                      {isArabic ? <ArrowRight className="w-4 h-4 ml-1" /> : <ArrowLeft className="w-4 h-4 mr-1" />}
                      {t("رجوع", "Back")}
                    </Button>
                  ) : <div />}

                  {currentStep < STEPS.length - 1 ? (
                    <Button type="submit" disabled={currentStep === 0 && isAvailabilityBlocking} className="btn-glow glow-ring rounded-full text-sm font-bold h-11 px-7 group">
                      <span>{t("التالي", "Next")}</span>
                      {currentStep === 0 && isAvailabilityBlocking && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />}
                      {isArabic ? <ArrowLeft className="w-4 h-4 mr-0.5 group-hover:translate-x-0.5 transition-transform" /> : <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />}
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting || !authConfigured} className="btn-glow glow-ring rounded-full text-sm font-bold h-11 px-7 min-w-[160px] group">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1.5" /><span>{t("إنشاء حساب", "Create Account")}</span></>}
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-center mt-4 gap-1 text-xs text-muted-foreground/40">
                  <span>{t(`الخطوة ${currentStep + 1} من ${STEPS.length}`, `Step ${currentStep + 1} of ${STEPS.length}`)}</span>
                  <span>·</span>
                  <Link to="/client-login" className="text-primary/60 hover:text-primary transition-colors hover:underline">{t("لديك حساب؟", "Have an account?")}</Link>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
