import type { ProfileData } from '@/services/profileService';
import type { PortalMessage } from './hooks/usePortalData';
import type { SavedDesign } from '@/types/dashboard';

export interface MockOrder {
  id: string;
  order_type: string;
  package_name: string;
  package_name_ar: string;
  status: 'pending' | 'reviewing' | 'approved' | 'in_progress' | 'delivered' | 'cancelled';
  total_price: number;
  price_currency: string;
  created_at: string;
  updated_at: string;
  estimated_delivery: string;
  items: { name: string; nameAr: string; price: number; category: string }[];
  notes: string;
  timeline: { status: string; label: string; labelAr: string; date: string; completed: boolean; active: boolean }[];
}

export interface MockAsset {
  id: string;
  name: string;
  nameAr?: string;
  asset_url?: string;
  asset_type: 'pdf' | 'image' | 'design' | 'document' | 'archive' | 'video' | 'spreadsheet';
  file_type?: string;
  size: string;
  sizeAr?: string;
  uploaded_by: 'admin';
  created_at: string;
}

export const MOCK_CLIENT = {
  id: 'mock-client-001',
  username: 'ahmed',
  email: 'ahmed@lumos.app',
  avatar_url: '/avatars/avatar-4.jpg',
  company_name: 'Nile Digital Solutions',
  phone_number: '+20 100 234 5678',
  package_name: 'Lumos Pro Business',
  progress: 65,
  status: 'active',
  next_steps: 'Our team is finalizing your brand guidelines.\nNext milestone: Website wireframes review — scheduled for May 12.\nPlease confirm your preferred social platforms.',
  theme_accent: '#077F5B',
  brand_colors: ['#077F5B', '#3b82f6', '#f59e0b'],
  security_question: 'What city were you born in?',
  industry: 'Digital Marketing',
  role: 'CEO & Founder',
  cover_url: '',
  is_verified: true,
  created_at: '2026-02-15T10:00:00Z',
};

export const MOCK_PROFILE: ProfileData & {
  avatar_style?: string;
  avatar_seed?: string;
  avatar_config?: Record<string, unknown>;
  display_name?: string;
  bio?: string;
  tagline?: string;
  website?: string;
  location?: string;
  timezone?: string;
  social_links?: Record<string, string>;
  brand_colors?: string[];
  logo_url?: string;
  cover_gradient?: string;
  theme_accent?: string;
  profile_visibility?: string;
} = {
  id: 'mock-client-001',
  username: 'ahmed',
  email: 'ahmed@lumos.app',
  company_name: 'Nile Digital Solutions',
  avatar_style: 'initials',
  avatar_seed: 'ahmed',
  avatar_config: { style: 'initials', seed: 'ahmed', colors: ['#077F5B', '#3b82f6'] },
  avatar_url: '',
  display_name: 'Ahmed Mansour',
  bio: 'Entrepreneur and brand strategist building digital experiences for Egyptian businesses. Passionate about clean design and impactful storytelling.',
  tagline: 'Digital-first branding for growing businesses',
  website: 'https://niledigital.com',
  location: 'Cairo, Egypt',
  timezone: 'Africa/Cairo',
  social_links: {
    twitter: 'https://x.com/niledigital',
    instagram: 'https://instagram.com/niledigital',
    linkedin: 'https://linkedin.com/company/niledigital',
    behance: '',
    dribbble: '',
    github: '',
  },
  brand_colors: ['#077F5B', '#3b82f6', '#f59e0b'],
  logo_url: '',
  cover_gradient: '',
  theme_accent: '#077F5B',
  profile_visibility: 'private',
};

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: 'order-001',
    order_type: 'package',
    package_name: 'Lumos Pro Business',
    package_name_ar: 'لوموس برو بزنس',
    status: 'in_progress',
    total_price: 28500,
    price_currency: 'EGP',
    created_at: '2026-04-10T09:30:00Z',
    updated_at: '2026-04-28T14:00:00Z',
    estimated_delivery: '2026-05-15',
    items: [
      { name: 'Corporate Site', nameAr: 'موقع شركة', price: 6000, category: 'web' },
      { name: 'Logo Design', nameAr: 'تصميم شعار', price: 3500, category: 'brand_identity' },
      { name: 'Social Media Pack', nameAr: 'باقة سوشيال ميديا', price: 8000, category: 'brand_experience' },
      { name: 'E-Commerce Setup', nameAr: 'إعداد متجر', price: 11000, category: 'web' },
    ],
    notes: 'Client requested dark mode support and Arabic RTL layout for all deliverables.',
    timeline: [
      { status: 'pending', label: 'Order Placed', labelAr: 'تم تقديم الطلب', date: '2026-04-10', completed: true, active: false },
      { status: 'reviewing', label: 'Under Review', labelAr: 'قيد المراجعة', date: '2026-04-12', completed: true, active: false },
      { status: 'approved', label: 'Approved', labelAr: 'تمت الموافقة', date: '2026-04-15', completed: true, active: false },
      { status: 'in_progress', label: 'In Progress', labelAr: 'قيد التنفيذ', date: '2026-04-20', completed: false, active: true },
      { status: 'delivered', label: 'Delivered', labelAr: 'تم التسليم', date: '', completed: false, active: false },
    ],
  },
  {
    id: 'order-002',
    order_type: 'custom',
    package_name: 'Brand Identity Package',
    package_name_ar: 'باقة الهوية البصرية',
    status: 'delivered',
    total_price: 14500,
    price_currency: 'EGP',
    created_at: '2026-02-01T11:00:00Z',
    updated_at: '2026-03-20T16:30:00Z',
    estimated_delivery: '2026-03-15',
    items: [
      { name: 'Logo Design', nameAr: 'تصميم شعار', price: 3500, category: 'brand_identity' },
      { name: 'Business Card Design', nameAr: 'تصميم كارت شخصي', price: 1500, category: 'brand_identity' },
      { name: 'Brand Guidelines', nameAr: 'دليل الهوية', price: 5000, category: 'brand_identity' },
      { name: 'Social Media Kit', nameAr: 'مجموعة سوشيال ميديا', price: 4500, category: 'brand_experience' },
    ],
    notes: 'Completed with all revisions applied. Final files delivered via Google Drive.',
    timeline: [
      { status: 'pending', label: 'Order Placed', labelAr: 'تم تقديم الطلب', date: '2026-02-01', completed: true, active: false },
      { status: 'reviewing', label: 'Under Review', labelAr: 'قيد المراجعة', date: '2026-02-03', completed: true, active: false },
      { status: 'approved', label: 'Approved', labelAr: 'تمت الموافقة', date: '2026-02-05', completed: true, active: false },
      { status: 'in_progress', label: 'In Progress', labelAr: 'قيد التنفيذ', date: '2026-02-10', completed: true, active: false },
      { status: 'delivered', label: 'Delivered', labelAr: 'تم التسليم', date: '2026-03-15', completed: true, active: false },
    ],
  },
  {
    id: 'order-003',
    order_type: 'package',
    package_name: 'Landing Page',
    package_name_ar: 'صفحة هبوط',
    status: 'pending',
    total_price: 2000,
    price_currency: 'EGP',
    created_at: '2026-05-03T08:00:00Z',
    updated_at: '2026-05-03T08:00:00Z',
    estimated_delivery: '2026-05-20',
    items: [
      { name: 'Landing Page', nameAr: 'صفحة هبوط', price: 2000, category: 'web' },
    ],
    notes: 'New order — awaiting team review.',
    timeline: [
      { status: 'pending', label: 'Order Placed', labelAr: 'تم تقديم الطلب', date: '2026-05-03', completed: false, active: true },
      { status: 'reviewing', label: 'Under Review', labelAr: 'قيد المراجعة', date: '', completed: false, active: false },
      { status: 'approved', label: 'Approved', labelAr: 'تمت الموافقة', date: '', completed: false, active: false },
      { status: 'in_progress', label: 'In Progress', labelAr: 'قيد التنفيذ', date: '', completed: false, active: false },
      { status: 'delivered', label: 'Delivered', labelAr: 'تم التسليم', date: '', completed: false, active: false },
    ],
  },
];

export const MOCK_MESSAGES: PortalMessage[] = [
  {
    id: 'msg-001',
    client_id: 'mock-client-001',
    message: 'مرحبًا! كنت عايز أسأل عن حالة الطلب بتاعي — هل الموقع بدأ فعلاً ولا لسه في مرحلة التخطيط؟',
    sender: 'client',
    created_at: '2026-04-25T10:15:00Z',
  },
  {
    id: 'msg-002',
    client_id: 'mock-client-001',
    message: 'أهلاً يا أحمد! الموقع دلوقتي في مرحلة التصميم — الـ wireframes كانت قبل كده واتوافق عليها. هنبدأ الـ UI build الأسبوع ده.',
    sender: 'team',
    created_at: '2026-04-25T10:32:00Z',
  },
  {
    id: 'msg-003',
    client_id: 'mock-client-001',
    message: 'تمام ممكن ابقى اشوف التصميم الاول قبل ما تبدأوا في الكود؟',
    sender: 'client',
    created_at: '2026-04-25T10:45:00Z',
  },
  {
    id: 'msg-004',
    client_id: 'mock-client-001',
    message: 'طبعاً! هنبعتلك رابط الـ Figma على الواتساب النهاردة. وهتقدر تعلق على كل عنصر بشكل مباشر.',
    sender: 'team',
    created_at: '2026-04-25T11:00:00Z',
  },
  {
    id: 'msg-005',
    client_id: 'mock-client-001',
    message: 'Hi! Quick question — does the Pro Business package include SEO setup or is that an add-on?',
    sender: 'client',
    created_at: '2026-04-28T09:10:00Z',
  },
  {
    id: 'msg-006',
    client_id: 'mock-client-001',
    message: 'Hey Ahmed! Great question. SEO Basic Setup is included in Pro Business (meta tags, sitemap, Open Graph). Advanced SEO (keyword research, monthly reports) is available as an add-on for 2,000 EGP/month. Want me to add it to your order?',
    sender: 'team',
    created_at: '2026-04-28T09:25:00Z',
  },
  {
    id: 'msg-007',
    client_id: 'mock-client-001',
    message: 'ايوه ضيفه بقى — وهل ممكن اشوف العروض اللي عندها خصم؟',
    sender: 'client',
    created_at: '2026-05-01T14:30:00Z',
  },
  {
    id: 'msg-008',
    client_id: 'mock-client-001',
    message: 'هنبعتلك كل العروض المتاحة وخصومات الحزمة على الواتساب النهاردة الصبح. هل وقت 10 الصبح ينفعك؟',
    sender: 'team',
    created_at: '2026-05-01T14:48:00Z',
  },
  {
    id: 'msg-009',
    client_id: 'mock-client-001',
    message: 'Perfect, 10 AM works. Shukran!',
    sender: 'client',
    created_at: '2026-05-01T14:50:00Z',
  },
  {
    id: 'msg-010',
    client_id: 'mock-client-001',
    message: "You're welcome! Talk tomorrow. Have a great evening!",
    sender: 'team',
    created_at: '2026-05-01T14:55:00Z',
  },
];

export const MOCK_ADMIN_REPLY_MESSAGES: PortalMessage[] = [
  {
    id: 'admin-reply-1',
    client_id: 'mock-client-001',
    message: 'تم إضافة خدمة الـ SEO المتقدم لحسابك! هتلاقي التحديث في صفحة الطلبات.',
    sender: 'team',
    created_at: new Date().toISOString(),
  },
  {
    id: 'admin-reply-2',
    client_id: 'mock-client-001',
    message: "We've updated your order with the Advanced SEO add-on. You can see the change in the Orders tab.",
    sender: 'team',
    created_at: new Date().toISOString(),
  },
];

export const MOCK_DESIGNS: SavedDesign[] = [
  {
    id: 'design-001',
    business_name: 'Nile Digital',
    service_type: 'Web Development',
    selected_theme: 'aurora',
    custom_theme: { primary: '#077F5B', accent: '#3b82f6', gradient: 'linear-gradient(135deg, #077F5B 0%, #3b82f6 100%)' },
    selected_template: 'corporate-modern',
    is_dark_mode: false,
    glass_effect: true,
    active_texture: 'none',
    font_size: 16,
    view_mode: 'desktop',
    device_view: 'desktop',
    enable_3d: false,
    rotation_x: 0,
    rotation_y: 0,
    show_ratings: true,
    show_time: true,
    show_featured: true,
    image_quality: 'high',
    sort_by: 'date',
    custom_items: [],
    cart_items: {},
    favorites: [],
    status: 'active',
    view_count: 24,
    created_at: '2026-04-15T10:00:00Z',
    updated_at: '2026-04-20T15:30:00Z',
  },
  {
    id: 'design-002',
    business_name: 'Nile Digital AR',
    service_type: 'Brand Identity',
    selected_theme: 'emerald',
    custom_theme: { primary: '#077F5B', accent: '#f59e0b', gradient: 'linear-gradient(135deg, #077F5B 0%, #f59e0b 100%)' },
    selected_template: 'brand-bold',
    is_dark_mode: true,
    glass_effect: false,
    active_texture: 'grain',
    font_size: 14,
    view_mode: 'mobile',
    device_view: 'mobile',
    enable_3d: true,
    rotation_x: 10,
    rotation_y: -5,
    show_ratings: false,
    show_time: false,
    show_featured: true,
    image_quality: 'medium',
    sort_by: 'name',
    custom_items: [],
    cart_items: {},
    favorites: [],
    status: 'active',
    view_count: 18,
    created_at: '2026-04-22T12:00:00Z',
    updated_at: '2026-04-25T09:00:00Z',
  },
  {
    id: 'design-003',
    business_name: 'E-Commerce Preview',
    service_type: 'E-Commerce',
    selected_theme: 'midnight',
    custom_theme: { primary: '#1e293b', accent: '#3b82f6', gradient: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)' },
    selected_template: 'ecom-clean',
    is_dark_mode: true,
    glass_effect: true,
    active_texture: 'none',
    font_size: 15,
    view_mode: 'desktop',
    device_view: 'desktop',
    enable_3d: false,
    rotation_x: 0,
    rotation_y: 0,
    show_ratings: true,
    show_time: false,
    show_featured: false,
    image_quality: 'high',
    sort_by: 'date',
    custom_items: [],
    cart_items: {},
    favorites: [],
    status: 'active',
    view_count: 7,
    created_at: '2026-05-01T16:00:00Z',
    updated_at: '2026-05-01T16:00:00Z',
  },
];

export const MOCK_ASSETS: MockAsset[] = [
  {
    id: 'asset-001',
    name: 'Brand Guidelines v2.pdf',
    nameAr: 'دليل الهوية البصرية v2',
    asset_url: '#',
    asset_type: 'pdf',
    file_type: 'PDF',
    size: '4.2 MB',
    sizeAr: '٤.٢ م.ب',
    uploaded_by: 'admin',
    created_at: '2026-04-18T09:00:00Z',
  },
  {
    id: 'asset-002',
    name: 'Logo_Final.svg',
    nameAr: 'الشعار النهائي',
    asset_url: '#',
    asset_type: 'image',
    file_type: 'SVG',
    size: '156 KB',
    sizeAr: '١٥٦ ك.ب',
    uploaded_by: 'admin',
    created_at: '2026-04-20T14:00:00Z',
  },
  {
    id: 'asset-003',
    name: 'Wireframes_Homepage.fig',
    nameAr: 'وايرفريمز الصفحة الرئيسية',
    asset_url: '#',
    asset_type: 'design',
    file_type: 'FIG',
    size: '12.8 MB',
    sizeAr: '١٢.٨ م.ب',
    uploaded_by: 'admin',
    created_at: '2026-04-25T11:00:00Z',
  },
  {
    id: 'asset-004',
    name: 'Content Strategy.docx',
    nameAr: 'استراتيجية المحتوى',
    asset_url: '#',
    asset_type: 'document',
    file_type: 'DOCX',
    size: '890 KB',
    sizeAr: '٨٩٠ ك.ب',
    uploaded_by: 'admin',
    created_at: '2026-04-28T16:00:00Z',
  },
  {
    id: 'asset-005',
    name: 'Social Media Kit.zip',
    nameAr: 'حزمة السوشيال ميديا',
    asset_url: '#',
    asset_type: 'archive',
    file_type: 'ZIP',
    size: '23.1 MB',
    sizeAr: '٢٣.١ م.ب',
    uploaded_by: 'admin',
    created_at: '2026-05-01T10:00:00Z',
  },
];

export interface AdminNotification {
  id: string;
  message: string;
  messageAr: string;
  type: 'info' | 'milestone' | 'alert' | 'update';
  created_at: string;
  is_read: boolean;
}

export const MOCK_ADMIN_NOTIFICATIONS: AdminNotification[] = [
  {
    id: 'notif-1',
    message: 'Advanced SEO has been added to your order. Check the Orders tab for details.',
    messageAr: 'تم إضافة خدمة الـ SEO المتقدم لحسابك. شاهد تفاصيل في تبويب الطلبات.',
    type: 'update',
    created_at: '2026-05-04T09:00:00Z',
    is_read: false,
  },
  {
    id: 'notif-2',
    message: 'Your wireframes are ready for review! We\'ll schedule a call this week.',
    messageAr: 'الـ Wireframes جاهزة للمراجعة! هنرتب مكالمة الأسبوع ده.',
    type: 'milestone',
    created_at: '2026-05-02T14:00:00Z',
    is_read: false,
  },
  {
    id: 'notif-3',
    message: 'Welcome to Lumos! Your project has been assigned to our team.',
    messageAr: 'مرحبًا في لوموس! مشروعك اتعمله تعيين للفريق.',
    type: 'info',
    created_at: '2026-04-10T08:30:00Z',
    is_read: true,
  },
  {
    id: 'notif-4',
    message: 'Brand guidelines v2 has been shared with you in the Library.',
    messageAr: 'دليل الهوية البصرية v2 تم مشاركته معاك في المكتبة.',
    type: 'update',
    created_at: '2026-04-18T11:00:00Z',
    is_read: true,
  },
];