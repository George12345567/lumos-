import { useState, FormEvent, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle, AlertCircle, LogIn, User, Building2, Briefcase, Wrench, MessageSquare, Send, Phone, X } from "lucide-react";
import { saveContact } from "@/services/db";
import { useLanguage } from "@/context/LanguageContext";
import { authService } from "@/services/authService";
import { useIsAuthenticated } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const EnhancedContact = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    businessName: "",
    industry: "",
    serviceNeeded: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhoneRegistered, setIsPhoneRegistered] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  const { isArabic, t } = useLanguage();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();

  // Debounced check for phone registration
  useEffect(() => {
    const checkPhone = async () => {
      const cleaned = formData.phone.trim();
      // Most valid numbers have at least 8 digits
      if (cleaned.length < 8) {
        setIsPhoneRegistered(false);
        setIsCheckingPhone(false);
        return;
      }

      setIsCheckingPhone(true);
      try {
        const isRegistered = await authService.checkIfPhoneIsRegistered(cleaned);
        setIsPhoneRegistered(isRegistered);
      } catch (error) {
        console.error("Error checking phone:", error);
      } finally {
        setIsCheckingPhone(false);
      }
    };

    const timer = setTimeout(checkPhone, 800);
    return () => clearTimeout(timer);
  }, [formData.phone, isAuthenticated]);

  // Validation functions
  const isValidPhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 11 && cleaned.startsWith('01');
  };

  const isValidEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate phone number - must be 11 digits and start with 01
    if (!formData.phone) {
      toast.error(t("من فضلك أدخل رقم الهاتف", "Please enter your phone number"));
      return;
    }

    if (!isValidPhoneNumber(formData.phone)) {
      toast.error(t("رقم الهاتف يجب أن يكون 11 رقم ويبدأ بـ 01", "Phone number must be 11 digits and start with 01"));
      return;
    }

    // Validate email format if provided
    if (formData.businessName && formData.businessName.includes('@') && !isValidEmail(formData.businessName)) {
      toast.error(t("البريد الإلكتروني غير صحيح", "Invalid email address"));
      return;
    }

    // Validate name (at least 2 characters)
    if (formData.name.trim().length < 2) {
      toast.error(t("من فضلك أدخل اسمك الكامل", "Please enter your full name"));
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to Supabase - PRIMARY METHOD
      let supabaseSuccess = false;
      try {
        const supabaseResult = await saveContact({
          name: formData.name,
          phone: formData.phone,
          message: formData.message,
          business_name: formData.businessName,
          industry: formData.industry,
          service_needed: formData.serviceNeeded,
        });

        if (supabaseResult.success) {
          supabaseSuccess = true;
          console.log('Contact saved to database successfully');
        }
      } catch (supaError) {
        console.error('Supabase save error:', supaError);
        toast.error(t('حدث خطأ في حفظ البيانات', 'Error saving data'));
        return;
      }

      if (!supabaseSuccess) {
        toast.error(t('فشل في حفظ البيانات', 'Failed to save data'));
        return;
      }

      // Show success message or Registration Prompt
      if (!isPhoneRegistered && !isAuthenticated) {
        setShowSignupModal(true);
      } else {
        toast.success(t('تم إرسال الرسالة بنجاح وسنتواصل معك قريبًا', 'Message sent successfully! We\'ll be in touch soon 🎉'), { duration: 5000 });
      }

      // Reset form
      setFormData({
        name: "",
        phone: "",
        businessName: "",
        industry: "",
        serviceNeeded: "",
        message: "",
      });
    } catch (error) {
      const errorMessage =
        typeof error === "object" && error !== null && "text" in error
          ? (error as { text?: string }).text
          : (error as Error | undefined)?.message ?? "Please try again";
      toast.error(t(`حدث خطأ ما: ${errorMessage}`, `Something went wrong: ${errorMessage}`));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-background">
      <div className="container mx-auto max-w-4xl" dir={isArabic ? 'rtl' : 'ltr'}>
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 sm:mb-4 text-foreground reveal px-2">
          {t('دعنا نبني شيئًا', 'Let\'s Build Something')} <span className="text-primary">{t('مميزًا', 'Great')}</span>
        </h2>
        <p className="text-center text-foreground/80 mb-8 sm:mb-10 lg:mb-12 text-sm sm:text-base lg:text-lg reveal px-2">
          {t('املأ النموذج وسنتواصل معك في أقرب وقت', 'Fill out the form and we\'ll get in touch with you shortly')}
        </p>

        <form
          onSubmit={handleSubmit}
          className="glass-card p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl shadow-2xl space-y-6 sm:space-y-8 reveal bg-card glow-ring relative overflow-hidden"
        >
          {/* Subtle background decoration inside the card */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base">
                <User className="w-4 h-4 text-primary" />
                {t('اسمك', 'Your Name')} <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                autoComplete="name"
                className="w-full px-4 py-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-foreground text-sm sm:text-base hover:border-primary/50"
                placeholder={t('الاسم الكامل', 'John Doe')}
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base">
                <Phone className="w-4 h-4 text-primary" />
                {t('رقم الهاتف', 'Phone Number')} <span className="text-primary">*</span>
              </label>
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2 text-left" dir="ltr">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value.replace(/[^\d\s()+-]/g, '') })
                  }
                  className={`w-full px-4 py-3 bg-background/50 backdrop-blur-sm border rounded-xl focus:outline-none focus:ring-2 transition-all text-foreground text-sm sm:text-base hover:border-primary/50 text-left placeholder:text-left ${
                    formData.phone && isValidPhoneNumber(formData.phone)
                      ? 'border-emerald-500 focus:ring-emerald-300 focus:border-emerald-500'
                      : formData.phone && !isValidPhoneNumber(formData.phone)
                        ? 'border-red-400 focus:ring-red-300 focus:border-red-400'
                        : 'border-border/50 focus:ring-primary/30 focus:border-primary'
                  }`}
                  placeholder={isArabic ? "مثال: 01234567890" : "Example: 01234567890"}
                  required
                />
              </div>
              
              {/* Phone validation hints */}
              {formData.phone && !isValidPhoneNumber(formData.phone) && (
                <div className="flex items-center gap-2 text-xs text-red-500">
                  <X className="w-3 h-3" />
                  <span>{isArabic ? 'يجب أن يكون 11 رقم ويبدأ بـ 01' : 'Must be 11 digits starting with 01'}</span>
                </div>
              )}
              {formData.phone && isValidPhoneNumber(formData.phone) && (
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <CheckCircle className="w-3 h-3" />
                  <span>{isArabic ? 'رقم الهاتف صحيح' : 'Valid phone number'}</span>
                </div>
              )}

              <div className="mt-1">
                {isCheckingPhone && (
                  <p className="text-xs text-muted-foreground animate-pulse px-1">
                    {t("يتم التحقق من الرقم...", "Checking number...")}
                  </p>
                )}

                {isPhoneRegistered && !isAuthenticated && !isCheckingPhone && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-4 mt-2 shadow-inner">
                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground text-sm">
                        {t("هذا الرقم مسجل لدينا!", "This number is already registered!")}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed mb-3">
                        {t("بإمكانك تسجيل الدخول ليتم ربط هذا الطلب بحسابك بشكل تلقائي.", "You can log in to link this request to your account automatically.")}
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="gap-2 text-xs h-9 px-4 rounded-lg shadow-md hover:shadow-lg transition-all"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent("lumos:login-open"));
                        }}
                      >
                        <LogIn className="w-4 h-4" />
                        {t("تسجيل الدخول", "Log In")}
                      </Button>
                    </div>
                  </div>
                )}

                {isPhoneRegistered && isAuthenticated && !isCheckingPhone && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 mt-2 shadow-inner">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {t("مرحباً بعودتك! سيتم ربط طلبك بحسابك.", "Welcome back! Your request will be linked to your account.")}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Business Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base">
                <Building2 className="w-4 h-4 text-primary" />
                {t('اسم الشركة / النشاط', 'Company / Business Name')} <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                className="w-full px-4 py-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-foreground text-sm sm:text-base hover:border-primary/50"
                placeholder={t('اسم شركتك أو نشاطك', 'Your Business Name')}
                required
              />
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base">
                <Briefcase className="w-4 h-4 text-primary" />
                {t('القطاع', 'Industry')} <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-foreground text-sm sm:text-base appearance-none cursor-pointer hover:border-primary/50"
                  required
                >
                  <option value="" disabled>{t('اختر القطاع', 'Select Industry')}</option>
                  <option value="restaurant">{t('مطعم / كافيه', 'Restaurant / Cafe')}</option>
                  <option value="retail">{t('تجزئة / تجارة إلكترونية', 'Retail / E-commerce')}</option>
                  <option value="factory">{t('مصنع / صناعي', 'Factory / Industrial')}</option>
                  <option value="realestate">{t('عقارات', 'Real Estate')}</option>
                  <option value="healthcare">{t('رعاية صحية / عيادة', 'Healthcare / Clinic')}</option>
                  <option value="education">{t('تعليم', 'Education')}</option>
                  <option value="salon">{t('صالون / تجميل', 'Salon / Beauty')}</option>
                  <option value="pharmacy">{t('صيدلية', 'Pharmacy')}</option>
                  <option value="other">{t('أخرى', 'Other')}</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* Service Needed */}
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base">
                <Wrench className="w-4 h-4 text-primary" />
                {t('الخدمة المطلوبة', 'Service Needed')} <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.serviceNeeded}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceNeeded: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-foreground text-sm sm:text-base appearance-none cursor-pointer hover:border-primary/50"
                  required
                >
                  <option value="" disabled>{t('اختر الخدمة', 'Select Service')}</option>
                  <option value="web">{t('تطوير ويب', 'Web Development')}</option>
                  <option value="media">{t('إنتاج إعلامي', 'Media Production')}</option>
                  <option value="social">{t('إدارة سوشيال ميديا', 'Social Media Management')}</option>
                  <option value="package">{t('باقة كاملة', 'Full Package (All Services)')}</option>
                  <option value="consultation">{t('استشارة فقط', 'Consultation Only')}</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base">
                <MessageSquare className="w-4 h-4 text-primary" />
                {t('الرسالة / التفاصيل', 'Message / Details')} <span className="text-primary">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="w-full px-4 py-3 bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-foreground min-h-[120px] sm:min-h-[140px] text-sm sm:text-base resize-none hover:border-primary/50"
                placeholder={t('احك لنا عن مشروعك بالتفصيل هنا...', 'Tell us about your project in detail here...')}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="relative z-10 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-glow text-foreground py-4 rounded-xl text-base sm:text-lg font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover-lift relative overflow-hidden group flex items-center justify-center gap-3"
            >
              <span className="relative z-10">{isSubmitting ? t('جارٍ الإرسال...', 'Sending...') : t('إرسال الطلب', 'Send Request')}</span>
              {!isSubmitting && <Send className="relative z-10 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform rtl:group-hover:-translate-x-1 rtl:group-hover:-translate-y-1" />}
              <span className="absolute inset-0 bg-gradient-to-r from-primary/40 via-primary/60 to-transparent shimmer-line opacity-60 pointer-events-none" />
            </button>
          </div>
        </form>

        {/* Suggest Signup Modal on Success for New Users */}
        {showSignupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-border/50 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                {t("تم إرسال طلبك بنجاح!", "Your request was sent successfully!")}
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base mb-6 leading-relaxed">
                {t("لقد لاحظنا أنك مستخدم جديد. هل ترغب في إنشاء حساب لدينا لمتابعة حالة طلبك وتسهيل التواصل في المستقبل؟", "We noticed you are a new user. Would you like to create an account to track your request status and ease future communication?")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="default"
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    setShowSignupModal(false);
                    navigate("/client-signup");
                  }}
                >
                  {t("نعم، إنشاء حساب", "Yes, create an account")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setShowSignupModal(false)}
                >
                  {t("لا شكراً، ربما لاحقاً", "No thanks, maybe later")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default EnhancedContact;
