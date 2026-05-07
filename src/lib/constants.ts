export const ROUTES = {
  HOME: '/',
  DEMO: '/demo',
  CLIENT_SIGNUP: '/client-signup',
  CLIENT_LOGIN: '/client-login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  INVITE_ONBOARDING: '/invite-onboarding',
  CLIENT_PROFILE: '/profile',
  CLIENT_PROFILE_PREVIEW: '/profile-preview',
  ADMIN_DASHBOARD: '/lumos-admin',
} as const;

export const NAV_ITEMS = [
  { label: 'Home', href: ROUTES.HOME },
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
] as const;

export const INDUSTRY_OPTIONS = [
  { value: 'restaurant', labelAr: 'مطعم / كافيه', labelEn: 'Restaurant / Cafe' },
  { value: 'retail', labelAr: 'تجزئة / تجارة إلكترونية', labelEn: 'Retail / E-commerce' },
  { value: 'factory', labelAr: 'مصنع / صناعي', labelEn: 'Factory / Industrial' },
  { value: 'realestate', labelAr: 'عقارات', labelEn: 'Real Estate' },
  { value: 'healthcare', labelAr: 'رعاية صحية / عيادة', labelEn: 'Healthcare / Clinic' },
  { value: 'education', labelAr: 'تعليم', labelEn: 'Education' },
  { value: 'salon', labelAr: 'صالون / تجميل', labelEn: 'Salon / Beauty' },
  { value: 'pharmacy', labelAr: 'صيدلية', labelEn: 'Pharmacy' },
  { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
] as const;

export const BUDGET_RANGE_OPTIONS = [
  { value: 'under_5000', labelAr: 'أقل من 5,000 ج.م', labelEn: 'Under 5,000 EGP' },
  { value: '5000_15000', labelAr: '5,000 - 15,000 ج.م', labelEn: '5,000 - 15,000 EGP' },
  { value: '15000_30000', labelAr: '15,000 - 30,000 ج.م', labelEn: '15,000 - 30,000 EGP' },
  { value: '30000_50000', labelAr: '30,000 - 50,000 ج.م', labelEn: '30,000 - 50,000 EGP' },
  { value: 'over_50000', labelAr: 'أكثر من 50,000 ج.م', labelEn: 'Over 50,000 EGP' },
] as const;

export const TIMELINE_OPTIONS = [
  { value: 'asap', labelAr: 'في أسرع وقت', labelEn: 'ASAP' },
  { value: 'within_1_month', labelAr: 'خلال شهر', labelEn: 'Within 1 month' },
  { value: 'within_3_months', labelAr: 'خلال 3 أشهر', labelEn: 'Within 3 months' },
  { value: 'within_6_months', labelAr: 'خلال 6 أشهر', labelEn: 'Within 6 months' },
  { value: 'no_deadline', labelAr: 'لا يوجد جدول زمني محدد', labelEn: 'No specific deadline' },
] as const;

export const REFERRAL_SOURCE_OPTIONS = [
  { value: 'google', labelAr: 'جوجل / محرك بحث', labelEn: 'Google / Search Engine' },
  { value: 'social_media', labelAr: 'فيسبوك / انستغرام', labelEn: 'Facebook / Instagram' },
  { value: 'personal_referral', labelAr: 'توصية شخصية', labelEn: 'Personal Recommendation' },
  { value: 'paid_ad', labelAr: 'إعلان مدفوع', labelEn: 'Paid Ad' },
  { value: 'content_blog', labelAr: 'محتوى / مقال', labelEn: 'Content / Blog' },
  { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
] as const;

export const SERVICE_CATEGORY_OPTIONS = [
  { value: 'web', labelAr: 'تطوير الويب', labelEn: 'Web Development', icon: 'Globe' },
  { value: 'ecom_boosters', labelAr: 'معززات التجارة الإلكترونية', labelEn: 'E-Commerce Boosters', icon: 'ShoppingCart' },
  { value: 'brand_identity', labelAr: 'الهوية البصرية', labelEn: 'Brand Identity', icon: 'Palette' },
  { value: 'brand_experience', labelAr: 'العلامة التجارية والتجربة', labelEn: 'Brand & Experience', icon: 'Sparkles' },
  { value: 'growth_ads', labelAr: 'النمو والإعلانات', labelEn: 'Growth & Ads', icon: 'TrendingUp' },
  { value: 'security', labelAr: 'الأمان والأداء', labelEn: 'Security & Performance', icon: 'Shield' },
] as const;

export const SIGNUP_SOURCES = [
  { value: 'web_signup', label: 'Web Signup' },
  { value: 'admin_created', label: 'Admin Created' },
  { value: 'pricing_modal', label: 'Pricing Modal' },
  { value: 'contact_form', label: 'Contact Form' },
] as const;
