import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  Phone,
  Sparkles,
  User,
  XCircle,
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
import {
  useAuthActions,
  useAuthConfigured,
  useIsAdmin,
  useIsAuthenticated,
  useIsTeamMember,
} from "@/context/AuthContext";
import { ROUTES, INDUSTRY_OPTIONS } from "@/lib/constants";
import {
  inviteOnboardingSchema,
  type InviteOnboardingInput,
  getPasswordRules,
  getPasswordStrength,
  isStrongPassword,
} from "@/lib/validation";
import {
  completeInviteOnboarding,
  getExistingClientRow,
  getInvitedUser,
} from "@/services/inviteOnboardingService";
import { getSession } from "@/services/authService";

type Phase =
  | "checking"
  | "not_configured"
  | "no_session"
  | "missing_email"
  | "already_onboarded"
  | "form"
  | "saving"
  | "complete";

function ic(hasErr: boolean, isValid: boolean, isTouched: boolean) {
  const base =
    "w-full bg-background/50 backdrop-blur-sm rounded-xl transition-all duration-300 text-sm h-11 text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2";
  let ring = " focus-visible:ring-primary/30 focus-visible:border-primary hover:border-primary/40";
  let border = "border-border/40";
  if (isTouched && hasErr) {
    border = "border-destructive/60";
    ring = " focus-visible:ring-destructive/30 focus-visible:border-destructive";
  } else if (isTouched && isValid) {
    border = "border-emerald-500/50";
    ring =
      " focus-visible:ring-emerald-400/20 focus-visible:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.08)]";
  }
  return `${base} ${border}${ring} px-4`;
}

function PasswordStrength({
  password,
  confirmPassword,
  t,
}: {
  password: string;
  confirmPassword: string;
  t: (a: string, e: string) => string;
}) {
  const strength = getPasswordStrength(password);
  const rules = getPasswordRules(password, confirmPassword);
  const barColors = ["bg-red-500", "bg-orange-500", "bg-yellow-400", "bg-emerald-400", "bg-emerald-500"];
  const labels = [
    t("ضعيفة جداً", "Very Weak"),
    t("ضعيفة", "Weak"),
    t("متوسطة", "Fair"),
    t("قوية", "Strong"),
    t("قوية جداً", "Excellent"),
  ];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i < strength ? barColors[strength - 1] : "bg-muted/20"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-xs font-semibold transition-colors duration-300 ${
          strength < 3 ? "text-muted-foreground" : "text-emerald-400"
        }`}
      >
        {labels[strength]}
      </p>
      <div className="space-y-1">
        {rules.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {r.ok ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            )}
            <span
              className={`text-[11px] leading-tight ${
                r.ok ? "text-emerald-400" : "text-muted-foreground/60"
              }`}
            >
              {t(r.ar, r.en)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function localizeError(code: string, t: (a: string, e: string) => string): string {
  const map: Record<string, [string, string]> = {
    "invite.session_invalid": [
      "انتهت صلاحية الجلسة. اطلب من Lumos إرسال دعوة جديدة.",
      "Your session has expired. Please ask Lumos to send a new invitation.",
    ],
    "invite.missing_email": [
      "حساب الدعوة لا يحتوي على بريد إلكتروني.",
      "Invitation account is missing an email address.",
    ],
    "invite.password_failed": [
      "تعذّر تعيين كلمة المرور. حاول مرة أخرى.",
      "Could not set your password. Please try again.",
    ],
    "invite.username_or_phone_taken": [
      "اسم المستخدم أو رقم الهاتف مستخدم بالفعل.",
      "Username or phone number is already in use.",
    ],
    "invite.rls_blocked": [
      "تعذّر إنشاء الملف. تواصل مع Lumos لتفعيل الحساب.",
      "We couldn't create your client profile. Please contact Lumos to activate it.",
    ],
    "invite.invalid_input": [
      "إحدى القيم غير مقبولة. راجع البيانات وحاول مرة أخرى.",
      "One of the values is not accepted. Please review your details.",
    ],
    "invite.save_failed": [
      "تعذّر حفظ بياناتك. حاول مرة أخرى.",
      "Could not save your details. Please try again.",
    ],
    "auth.not_configured": [
      "نظام Lumos غير مهيأ. تواصل مع الدعم.",
      "Lumos auth is not configured. Please contact support.",
    ],
    "password.invalid": [
      "كلمة المرور غير مقبولة.",
      "Password is not accepted.",
    ],
    "password.required": ["كلمة المرور مطلوبة", "Password is required"],
    "password.min_length": ["كلمة المرور يجب أن تكون 8 أحرف على الأقل", "Password must be at least 8 characters"],
    "password.too_weak": ["كلمة المرور ضعيفة. أضف حروفاً وأرقاماً.", "Password is too weak. Mix letters and numbers."],
    "password.confirm_required": ["تأكيد كلمة المرور مطلوب", "Please confirm your password"],
    "password.mismatch": ["كلمتا المرور غير متطابقتين", "Passwords do not match"],
    "username.required": ["اسم المستخدم مطلوب", "Username is required"],
    "username.too_short": ["اسم المستخدم قصير جداً", "Username is too short"],
    "username.too_long": ["اسم المستخدم طويل جداً", "Username is too long"],
    "username.invalid_format": ["الصيغة غير صحيحة (a-z, 0-9, _ أو -)", "Use lowercase letters, numbers, _ or -"],
    "username.reserved": ["اسم المستخدم محجوز", "This username is reserved"],
    "full_name.invalid": ["اكتب الاسم الأول واسم العائلة", "Enter first and last name"],
    "company_name.invalid": ["اسم الشركة غير صالح", "Company name is not valid"],
    "phone.invalid": ["رقم الهاتف غير صالح. مثل: +201001234567", "Invalid phone. Example: +201001234567"],
    "website.invalid": ["رابط الموقع غير صالح (https فقط)", "Invalid website URL (https only)"],
    "industry.invalid": ["المجال غير صالح", "Invalid industry"],
    "project_summary.too_long": ["الوصف طويل جداً (الحد 500 حرف)", "Description is too long (max 500 chars)"],
  };
  const m = map[code];
  return m ? t(...m) : code;
}

export default function InviteOnboardingPage() {
  const { t, isArabic } = useLanguage();
  const authConfigured = useAuthConfigured();
  const isAuthenticated = useIsAuthenticated();
  const isAdmin = useIsAdmin();
  const isTeamMember = useIsTeamMember();
  const showAdmin = isAdmin || isTeamMember;
  const { refreshProfile } = useAuthActions();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("checking");
  const [invitedEmail, setInvitedEmail] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<InviteOnboardingInput>({
    resolver: zodResolver(inviteOnboardingSchema),
    mode: "onTouched",
    defaultValues: {
      username: "",
      contactName: "",
      companyName: "",
      phone: "",
      website: "",
      industry: "",
      projectSummary: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const { watch, formState: { errors, touchedFields } } = form;
  const newPassword = watch("newPassword");
  const confirmNewPassword = watch("confirmNewPassword");

  // Verify the invite session and pre-fill what we already know.
  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!authConfigured) {
        if (!cancelled) setPhase("not_configured");
        return;
      }

      // detectSessionInUrl in supabaseClient handles the invite link's hash/code
      // automatically. We just check whether we now have a session.
      const session = await getSession();
      if (!session) {
        if (!cancelled) setPhase("no_session");
        return;
      }

      const invited = await getInvitedUser();
      if (!invited) {
        if (!cancelled) setPhase("no_session");
        return;
      }
      if (!invited.email) {
        if (!cancelled) setPhase("missing_email");
        return;
      }

      // If a clients row already exists AND signup_completed_at is set,
      // treat it as "already onboarded" and bounce to /profile so we don't
      // overwrite admin-managed data.
      const existing = await getExistingClientRow(invited.id);
      if (existing?.exists && existing.signupCompletedAt) {
        if (!cancelled) {
          setPhase("already_onboarded");
          // Admin shouldn't be hijacked into /profile from here.
          setTimeout(() => navigate(showAdmin ? ROUTES.ADMIN_DASHBOARD : ROUTES.CLIENT_PROFILE, { replace: true }), 600);
        }
        return;
      }

      if (!cancelled) {
        setInvitedEmail(invited.email);
        setPhase("form");
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [authConfigured, showAdmin, navigate]);

  const industryOptions = useMemo(
    () =>
      INDUSTRY_OPTIONS.map((opt) => ({
        value: opt.value,
        label: t(opt.labelAr, opt.labelEn),
      })),
    [t],
  );

  const onSubmit = useCallback(
    async (data: InviteOnboardingInput) => {
      if (phase === "saving") return;
      setSubmitError(null);
      setPhase("saving");

      const result = await completeInviteOnboarding({
        username: data.username,
        contactName: data.contactName,
        companyName: data.companyName,
        phone: data.phone,
        website: data.website,
        industry: data.industry,
        projectSummary: data.projectSummary,
        newPassword: data.newPassword,
      });

      if (!result.success) {
        const msg = localizeError(result.error || "invite.save_failed", t);
        setSubmitError(msg);
        // If the session itself died, drop the user back to the invalid state
        // so the only action they can take is to request a new invitation.
        if (result.error === "invite.session_invalid") {
          setPhase("no_session");
          return;
        }
        setPhase("form");
        return;
      }

      try {
        await refreshProfile();
      } catch {
        // Profile refresh is best-effort — the row exists either way.
      }
      setPhase("complete");
      toast.success(t("تم تفعيل حسابك بنجاح!", "Your account is ready!"));
      setTimeout(() => navigate(ROUTES.CLIENT_PROFILE, { replace: true }), 1500);
    },
    [phase, refreshProfile, navigate, t],
  );

  const dirAttr = isArabic ? "rtl" : "ltr";

  // ─── Phase: checking ──────────────────────────────────────────────────
  if (phase === "checking") {
    return (
      <div
        className="min-h-screen bg-background text-foreground flex items-center justify-center"
        dir={dirAttr}
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {t("جارٍ التحقق من الدعوة...", "Verifying your invitation...")}
          </p>
        </div>
      </div>
    );
  }

  // ─── Phase: invalid / not configured / missing email ──────────────────
  if (phase === "no_session" || phase === "not_configured" || phase === "missing_email") {
    const title =
      phase === "not_configured"
        ? t("الإعداد غير مكتمل", "Lumos auth not configured")
        : phase === "missing_email"
          ? t("الدعوة غير مكتملة", "Invitation incomplete")
          : t("الدعوة غير صالحة", "Invitation Invalid");
    const desc =
      phase === "not_configured"
        ? t(
            "لم يتم تهيئة Lumos auth. تواصل مع الدعم لإكمال الإعداد.",
            "Lumos auth is not yet configured. Please contact support to finish setup.",
          )
        : phase === "missing_email"
          ? t(
              "حساب الدعوة لا يحتوي على بريد إلكتروني. تواصل مع Lumos لإصدار دعوة جديدة.",
              "This invited account is missing an email address. Please ask Lumos to send a fresh invitation.",
            )
          : t(
              "هذا الرابط منتهي الصلاحية أو غير صالح. اطلب من Lumos إرسال دعوة جديدة.",
              "This invitation link is invalid or has expired. Please ask Lumos to send you a new invitation.",
            );

    return (
      <div className="min-h-screen bg-background text-foreground" dir={dirAttr}>
        <EnhancedNavbar />
        <section className="relative pt-24 sm:pt-28 pb-12 px-4 sm:px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-destructive/8 blur-[100px] animate-orb" />
          </div>
          <div className="container mx-auto max-w-md relative z-10 text-center" dir={dirAttr}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <div className="glass-card rounded-2xl glow-border-hover p-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center mb-6">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">{desc}</p>
                <Link to={ROUTES.HOME}>
                  <Button
                    variant="outline"
                    className="rounded-xl border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all text-sm h-11 px-6"
                  >
                    {t("الرجوع إلى الصفحة الرئيسية", "Back to Home")}
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  // ─── Phase: already onboarded ─────────────────────────────────────────
  if (phase === "already_onboarded") {
    return (
      <div
        className="min-h-screen bg-background text-foreground flex items-center justify-center"
        dir={dirAttr}
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {t("تم التفعيل مسبقاً، جارٍ التوجيه...", "Already activated, redirecting...")}
          </p>
        </div>
      </div>
    );
  }

  // ─── Phase: complete ─────────────────────────────────────────────────
  if (phase === "complete") {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={dirAttr}>
        <EnhancedNavbar />
        <section className="relative pt-24 sm:pt-28 pb-12 px-4 sm:px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-[hsl(150,100%,40%)]/8 blur-[100px] animate-orb" />
          </div>
          <div className="container mx-auto max-w-md relative z-10 text-center" dir={dirAttr}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <div className="glass-card rounded-2xl glow-border-hover p-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-6">
                  <Check className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  {t("مرحباً بك في Lumos!", "Welcome to Lumos!")}
                </h2>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                  {t("جارٍ توجيهك إلى ملفك الشخصي...", "Redirecting you to your profile...")}
                </p>
                <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
              </div>
            </motion.div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  // ─── Phase: form / saving ────────────────────────────────────────────
  const isSaving = phase === "saving";

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dirAttr}>
      <EnhancedNavbar />

      <section className="relative pt-24 sm:pt-28 pb-8 sm:pb-12 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-[hsl(150,100%,40%)]/8 blur-[100px] animate-orb" />
          <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#00bcd4]/6 blur-[80px] animate-orb-delayed" />
        </div>

        <div className="container mx-auto max-w-3xl relative z-10 text-center" dir={dirAttr}>
          <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase shadow-[0_0_12px_rgba(0,188,212,0.1)] mb-4">
              {t("دعوة من Lumos", "Lumos Invitation")}
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-extrabold leading-tight"
          >
            {t("أكمل حسابك على Lumos", "Complete Your Lumos Account")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-base mt-3 max-w-xl mx-auto"
          >
            {t(
              "تمت دعوتك للانضمام إلى Lumos. أكمل بياناتك لتفعيل ملفك الشخصي.",
              "You've been invited to join Lumos. Complete your details to activate your client profile.",
            )}
          </motion.p>
          <div className="mt-6 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent shimmer-line" />
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20">
        <div className="container mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <div className="glass-card rounded-2xl glow-border-hover p-6 sm:p-8">
              {/* Read-only invited email */}
              <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-start gap-3">
                <MailCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-left rtl:text-right">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                    {t("بريد الدعوة", "Invitation email")}
                  </p>
                  <p className="text-sm font-medium text-foreground break-all">{invitedEmail}</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-1">
                    {t(
                      "هذا البريد مرتبط بحساب الدعوة ولا يمكن تغييره من هنا.",
                      "This email is linked to the invitation and can't be changed here.",
                    )}
                  </p>
                </div>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  {/* Username */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <User className="w-3.5 h-3.5 text-primary" />
                          {t("اسم المستخدم", "Username")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("مثال: my_company", "e.g. my_company")}
                            autoComplete="username"
                            className={ic(
                              !!errors.username,
                              !errors.username && !!field.value,
                              !!touchedFields.username,
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage>
                          {errors.username?.message ? localizeError(errors.username.message, t) : null}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* Full name */}
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <User className="w-3.5 h-3.5 text-primary" />
                          {t("الاسم الكامل", "Full Name")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("الاسم الأول والثاني", "First and last name")}
                            autoComplete="name"
                            className={ic(
                              !!errors.contactName,
                              !errors.contactName && !!field.value,
                              !!touchedFields.contactName,
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage>
                          {errors.contactName?.message ? localizeError(errors.contactName.message, t) : null}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* Company */}
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          {t("اسم الشركة / النشاط", "Company / Brand Name")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("شركتك أو نشاطك التجاري", "Your company or business")}
                            autoComplete="organization"
                            className={ic(
                              !!errors.companyName,
                              !errors.companyName && !!field.value,
                              !!touchedFields.companyName,
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage>
                          {errors.companyName?.message ? localizeError(errors.companyName.message, t) : null}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <Phone className="w-3.5 h-3.5 text-primary" />
                          {t("رقم الهاتف", "Phone Number")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+201001234567"
                            inputMode="tel"
                            autoComplete="tel"
                            dir="ltr"
                            className={ic(
                              !!errors.phone,
                              !errors.phone && !!field.value,
                              !!touchedFields.phone,
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage>
                          {errors.phone?.message ? localizeError(errors.phone.message, t) : null}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* Website (optional) */}
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <Globe className="w-3.5 h-3.5 text-primary" />
                          {t("الموقع أو رابط اجتماعي (اختياري)", "Website or social link (optional)")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://yoursite.com"
                            inputMode="url"
                            autoComplete="url"
                            dir="ltr"
                            className={ic(
                              !!errors.website,
                              !errors.website && !!field.value,
                              !!touchedFields.website,
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage>
                          {errors.website?.message ? localizeError(errors.website.message, t) : null}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* Industry (optional) */}
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <Briefcase className="w-3.5 h-3.5 text-primary" />
                          {t("المجال (اختياري)", "Industry (optional)")}
                        </FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger
                              className={ic(
                                !!errors.industry,
                                !errors.industry && !!field.value,
                                !!touchedFields.industry,
                              )}
                            >
                              <SelectValue placeholder={t("اختر المجال", "Select industry")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {industryOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage>
                          {errors.industry?.message ? localizeError(errors.industry.message, t) : null}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* Project summary (optional) */}
                  <FormField
                    control={form.control}
                    name="projectSummary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          {t("ملخص مشروعك (اختياري)", "Project summary (optional)")}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t(
                              "صف بإيجاز ما تحتاج Lumos مساعدتك فيه...",
                              "Briefly describe what you'd like Lumos to help with...",
                            )}
                            rows={4}
                            className="bg-background/50 backdrop-blur-sm rounded-xl border-border/40 focus-visible:ring-primary/30 focus-visible:border-primary text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage>
                          {errors.projectSummary?.message
                            ? localizeError(errors.projectSummary.message, t)
                            : null}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent my-2" />

                  {/* New password */}
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <Lock className="w-3.5 h-3.5 text-primary" />
                          {t("اختر كلمة مرور", "Set a Password")}
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="new-password"
                              className={`${ic(
                                !!errors.newPassword,
                                !errors.newPassword && !!newPassword && isStrongPassword(newPassword),
                                !!touchedFields.newPassword,
                              )} ${showPassword ? "" : "!pr-10"}`}
                              {...field}
                            />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 ${
                              isArabic ? "right-3" : "!right-3 !left-auto"
                            }`}
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <PasswordStrength password={newPassword} confirmPassword={confirmNewPassword} t={t} />
                        <FormMessage>
                          {errors.newPassword?.message ? localizeError(errors.newPassword.message, t) : null}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* Confirm password */}
                  <FormField
                    control={form.control}
                    name="confirmNewPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <Lock className="w-3.5 h-3.5 text-primary" />
                          {t("تأكيد كلمة المرور", "Confirm Password")}
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="new-password"
                              className={`${ic(
                                !!errors.confirmNewPassword,
                                !errors.confirmNewPassword &&
                                  !!confirmNewPassword &&
                                  newPassword === confirmNewPassword,
                                !!touchedFields.confirmNewPassword,
                              )} ${showConfirmPassword ? "" : "!pr-10"}`}
                              {...field}
                            />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 ${
                              isArabic ? "right-3" : "!right-3 !left-auto"
                            }`}
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FormMessage>
                          {errors.confirmNewPassword?.message
                            ? localizeError(errors.confirmNewPassword.message, t)
                            : null}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSaving || !authConfigured}
                      className="btn-glow glow-ring rounded-full text-sm font-bold h-11 px-7 w-full group"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1.5" />
                          <span>{t("تفعيل حسابي", "Activate My Account")}</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
                    {t(
                      "بإكمال هذا النموذج فأنت توافق على شروط Lumos.",
                      "By completing this form you agree to the Lumos Terms.",
                    )}{" "}
                    <Link to="/terms-and-conditions" className="text-primary hover:underline">
                      {t("اقرأ الشروط", "Read Terms")}
                    </Link>
                  </p>
                </form>
              </Form>
            </div>

            {/* Subtle hint that login is the next step if they revisit */}
            {isAuthenticated ? null : (
              <p className="text-xs text-muted-foreground/60 text-center mt-4">
                <Mail className="inline w-3.5 h-3.5 mr-1 align-text-bottom" />
                {t(
                  "إذا فُقدت الجلسة، اطلب من Lumos إرسال دعوة جديدة.",
                  "If your session is lost, ask Lumos to resend the invitation.",
                )}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
