import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, MapPin, CheckCircle, MessageCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import emailjs from '@emailjs/browser';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useGeolocation } from "@/hooks";
import { collectBrowserData } from "@/lib/collectBrowserData";
import { saveContact } from "@/services/db";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

const formSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const LeadCapturePopup = () => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [capturedPhone, setCapturedPhone] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);
  const { location, loading: locationLoading, requestLocation } = useGeolocation();
  const routeLocation = useLocation();
  const { isAuthenticated } = useAuth();
  const { isArabic, t } = useLanguage();

  // Pages where the popup should NOT appear
  const blockedPaths = ['/dashboard', '/clients/profile', '/client-login', '/client-signup', '/forgot-password'];
  const isBlockedPage = blockedPaths.some(p => routeLocation.pathname.startsWith(p));

  useEffect(() => {
    // Don't show on protected/blocked pages or for authenticated users
    if (isBlockedPage || isAuthenticated) return;

    const hasShown = sessionStorage.getItem("lumos_lead_popup_shown");
    if (hasShown) return;

    const timer = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem("lumos_lead_popup_shown", "true");
      requestLocation();
    }, 300000); // 5 minutes

    return () => clearTimeout(timer);
  }, [requestLocation, isBlockedPage, isAuthenticated]);

  // Auto-focus first input when dialog opens
  useEffect(() => {
    if (open && firstInputRef.current) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      description: "",
    },
  });

  const sendDataToEmail = async () => {
    const formData = form.getValues();
    const browserData = collectBrowserData();

    const emailData = {
      form_type: 'Lead Capture Popup',
      action: 'Submit',
      name: formData.name || 'Not provided',
      phone: formData.phone || 'Not provided',
      description: formData.description || 'Not provided',
      location: location || 'Location not shared',
      browser: browserData.browser,
      os: browserData.os,
      device_type: browserData.deviceType,
      screen_resolution: browserData.screenResolution,
      viewport_size: browserData.viewportSize,
      language: browserData.language,
      referrer: browserData.referrer,
      timestamp: browserData.timestamp,
      user_agent: browserData.userAgent,
    };

    // Send via EmailJS
    try {
      await emailjs.send(
        'service_qz9ng4q',
        'template_a1gpr19',
        emailData,
        'QSbdI14b9C7c3rBmg'
      );
    } catch (error) {
      // Silent fail — email is supplementary
    }

    // Save to Supabase
    try {
      await saveContact({
        name: formData.name || 'Not provided',
        phone: formData.phone || 'Not provided',
        message: formData.description || 'Lead capture popup submission',
      });
    } catch (error) {
      // Silent fail — email is primary
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    // Send data to email & save to Supabase
    await sendDataToEmail();

    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSuccess(true);
    setTimeout(() => {
      setOpen(false);
      setIsSubmitting(false);
      setIsSuccess(false);
      form.reset();
    }, 2000);
  };

  const handleClose = () => {
    // Privacy-respectful: Don't send any data on cancel
    setOpen(false);
  };

  // Don't render on blocked pages
  if (isBlockedPage || isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] max-w-md p-6 sm:p-8" dir={isArabic ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {isSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{t('شكرًا لك', 'Thank You!')}</h2>
              <p className="text-muted-foreground text-sm">{t('سنتواصل معك قريبًا', 'We\'ll get in touch with you soon 🚀')}</p>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  {t('هل يمكننا مساعدتك؟', 'Can We Help You?')}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t('اترك بياناتك وسنتواصل معك قريبًا', 'Leave your details and we\'ll reach out shortly')}
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">{t('الاسم (اختياري)', 'Name (optional)')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('اسمك', 'Your name')}
                            {...field}
                            ref={firstInputRef}
                            autoComplete="name"
                            className="h-12 text-base transition-all duration-200 focus:scale-[1.01]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">{t('رقم الهاتف (اختياري)', 'Phone Number (optional)')}</FormLabel>
                        <FormControl>
                          <input
                            type="tel"
                            value={capturedPhone}
                            onChange={(e) => {
                              setCapturedPhone(e.target.value);
                              field.onChange(e.target.value);
                            }}
                            placeholder={isArabic ? '+20 1XX XXX XXXX' : '+1 (555) 000-0000'}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">{t('احك لنا عن فكرتك (اختياري)', 'Tell us about your idea (optional)')}</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('صف مشروعك أو فكرتك...', 'Describe your project or idea...')}
                            className="resize-none min-h-[100px] text-base transition-all duration-200 focus:scale-[1.01]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      className="h-12 text-base w-full sm:w-auto sm:flex-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {t('لا شكرًا', 'No Thanks')}
                    </Button>
                    <Button
                      type="submit"
                      className="h-12 text-base w-full sm:w-auto sm:flex-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {t('جارٍ الإرسال...', 'Sending...')}
                        </span>
                      ) : (
                        t('إرسال', 'Send')
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadCapturePopup;

