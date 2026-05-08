import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  MailCheck,
  RefreshCw,
  Check,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuthConfigured } from "@/context/AuthContext";
import {
  resendConfirmationSchema,
  forgotPasswordSecuritySchema,
  ALLOWED_SECURITY_QUESTIONS,
  notDisposable,
  type ResendConfirmationInput,
  type ForgotPasswordSecurityInput,
} from "@/lib/validation";
import { ROUTES } from "@/lib/constants";
import { forgotPasswordCheckEmail, forgotPasswordSendReset, verifySecurityQuestion } from "@/services/authService";

const STEPS = [
  { key: "email", ar: "البريد الإلكتروني", en: "Email", icon: Mail, descAr: "أدخل بريدك الإلكتروني المسجّل", descEn: "Enter your registered email" },
  { key: "security", ar: "التحقق الأمني", en: "Security Check", icon: ShieldCheck, descAr: "أجب على سؤال الأمان", descEn: "Answer your security question" },
] as const;

function FieldIcon({ value, error, touched }: { value: string | undefined; error: string | undefined; touched: boolean }) {
  if (!touched || !value) return null;
  if (error) return <XCircle className="w-4 h-4 text-destructive shrink-0 animate-in fade-in duration-200" />;
  return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-in fade-in duration-200" />;
}

function ic(hasErr: boolean, isValid: boolean, isTouched: boolean) {
  const base = "w-full bg-background/50 backdrop-blur-sm rounded-xl transition-all duration-300 text-sm h-11 text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2";
  let ring = " focus-visible:ring-primary/30 focus-visible:border-primary hover:border-primary/40";
  let border = "border-border/40";
  if (isTouched && hasErr) { border = "border-destructive/60"; ring = " focus-visible:ring-destructive/30 focus-visible:border-destructive"; }
  else if (isTouched && isValid) { border = "border-emerald-500/50"; ring = " focus-visible:ring-emerald-400/20 focus-visible:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.08)]"; }
  return `${base} ${border}${ring} px-4`;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
}

function CheckEmailScreen({ email, t, isArabic }: { email: string; t: (a: string, e: string) => string; isArabic: boolean }) {
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const result = await forgotPasswordSendReset(email);
      if (result.success) {
        toast.success(t("تم إعادة إرسال الإيميل", "Reset email resent"));
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
      } else if (result.error === "login.rate_limited") {
        // Supabase recover endpoint returned 429. Cool the button down for a
        // full minute so we don't pile on more requests.
        toast.error(
          t(
            "محاولات كثيرة. الرجاء الانتظار بضع دقائق قبل المحاولة مجدداً.",
            "Too many attempts. Please wait a few minutes before trying again.",
          ),
        );
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
    } finally {
      setIsResending(false);
    }
  }, [email, resendCooldown, isResending, t]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center py-6">
      <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-6">
        <MailCheck className="w-10 h-10 text-emerald-400" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{t("تحقق من بريدك الإلكتروني", "Check Your Email")}</h3>
      <p className="text-muted-foreground text-sm mb-1">
        {t("تم إرسال رابط إعادة تعيين كلمة المرور إلى", "A password reset link has been sent to")}
      </p>
      <p className="text-primary font-semibold text-sm mb-4">{maskEmail(email)}</p>
      <p className="text-muted-foreground/60 text-xs mb-6 max-w-xs mx-auto">
        {t("إذا كان هذا البريد مسجلاً لدينا، ستصلك رسالة خلال بضع دقائق. تحقق من مجلد البريد المزعج أيضاً.", "If this email is registered with us, you'll receive a message within a few minutes. Check your spam folder too.")}
      </p>

      <button
        type="button"
        onClick={handleResend}
        disabled={resendCooldown > 0 || isResending}
        className="text-sm text-primary/70 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4 inline-flex items-center gap-1.5"
      >
        {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        {resendCooldown > 0
          ? t(`إعادة الإرسال بعد ${resendCooldown} ثانية`, `Resend in ${resendCooldown}s`)
          : t("إعادة إرسال الرابط", "Resend link")
        }
      </button>

      <div className="h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent my-4" />
      <div className="flex items-center justify-center gap-1.5 text-sm">
        <span className="text-muted-foreground/60">{t("تذكرت كلمة المرور؟", "Remember your password?")}</span>
        <Link to={ROUTES.CLIENT_LOGIN} className="text-primary/80 hover:text-primary transition-colors hover:underline font-medium flex items-center gap-0.5">
          <span>{t("تسجيل الدخول", "Sign in")}</span>
          {isArabic ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
        </Link>
      </div>
    </motion.div>
  );
}

export default function ForgotPasswordPage() {
  const { t, isArabic } = useLanguage();
  const authConfigured = useAuthConfigured();

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [hasSecurityQuestion, setHasSecurityQuestion] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState("");

  const emailForm = useForm<ResendConfirmationInput>({
    resolver: zodResolver(resendConfirmationSchema),
    mode: "onTouched",
    defaultValues: { email: "" },
  });

  const securityForm = useForm<ForgotPasswordSecurityInput>({
    resolver: zodResolver(forgotPasswordSecuritySchema),
    mode: "onTouched",
    defaultValues: { securityQuestion: "", securityAnswer: "" },
  });

  const { watch: emailWatch, formState: { errors: emailErrors, touchedFields: emailTouched } } = emailForm;
  const emailVal = emailWatch("email");

  const securityQuestions = Array.from(ALLOWED_SECURITY_QUESTIONS);

  const goToStep = useCallback((step: number) => {
    if (step > currentStep) setDirection(1);
    else setDirection(-1);
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  const onEmailSubmit = async (data: ResendConfirmationInput) => {
    if (!authConfigured) {
      toast.error(
        t(
          "نظام إعادة التعيين غير مهيأ. يرجى التواصل مع دعم Lumos.",
          "Password reset is not configured. Please contact Lumos support.",
        ),
      );
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // We deliberately ignore the security-question branch — the secure
      // verifier requires a server-side Edge Function (see SUPABASE_SECURITY_SETUP.md).
      // Until that is in place, we always fall back to the Supabase email reset link.
      await forgotPasswordCheckEmail(data.email);
      setUserEmail(data.email);
      setHasSecurityQuestion(false);
      setSecurityQuestion("");

      const sendResult = await forgotPasswordSendReset(data.email);
      if (sendResult.success) {
        setEmailSent(true);
      } else if (sendResult.error === "auth.not_configured") {
        toast.error(
          t(
            "نظام إعادة التعيين غير مهيأ. يرجى التواصل مع دعم Lumos.",
            "Password reset is not configured. Please contact Lumos support.",
          ),
        );
      } else if (sendResult.error === "login.rate_limited") {
        toast.error(
          t(
            "محاولات كثيرة. الرجاء الانتظار بضع دقائق قبل المحاولة مجدداً.",
            "Too many attempts. Please wait a few minutes before trying again.",
          ),
        );
      } else {
        toast.error(t("فشل إرسال رابط إعادة التعيين", "Failed to send reset link"));
      }
    } catch {
      toast.error(t("حدث خطأ غير متوقع", "An unexpected error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSecuritySubmit = async (_data: ForgotPasswordSecurityInput) => {
    // Frontend security-question verification has been disabled because it
    // would require shipping a stored hash to the browser. We always fall
    // back to the Supabase email-reset flow. See SUPABASE_SECURITY_SETUP.md.
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Touch the helper so the contract is exercised, but never trust its result.
      void verifySecurityQuestion(userEmail, _data.securityAnswer);
      const sendResult = await forgotPasswordSendReset(userEmail);
      if (sendResult.success) {
        setEmailSent(true);
      } else if (sendResult.error === "login.rate_limited") {
        toast.error(
          t(
            "محاولات كثيرة. الرجاء الانتظار بضع دقائق قبل المحاولة مجدداً.",
            "Too many attempts. Please wait a few minutes before trying again.",
          ),
        );
      } else {
        toast.error(t("فشل إرسال رابط إعادة التعيين", "Failed to send reset link"));
      }
    } catch {
      toast.error(t("حدث خطأ غير متوقع", "An unexpected error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
        <EnhancedNavbar />
        <section className="relative pt-24 sm:pt-28 pb-12 px-4 sm:px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-[hsl(150,100%,40%)]/8 blur-[100px] animate-orb" />
            <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#00bcd4]/6 blur-[80px] animate-orb-delayed" />
          </div>
          <div className="container mx-auto max-w-md relative z-10" dir={isArabic ? "rtl" : "ltr"}>
            <div className="glass-card rounded-2xl glow-border-hover p-6 sm:p-8">
              <CheckEmailScreen email={userEmail} t={t} isArabic={isArabic} />
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const activeStepForIndicator = hasSecurityQuestion ? currentStep : Math.min(currentStep + 1, 2);

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
              {t("استعادة الحساب", "ACCOUNT RECOVERY")}
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
            {t("نسيت كلمة المرور؟", "Forgot Password?")}{" "}
            <span className="text-primary">{t("لا تقلق", "No worries")}</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-base md:text-lg mt-3 max-w-xl mx-auto">
            {t("سنقوم بإرشادك خطوة بخطوة لاستعادة حسابك", "We'll guide you step by step to recover your account")}
          </motion.p>

          <div className="mt-6 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent shimmer-line" />
        </div>
      </section>

      {/* ─── Step Indicator (only show if security question exists) ─── */}
      {hasSecurityQuestion && currentStep < 2 && (
        <section className="px-4 sm:px-6 pb-6 sm:pb-8">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center justify-center gap-0">
              {[0, 1].map((i) => {
                const isCompleted = i < currentStep;
                const isActive = i === currentStep;
                const StepIcon = i === 0 ? Mail : ShieldCheck;
                const labels = [
                  { ar: "البريد", en: "Email" },
                  { ar: "التحقق", en: "Verify" },
                ];
                return (
                  <div key={i} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <motion.div
                        animate={{ scale: isActive ? 1.1 : 1, backgroundColor: isActive || isCompleted ? "hsl(150,100%,40%)" : "hsla(150,20%,20%,0.4)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-shadow duration-300 ${isActive ? "shadow-[0_0_20px_hsla(150,100%,40%,0.4)]" : isCompleted ? "shadow-[0_0_10px_hsla(150,100%,40%,0.2)]" : ""}`}
                      >
                        {isCompleted ? <Check className="w-4 h-4 text-primary-foreground" /> : <StepIcon className={`w-4 h-4 transition-colors ${isActive ? "text-primary-foreground" : "text-muted-foreground/60"}`} />}
                      </motion.div>
                      <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap transition-colors duration-300 ${isActive || isCompleted ? "text-primary" : "text-muted-foreground/40"}`}>{t(labels[i].ar, labels[i].en)}</span>
                    </div>
                    {i < 1 && (
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
          </div>
        </section>
      )}

      {/* ─── Step Content ─── */}
      <section className="px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20">
        <div className="container mx-auto max-w-md">
          {!authConfigured && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-amber-300/50 bg-amber-50 p-3 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                {t(
                  "نظام إعادة التعيين غير مهيأ. يرجى التواصل مع دعم Lumos.",
                  "Password reset is not configured. Please contact Lumos support.",
                )}
              </p>
            </div>
          )}
          <div className="glass-card rounded-2xl glow-border-hover p-6 sm:p-8">
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="hidden"><button type="submit" /></form>
            </Form>
            <Form {...securityForm}>
              <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="hidden"><button type="submit" /></form>
            </Form>

            <AnimatePresence mode="wait" custom={direction}>
              {/* ─── Step 0: Email ─── */}
              {currentStep === 0 && (
                <motion.div key="email" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{t("البريد الإلكتروني", "Email Address")}</h2>
                      <p className="text-xs text-muted-foreground/60">{t("أدخل البريد المرتبط بحسابك", "Enter the email linked to your account")}</p>
                    </div>
                  </div>

                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5" noValidate>
                      <FormField control={emailForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                            <Mail className="w-3.5 h-3.5 text-primary" />
                            {t("البريد الإلكتروني", "Email Address")}
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="you@company.com"
                                className={ic(!!emailErrors.email, !emailErrors.email && !!emailVal && notDisposable(emailVal), !!emailTouched.email)}
                                {...field}
                              />
                            </FormControl>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <FieldIcon value={field.value} error={emailErrors.email?.message} touched={!!emailTouched.email} />
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground/50">{t("سنرسل لك رابط إعادة التعيين إذا كان البريد مسجلاً", "We'll send a reset link if this email is registered")}</p>
                          <FormMessage>{emailErrors.email && (emailErrors.email.message === "email.required" ? t("البريد الإلكتروني مطلوب", "Email is required") : emailErrors.email.message === "email.invalid" ? t("صيغة البريد غير صحيحة", "Please enter a valid email") : emailErrors.email.message === "email.disposable_not_allowed" ? t("لا يمكن استخدام بريد مؤقت", "Disposable emails are not allowed") : emailErrors.email.message)}</FormMessage>
                        </FormItem>
                      )} />

                      <div className="pt-2">
                        <Button type="submit" disabled={isSubmitting || !authConfigured} className="btn-glow glow-ring rounded-full text-sm font-bold h-11 px-7 w-full group">
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <>
                              <span>{t("متابعة", "Continue")}</span>
                              {isArabic ? <ArrowLeft className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" /> : <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* ─── Step 1: Security Question (only if client has one) ─── */}
              {currentStep === 1 && hasSecurityQuestion && (
                <motion.div key="security" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{t("التحقق الأمني", "Security Verification")}</h2>
                      <p className="text-xs text-muted-foreground/60">{t("أجب على سؤال الأمان الذي اخترته عند التسجيل", "Answer the security question you chose during signup")}</p>
                    </div>
                  </div>

                  <Form {...securityForm}>
                    <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-5" noValidate>
                      {/* Pre-filled security question (read-only) */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                          {t("سؤال الأمان", "Security Question")}
                        </label>
                        <div className="w-full bg-background/50 backdrop-blur-sm border border-border/40 rounded-xl px-4 h-11 flex items-center text-sm text-foreground/80">
                          {securityQuestion}
                        </div>
                      </div>

                      <FormField control={securityForm.control} name="securityAnswer" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                            <Lock className="w-3.5 h-3.5 text-primary" />
                            {t("إجابة سؤال الأمان", "Security Answer")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("إجابتك السرية", "Your secret answer")}
                              className={ic(!!securityForm.formState.errors.securityAnswer, !!securityForm.formState.touchedFields.securityAnswer && !securityForm.formState.errors.securityAnswer && field.value.length > 0, !!securityForm.formState.touchedFields.securityAnswer)}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="pt-2 flex items-center gap-3">
                        <Button type="button" variant="outline" onClick={() => goToStep(0)} className="rounded-xl border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all text-sm h-11 px-5">
                          {isArabic ? <ArrowRight className="w-4 h-4 ml-1" /> : <ArrowLeft className="w-4 h-4 mr-1" />}
                          {t("رجوع", "Back")}
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="btn-glow glow-ring rounded-full text-sm font-bold h-11 px-7 flex-1 group">
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <>
                              <span>{t("متابعة", "Continue")}</span>
                              {isArabic ? <ArrowLeft className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" /> : <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Footer ─── */}
            <div className="mt-6 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
            <div className="mt-4 flex items-center justify-center gap-1.5 text-sm">
              <span className="text-muted-foreground/60">{t("تذكرت كلمة المرور؟", "Remember your password?")}</span>
              <Link to={ROUTES.CLIENT_LOGIN} className="text-primary/80 hover:text-primary transition-colors hover:underline font-medium flex items-center gap-0.5">
                <span>{t("تسجيل الدخول", "Sign in")}</span>
                {isArabic ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}