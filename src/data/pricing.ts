/**
 * ═══════════════════════════════════════════════════════════════════
 * Lumos Pricing Database — v3.0
 * ═══════════════════════════════════════════════════════════════════
 * All prices in EGP · Bilingual (AR/EN)
 * Source: Lumos Agency Pricing Guide (March 2026)
 * Starting prices — final scope may vary.
 * ═══════════════════════════════════════════════════════════════════
 */

// ── Category Definitions ────────────────────────────────────────────
export const CATEGORIES = {
  WEB: 'web',
  ECOM_BOOSTERS: 'ecom_boosters',
  BRAND_EXPERIENCE: 'brand_experience',
  BRAND_IDENTITY: 'brand_identity',
  GROWTH_ADS: 'growth_ads',
  SECURITY: 'security',
} as const;

export interface InvoiceItem {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  category: string;
}

export type CategoryKey = (typeof CATEGORIES)[keyof typeof CATEGORIES];

export const CATEGORY_LABELS: Record<string, string> = {
  [CATEGORIES.WEB]: 'تطوير المواقع',
  [CATEGORIES.ECOM_BOOSTERS]: 'تحسينات التجارة الإلكترونية',
  [CATEGORIES.BRAND_EXPERIENCE]: 'البراند والتجربة',
  [CATEGORIES.BRAND_IDENTITY]: 'الهوية البصرية',
  [CATEGORIES.GROWTH_ADS]: 'الإعلانات والنمو',
  [CATEGORIES.SECURITY]: 'الأمان والأداء',
};

export const CATEGORY_LABELS_EN: Record<string, string> = {
  [CATEGORIES.WEB]: 'Web Development',
  [CATEGORIES.ECOM_BOOSTERS]: 'E-Commerce Boosters',
  [CATEGORIES.BRAND_EXPERIENCE]: 'Brand & Experience',
  [CATEGORIES.BRAND_IDENTITY]: 'Brand Identity',
  [CATEGORIES.GROWTH_ADS]: 'Growth & Ads',
  [CATEGORIES.SECURITY]: 'Security & Performance',
};

// ── Service Type ────────────────────────────────────────────────────
export interface Service {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  description: string;
  category?: string;
  note?: string;
}

// ── Core Services ───────────────────────────────────────────────────
export const SERVICES: Record<string, Service[]> = {

  // 1. Web Development
  [CATEGORIES.WEB]: [
    {
      id: 'web_landing',
      name: 'Landing Page',
      nameAr: 'صفحة هبوط',
      price: 2000,
      description: 'Single-page, starter scope',
    },
    {
      id: 'web_corporate',
      name: 'Corporate Site',
      nameAr: 'موقع شركة',
      price: 6000,
      description: 'Up to 5 pages, WordPress / builder style',
    },
    {
      id: 'web_ecommerce',
      name: 'E-Commerce Store',
      nameAr: 'متجر إلكتروني',
      price: 12000,
      description: 'Starter online store',
    },
    {
      id: 'web_shopify',
      name: 'Shopify Store',
      nameAr: 'متجر شوبيفاي',
      price: 12000,
      description: 'Starter Shopify setup',
    },
    {
      id: 'web_realestate',
      name: 'Real Estate Platform',
      nameAr: 'منصة عقارية',
      price: 15000,
      description: 'MVP property listing setup',
    },
    {
      id: 'web_lms',
      name: 'LMS Platform',
      nameAr: 'منصة تعليمية',
      price: 18000,
      description: 'MVP learning platform',
    },
    {
      id: 'web_dashboard',
      name: 'Dashboard / Admin Panel',
      nameAr: 'لوحة تحكم',
      price: 8000,
      description: 'Starter internal dashboard',
    },
  ],

  // 2. E-Commerce Boosters
  [CATEGORIES.ECOM_BOOSTERS]: [
    {
      id: 'ecom_filtering',
      name: 'Advanced Filtering',
      nameAr: 'فلترة متقدمة',
      price: 2500,
      description: 'Upgrade / add-on',
    },
    {
      id: 'ecom_wishlist',
      name: 'Wishlist',
      nameAr: 'قائمة المفضلة',
      price: 1500,
      description: 'Upgrade / add-on',
    },
    {
      id: 'ecom_comparison',
      name: 'Product Comparison',
      nameAr: 'مقارنة المنتجات',
      price: 2000,
      description: 'Upgrade / add-on',
    },
    {
      id: 'ecom_social',
      name: 'Social Login',
      nameAr: 'تسجيل الدخول الاجتماعي',
      price: 1500,
      description: 'Upgrade / add-on',
    },
    {
      id: 'ecom_loyalty',
      name: 'Loyalty Program',
      nameAr: 'برنامج ولاء',
      price: 4000,
      description: 'Upgrade / add-on',
    },
  ],

  // 3. Brand & Experience
  [CATEGORIES.BRAND_EXPERIENCE]: [
    {
      id: 'bx_motion',
      name: 'Motion Design',
      nameAr: 'تصميم متحرك',
      price: 2500,
      description: 'Visual enhancement',
    },
    {
      id: 'bx_darkmode',
      name: 'Dark Mode',
      nameAr: 'الوضع الليلي',
      price: 1500,
      description: 'UI add-on',
    },
    {
      id: 'bx_cursor',
      name: 'Custom Cursor',
      nameAr: 'مؤشر مخصص',
      price: 1000,
      description: 'UI add-on',
    },
    {
      id: 'bx_creative',
      name: 'Creative Pack',
      nameAr: 'حزمة إبداعية',
      price: 3000,
      description: 'Starter creative assets',
    },
    {
      id: 'bx_webcopy',
      name: 'Web Copywriting',
      nameAr: 'كتابة محتوى الموقع',
      price: 2500,
      description: 'Starter website copy',
    },
  ],

  // 4. Brand Identity (Selectable — bundle discount applies)
  [CATEGORIES.BRAND_IDENTITY]: [
    {
      id: 'brand_logo',
      name: 'Logo Design',
      nameAr: 'تصميم الشعار',
      price: 2200,
      description: 'Primary logo + variations',
    },
    {
      id: 'brand_colors',
      name: 'Colors & Typography',
      nameAr: 'نظام الألوان والخطوط',
      price: 900,
      description: 'Brand colors + font system',
    },
    {
      id: 'brand_elements',
      name: 'Brand Elements',
      nameAr: 'عناصر الهوية البصرية',
      price: 900,
      description: 'Patterns, icons & visual assets',
    },
    {
      id: 'brand_guide',
      name: 'Mini Brand Guide',
      nameAr: 'دليل هوية مختصر',
      price: 1200,
      description: 'Basic identity rules PDF',
    },
    {
      id: 'brand_stationery',
      name: 'Stationery Kit',
      nameAr: 'حزمة الطباعة',
      price: 1200,
      description: 'Business card + letterhead + email signature',
    },
    {
      id: 'brand_social',
      name: 'Social Media Kit',
      nameAr: 'حزمة السوشيال ميديا',
      price: 1500,
      description: 'Profile image + cover + basic templates',
    },
    {
      id: 'brand_profile',
      name: 'Company Profile PDF',
      nameAr: 'ملف تعريفي PDF',
      price: 2200,
      description: 'Company profile design',
    },
    {
      id: 'brand_presentation',
      name: 'Presentation Template',
      nameAr: 'قالب عرض تقديمي',
      price: 1000,
      description: 'Pitch / company presentation style',
    },
  ],

  // 5. Growth & Ads
  [CATEGORIES.GROWTH_ADS]: [
    {
      id: 'growth_fb',
      name: 'FB / Instagram Ads',
      nameAr: 'إعلانات فيسبوك / انستغرام',
      price: 3000,
      description: 'Management fee only — min EGP 3,000/mo',
      note: 'لا يشمل ميزانية الإعلانات',
    },
    {
      id: 'growth_tiktok',
      name: 'TikTok Ads',
      nameAr: 'إعلانات تيك توك',
      price: 3000,
      description: 'Management fee only — min EGP 3,000/mo',
      note: 'لا يشمل ميزانية الإعلانات',
    },
    {
      id: 'growth_google',
      name: 'Google Ads',
      nameAr: 'إعلانات جوجل',
      price: 3500,
      description: 'Management fee only — min EGP 3,500/mo',
      note: 'لا يشمل ميزانية الإعلانات',
    },
    {
      id: 'growth_pixel',
      name: 'Pixel Setup',
      nameAr: 'إعداد البيكسل',
      price: 1000,
      description: 'One-time tracking setup',
    },
  ],

  // 6. Security & Performance
  [CATEGORIES.SECURITY]: [
    {
      id: 'sec_cdn',
      name: 'CDN Setup',
      nameAr: 'إعداد CDN',
      price: 1000,
      description: 'Setup / configuration',
    },
    {
      id: 'sec_ssl',
      name: 'SSL Certificate Setup',
      nameAr: 'إعداد شهادة SSL',
      price: 500,
      description: 'Setup / installation',
    },
    {
      id: 'sec_ddos',
      name: 'DDoS Protection',
      nameAr: 'حماية DDoS',
      price: 2000,
      description: 'Setup / configuration',
    },
    {
      id: 'sec_backups',
      name: 'Auto Backups',
      nameAr: 'نسخ احتياطي تلقائي',
      price: 1000,
      description: 'Setup / configuration',
    },
    {
      id: 'sec_vip',
      name: 'VIP Support',
      nameAr: 'دعم VIP',
      price: 2500,
      description: 'Per month — priority support',
    },
  ],
};

// ── Package Type ────────────────────────────────────────────────────
export interface PackageFeature {
  text: string;
  textAr: string;
}

export interface Package {
  id: string;
  name: string;
  nameAr: string;
  /** Current discounted price (after 15% base + 10% 3-month offer) */
  price: number;
  /** Base price after 15% bundle discount — shown as strikethrough */
  originalPrice: number;
  savings: number;
  highlight: string;
  highlightAr: string;
  features: PackageFeature[];
  includedServices: string[];
}

/**
 * Three fixed packages from the Lumos Agency Packages rate card.
 * Each package price = base price × 0.85 (15% bundle) × 0.90 (10% 3-month offer).
 * originalPrice = base price after 15% discount (before 3-month offer).
 */
export const PACKAGES: Record<string, Package> = {

  // ── Lumos Launch ─────────────────────────────────────────────────
  LAUNCH: {
    id: 'lumos_launch',
    name: 'Lumos Launch',
    nameAr: 'لوموس لانش',
    price: 9720,         // 3-month offer price
    originalPrice: 10800, // base price (after 15% bundle — before 10% offer)
    savings: 1080,
    highlight: 'Fast-track for startups & new brands',
    highlightAr: 'انطلاقة سريعة للستارتابس والمشاريع الجديدة',
    features: [
      { text: 'Logo Design', textAr: 'تصميم الشعار' },
      { text: 'Colors & Typography', textAr: 'ألوان وخطوط البراند' },
      { text: 'Brand Elements', textAr: 'عناصر بصرية' },
      { text: 'Mini Brand Guide', textAr: 'دليل هوية مختصر' },
      { text: 'Social Media Kit', textAr: 'حزمة سوشيال ميديا' },
      { text: 'Landing Page', textAr: 'صفحة هبوط' },
      { text: 'Web Copywriting', textAr: 'كتابة محتوى الموقع' },
      { text: 'SSL + Pixel Setup', textAr: 'إعداد SSL + البيكسل' },
    ],
    includedServices: [
      'brand_logo', 'brand_colors', 'brand_elements', 'brand_guide',
      'brand_social', 'web_landing', 'bx_webcopy', 'sec_ssl', 'growth_pixel',
    ],
  },

  // ── Lumos Presence ───────────────────────────────────────────────
  PRESENCE: {
    id: 'lumos_presence',
    name: 'Lumos Presence',
    nameAr: 'لوموس بريزنس',
    price: 17910,          // 3-month offer price
    originalPrice: 19900,  // base price (after 15% bundle — before 10% offer)
    savings: 1990,
    highlight: 'Full identity + corporate website',
    highlightAr: 'هوية كاملة + موقع شركة',
    features: [
      { text: 'Logo Design', textAr: 'تصميم الشعار' },
      { text: 'Colors & Typography', textAr: 'ألوان وخطوط البراند' },
      { text: 'Brand Elements', textAr: 'عناصر بصرية' },
      { text: 'Mini Brand Guide', textAr: 'دليل هوية مختصر' },
      { text: 'Stationery Kit', textAr: 'مجموعة قرطاسية' },
      { text: 'Company Profile PDF', textAr: 'بروفايل شركة' },
      { text: 'Presentation Template', textAr: 'قالب عرض تقديمي' },
      { text: 'Corporate Website', textAr: 'موقع شركة' },
      { text: 'Web Copywriting', textAr: 'كتابة محتوى الموقع' },
      { text: 'SSL + CDN + Auto Backups', textAr: 'SSL + CDN + نسخ احتياطي' },
    ],
    includedServices: [
      'brand_logo', 'brand_colors', 'brand_elements', 'brand_guide',
      'brand_stationery', 'brand_profile', 'brand_presentation',
      'web_corporate', 'bx_webcopy', 'sec_ssl', 'sec_cdn', 'sec_backups',
    ],
  },

  // ── Lumos Commerce ───────────────────────────────────────────────
  COMMERCE: {
    id: 'lumos_commerce',
    name: 'Lumos Commerce',
    nameAr: 'لوموس كوميرس',
    price: 22320,          // 3-month offer price
    originalPrice: 24800,  // base price (after 15% bundle — before 10% offer)
    savings: 2480,
    highlight: 'Pro e-commerce brand launch',
    highlightAr: 'إطلاق متجر احترافي مع هوية كاملة',
    features: [
      { text: 'Logo Design', textAr: 'تصميم الشعار' },
      { text: 'Colors & Typography', textAr: 'ألوان وخطوط البراند' },
      { text: 'Brand Elements', textAr: 'عناصر بصرية' },
      { text: 'Mini Brand Guide', textAr: 'دليل هوية مختصر' },
      { text: 'Social Media Kit', textAr: 'حزمة سوشيال ميديا' },
      { text: 'E-Commerce Store', textAr: 'متجر إلكتروني' },
      { text: 'Web Copywriting', textAr: 'كتابة محتوى الموقع' },
      { text: 'SSL + CDN + Auto Backups', textAr: 'SSL + CDN + نسخ احتياطي' },
    ],
    includedServices: [
      'brand_logo', 'brand_colors', 'brand_elements', 'brand_guide',
      'brand_social', 'web_ecommerce', 'bx_webcopy',
      'sec_ssl', 'sec_cdn', 'sec_backups',
    ],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────
export const getAllServices = (): Service[] => Object.values(SERVICES).flat();

export const getServiceById = (id: string): Service | undefined =>
  getAllServices().find(s => s.id === id);
