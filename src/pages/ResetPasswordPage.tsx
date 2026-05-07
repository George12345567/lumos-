import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  Loader2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  KeyRound,
  Check,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  resetPasswordSchema,
  getPasswordStrength,
  getPasswordRules,
  isStrongPassword,
  type ResetPasswordInput,
} from "@/lib/validation";
import { ROUTES } from "@/lib/constants";
import { resetPassword, getSession } from "@/services/authService";

function ic(hasErr: boolean, isValid: boolean, isTouched: boolean) {
  const base = "w-full bg-background/50 backdrop-blur-sm rounded-xl transition-all duration-300 text-sm h-11 text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2";
  let ring = " focus-visible:ring-primary/30 focus-visible:border-primary hover:border-primary/40";
  let border = "border-border/40";
  if (isTouched && hasErr) { border = "border-destructive/60"; ring = " focus-visible:ring-destructive/30 focus-visible:border-destructive"; }
  else if (isTouched && isValid) { border = "border-emerald-500/50"; ring = " focus-visible:ring-emerald-400/20 focus-visible:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.08)]"; }
  return `${base} ${border}${ring} px-4`;
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

export default function ResetPasswordPage() {
  const { t, isArabic } = useLanguage();
  const authConfigured = useAuthConfigured();

  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function check() {
      if (!authConfigured) {
        setIsValidSession(false);
        setIsChecking(false);
        return;
      }
      try {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.slice(1));
        const tokenType = params.get("type");
        if (tokenType && tokenType !== "recovery") {
          setIsValidSession(false);
          setIsChecking(false);
          return;
        }

        const session = await getSession();
        setIsValidSession(!!session);
      } catch {
        setIsValidSession(false);
      } finally {
        setIsChecking(false);
      }
    }
    check();
  }, [authConfigured]);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });

  const { watch, formState: { errors, touchedFields } } = form;
  const newPassword = watch("newPassword");
  const confirmNewPassword = watch("confirmNewPassword");

  const onSubmit = useCallback(async (data: ResetPasswordInput) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await resetPassword(data.newPassword);
      if (result.success) {
        toast.success(t("تم إعادة تعيين كلمة المرور بنجاح!", "Password reset successfully!"));
        setIsComplete(true);
        setTimeout(() => navigate(ROUTES.CLIENT_LOGIN), 3000);
      } else if (result.error === "auth.not_configured") {
        toast.error(
          t(
            "نظام إعادة التعيين غير مهيأ. يرجى التواصل مع دعم Lumos.",
            "Password reset is not configured. Please contact Lumos support.",
          ),
        );
      } else {
        toast.error(t("فشل إعادة تعيين كلمة المرور", "Failed to reset password"));
      }
    } catch {
      toast.error(t("حدث خطأ غير متوقع", "An unexpected error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  }, [t, navigate, isSubmitting]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center" dir={isArabic ? "rtl" : "ltr"}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("جارٍ التحقق...", "Verifying...")}</p>
        </div>
      </div>
    );
  }

  if (isValidSession === false) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
        <EnhancedNavbar />
        <section className="relative pt-24 sm:pt-28 pb-12 px-4 sm:px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-destructive/8 blur-[100px] animate-orb" />
          </div>
          <div className="container mx-auto max-w-md relative z-10 text-center" dir={isArabic ? "rtl" : "ltr"}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <div className="glass-card rounded-2xl glow-border-hover p-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center mb-6">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">{t("الرابط غير صالح", "Invalid Link")}</h2>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                  {t("رابط إعادة التعيين منتهي الصلاحية أو غير صالح. اطلب رابطاً جديداً.", "This reset link has expired or is invalid. Please request a new one.")}
                </p>
                <Link to={ROUTES.FORGOT_PASSWORD}>
                  <Button variant="outline" className="rounded-xl border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all text-sm h-11 px-6">
                    {t("طلب رابط جديد", "Request new link")}
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

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
        <EnhancedNavbar />
        <section className="relative pt-24 sm:pt-28 pb-12 px-4 sm:px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-[hsl(150,100%,40%)]/8 blur-[100px] animate-orb" />
            <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#00bcd4]/6 blur-[80px] animate-orb-delayed" />
          </div>
          <div className="container mx-auto max-w-md relative z-10 text-center" dir={isArabic ? "rtl" : "ltr"}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <div className="glass-card rounded-2xl glow-border-hover p-8">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-6">
                  <Check className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">{t("تم إعادة تعيين كلمة المرور!", "Password Reset Complete!")}</h2>
                <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">{t("يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.", "You can now sign in with your new password.")}</p>
                <Link to={ROUTES.CLIENT_LOGIN}>
                  <Button className="btn-glow glow-ring rounded-full text-sm font-bold h-11 px-7 mt-2">
                    <span>{t("تسجيل الدخول", "Sign In")}</span>
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

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
      <EnhancedNavbar />

      <section className="relative pt-24 sm:pt-28 pb-8 sm:pb-12 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-[hsl(150,100%,40%)]/8 blur-[100px] animate-orb" />
          <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#00bcd4]/6 blur-[80px] animate-orb-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full bg-[hsl(150,100%,40%)]/3 blur-[60px] animate-pulse" />
        </div>

        <div className="container mx-auto max-w-4xl relative z-10 text-center" dir={isArabic ? "rtl" : "ltr"}>
          <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase shadow-[0_0_12px_rgba(0,188,212,0.1)] mb-4">
              {t("إعادة تعيين كلمة المرور", "RESET PASSWORD")}
            </span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl font-extrabold leading-tight">
            {t("كلمة مرور جديدة", "New Password")}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-base mt-3 max-w-xl mx-auto">
            {t("اختر كلمة مرور قوية لحسابك", "Choose a strong new password for your account")}
          </motion.p>
          <div className="mt-6 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent shimmer-line" />
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20">
        <div className="container mx-auto max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <div className="glass-card rounded-2xl glow-border-hover p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{t("تعيين كلمة مرور جديدة", "Set New Password")}</h2>
                  <p className="text-xs text-muted-foreground/60">{t("كلمة المرور يجب أن تكون 8 أحرف على الأقل وأحرف كبيرة وصغيرة وأرقام", "Password must be 8+ chars with uppercase, lowercase & numbers")}</p>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <FormField control={form.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                        <Lock className="w-3.5 h-3.5 text-primary" />
                        {t("كلمة المرور الجديدة", "New Password")}
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className={`${ic(!!errors.newPassword, !errors.newPassword && !!newPassword && isStrongPassword(newPassword), !!touchedFields.newPassword)} ${showNewPassword ? "" : "!pr-10"}`}
                            {...field}
                          />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 ${isArabic ? "right-3" : "!right-3 !left-auto"}`}
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordStrength password={newPassword} confirmPassword={confirmNewPassword} t={t} />
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="confirmNewPassword" render={({ field }) => (
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
                            className={`${ic(!!errors.confirmNewPassword, !errors.confirmNewPassword && !!confirmNewPassword && newPassword === confirmNewPassword, !!touchedFields.confirmNewPassword)} ${showConfirmPassword ? "" : "!pr-10"}`}
                            {...field}
                          />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 ${isArabic ? "right-3" : "!right-3 !left-auto"}`}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="pt-2">
                    <Button type="submit" disabled={isSubmitting || !authConfigured} className="btn-glow glow-ring rounded-full text-sm font-bold h-11 px-7 w-full group">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <>
                          <Check className="w-4 h-4 mr-1.5" />
                          <span>{t("إعادة تعيين كلمة المرور", "Reset Password")}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}