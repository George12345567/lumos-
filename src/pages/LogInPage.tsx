import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  Loader2,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAuth } from "@/context/AuthContext";
import { loginSchema, type LoginInput } from "@/lib/validation";

function F(field: keyof LoginInput, t: (a: string, e: string) => string): string {
  const m: Record<keyof LoginInput, [string, string]> = {
    usernameOrEmail: ["اسم المستخدم أو البريد الإلكتروني", "Username or Email"],
    password: ["كلمة المرور", "Password"],
  };
  return t(...m[field]);
}

function P(field: keyof LoginInput, t: (a: string, e: string) => string): string {
  const m: Partial<Record<keyof LoginInput, [string, string]>> = {
    usernameOrEmail: ["اسم المستخدم أو البريد", "Enter username or email"],
  };
  const p = m[field];
  return p ? t(...p) : "";
}

function E(code: string, t: (a: string, e: string) => string): string {
  const m: Record<string, [string, string]> = {
    "login.identifier_required": ["يرجى إدخال اسم المستخدم أو البريد الإلكتروني", "Please enter your username or email"],
    "password.required": ["كلمة المرور مطلوبة", "Password is required"],
  };
  const p = m[code];
  return p ? t(...p) : code;
}

function FieldIcon({ value, error, touched }: { value: string | undefined; error: string | undefined; touched: boolean }) {
  if (!touched || !value) return null;
  if (error) return <XCircle className="w-4 h-4 text-destructive shrink-0 animate-in fade-in duration-200" />;
  return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-in fade-in duration-200" />;
}

function ic(hasErr: boolean, isValid: boolean, isTouched: boolean) {
  const base = "w-full bg-background/50 backdrop-blur-sm rounded-xl transition-all duration-300 text-sm h-11 text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2";
  let ring = " focus-visible:ring-primary/30 focus-visible:border-primary hover:border-primary/40";
  let border = "border-border/40";
  if (isTouched && hasErr) {
    border = "border-destructive/60";
    ring = " focus-visible:ring-destructive/30 focus-visible:border-destructive";
  } else if (isTouched && isValid) {
    border = "border-emerald-500/50";
    ring = " focus-visible:ring-emerald-400/20 focus-visible:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.08)]";
  }
  return `${base} ${border}${ring} px-4`;
}

export default function LogInPage() {
  const { t, isArabic } = useLanguage();
  const { login } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      usernameOrEmail: "",
      password: "",
    },
  });

  const { watch, formState: { errors, touchedFields } } = form;
  const usernameOrEmailVal = watch("usernameOrEmail");
  const passwordVal = watch("password");

  const onSubmit = useCallback(async (_data: LoginInput) => {
    setIsSubmitting(true);
    try {
      const result = await login();
      if (result.success) {
        toast.success(t("تم تسجيل الدخول بنجاح!", "Logged in successfully!"));
      } else {
        toast.info(t("سيتم تفعيل تسجيل الدخول قريباً — هذه نسخة تجريبية", "Login will be available soon — this is a preview"), {
          description: t("شكراً لاهتمامك بـ Lumos!", "Thank you for your interest in Lumos!"),
        });
      }
    } catch {
      toast.error(t("حدث خطأ غير متوقع", "An unexpected error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  }, [login, t]);

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
              {t("شريكك الرقمي", "YOUR DIGITAL PARTNER")}
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
            {t("مرحباً بعودتك إلى", "Welcome back to")}{" "}
            <span className="text-primary">Lumos</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}
            className="text-muted-foreground text-sm sm:text-base md:text-lg mt-3 max-w-xl mx-auto">
            {t("سجّل دخولك لمتابعة رحلتك الرقمية", "Sign in to continue your digital journey")}
          </motion.p>

          <div className="mt-6 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent shimmer-line" />
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20">
        <div className="container mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="glass-card rounded-2xl glow-border-hover p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {t("تسجيل الدخول", "Sign In")}
                  </h2>
                  <p className="text-xs text-muted-foreground/60">
                    {t("أدخل بياناتك للوصول إلى حسابك", "Enter your credentials to access your account")}
                  </p>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>

                  <FormField
                    control={form.control}
                    name="usernameOrEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <User className="w-3.5 h-3.5 text-primary" />
                          {F("usernameOrEmail", t)}
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              placeholder={P("usernameOrEmail", t)}
                              className={ic(!!errors.usernameOrEmail, !errors.usernameOrEmail && !!usernameOrEmailVal, !!touchedFields.usernameOrEmail)}
                              {...field}
                            />
                          </FormControl>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <FieldIcon value={field.value} error={errors.usernameOrEmail?.message} touched={!!touchedFields.usernameOrEmail} />
                          </div>
                        </div>
                        <FormMessage>{errors.usernameOrEmail && E(errors.usernameOrEmail.message!, t)}</FormMessage>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                          <Lock className="w-3.5 h-3.5 text-primary" />
                          {F("password", t)}
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type={showPassword ? "text" : "password"}
                              className={`${ic(!!errors.password, !errors.password && !!passwordVal, !!touchedFields.password)} ${showPassword ? "" : "!pr-10"}`}
                              {...field}
                            />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1 ${isArabic ? "left-3" : "!right-3 !left-auto"}`}
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FormMessage>{errors.password && E(errors.password.message!, t)}</FormMessage>
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        className="border-border/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                        {t("تذكّرني", "Remember me")}
                      </label>
                    </div>
                    <Link
                      to={ROUTES.FORGOT_PASSWORD}
                      className="text-xs text-primary/70 hover:text-primary transition-colors hover:underline"
                    >
                      {t("نسيت كلمة المرور؟", "Forgot password?")}
                    </Link>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-glow glow-ring rounded-full text-sm font-bold h-11 px-7 w-full group"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <LogIn className="w-4 h-4 mr-1.5" />
                          <span>{t("تسجيل الدخول", "Sign In")}</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

                  <div className="flex items-center justify-center gap-1.5 text-sm">
                    <span className="text-muted-foreground/60">{t("ليس لديك حساب؟", "Don't have an account?")}</span>
                    <Link to="/client-signup" className="text-primary/80 hover:text-primary transition-colors hover:underline font-medium flex items-center gap-0.5">
                      <span>{t("أنشئ حسابك", "Create one")}</span>
                      {isArabic ? <ArrowRight className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                    </Link>
                  </div>
                </form>
              </Form>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="mt-6 text-center"
            >
              <p className="text-[10px] text-muted-foreground/40 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3 h-3" />
                {t("محمي بتشفير 256-بت • خصوصيتك أولويتنا", "Protected with 256-bit encryption • Your privacy is our priority")}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}