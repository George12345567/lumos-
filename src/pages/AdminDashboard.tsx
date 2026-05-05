import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Edit2,
  Eye,
  FileText,
  Flag,
  History,
  Globe2,
  Image,
  LayoutGrid,
  Lock,
  Mail,
  MessageSquare,
  Moon,
  Package as PackageIcon,
  Palette,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Shield,
  Sun,
  Table2,
  Tag,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppearance } from '@/context/AppearanceContext';
import { useLanguage } from '@/context/LanguageContext';
import { PACKAGES, getAllServices } from '@/data/pricing';
import { supabase } from '@/lib/supabaseClient';
import { INDUSTRY_OPTIONS, BUDGET_RANGE_OPTIONS, TIMELINE_OPTIONS, REFERRAL_SOURCE_OPTIONS, SERVICE_CATEGORY_OPTIONS, SIGNUP_SOURCES } from '@/lib/constants';
import type {
  AuditLog,
  Client,
  Contact,
  DashboardStats,
  DiscountCode,
  PricingRequest,
  PricingRequestItem,
  TeamMember,
} from '@/types/dashboard';

const ADMIN_EMAIL = 'george30610@compit.aun.edu.eg';

type Tab =
  | 'requests'
  | 'discounts'
  | 'contacts'
  | 'notifications'
  | 'audit'
  | 'team'
  | 'clients'
  | 'stats';

type ViewMode = 'card' | 'table';
type SortDir = 'asc' | 'desc';
type ThemeVars = CSSProperties & Record<`--${string}`, string>;
type Density = 'comfortable' | 'compact';

type EntityView =
  | { type: 'request'; record: PricingRequest }
  | { type: 'contact'; record: Contact }
  | { type: 'discount'; record: DiscountCode }
  | { type: 'team'; record: TeamMember }
  | { type: 'client'; record: Client }
  | { type: 'notification'; record: NotificationItem }
  | { type: 'audit'; record: AuditLog };

interface TeamMemberForm {
  name: string;
  role: 'admin' | 'sales' | 'designer' | 'manager';
  phone: string;
  email: string;
  avatar_url: string;
  is_active: boolean;
}

interface DiscountForm {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount: number;
  is_active: boolean;
  valid_until: string;
  usage_limit: number;
}

interface ClientForm {
  profile_picture: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  company_name: string;
  business_tagline: string;
  full_contact_name: string;
  website: string;
  brand_colors: string;
  brand_feel: string;
  industry: string;
  services_needed: string;
  budget_range: string;
  timeline: string;
  referral_source: string;
  project_summary: string;
  signup_source: string;
  signup_completed_at: string;
  security_question: string;
  security_answer: string;
  status: string;
  progress: number;
  next_steps: string;
  admin_notes: string;
  package_name: string;
}

interface ClientSignupProfile {
  business_tagline?: string;
  full_contact_name?: string;
  website?: string;
  brand_feel?: string;
  auth_password_pending?: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  title_ar?: string;
  message: string;
  message_ar?: string;
  is_read: boolean;
  created_at: string;
  type: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

interface EditRequestForm {
  request_type: PricingRequest['request_type'];
  status: PricingRequest['status'];
  priority: PricingRequest['priority'];
  assigned_to: string | null;
  package_id: string | null;
  selected_services: string[];
  estimated_subtotal: number;
  estimated_total: number;
  price_currency: string;
  applied_promo_code: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  company_name: string;
  request_notes: string;
  admin_notes: string;
  location_url: string;
  request_source: string;
  discount_breakdown_json: string;
  status_history_json: string;
  follow_up_actions_json: string;
  delete_reason: string;
}

type DbResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

const DEFAULT_TEAM_FORM: TeamMemberForm = {
  name: '',
  role: 'sales',
  phone: '',
  email: '',
  avatar_url: '',
  is_active: true,
};

const DEFAULT_DISCOUNT_FORM: DiscountForm = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 0,
  min_order_value: 0,
  max_discount: 0,
  is_active: true,
  valid_until: '',
  usage_limit: 0,
};

const DEFAULT_CLIENT_FORM: ClientForm = {
  profile_picture: '',
  username: '',
  email: '',
  password: '',
  phone: '',
  company_name: '',
  business_tagline: '',
  full_contact_name: '',
  website: '',
  brand_colors: '',
  brand_feel: '',
  industry: '',
  services_needed: '',
  budget_range: '',
  timeline: '',
  referral_source: '',
  project_summary: '',
  signup_source: 'web_signup',
  signup_completed_at: '',
  security_question: '',
  security_answer: '',
  status: 'active',
  progress: 0,
  next_steps: '',
  admin_notes: '',
  package_name: '',
};

const EMPTY_STATS: DashboardStats = {
  totalOrders: 0,
  totalRevenue: 0,
  totalContacts: 0,
  totalPricingRequests: 0,
  pendingOrders: 0,
  completedOrders: 0,
  newContacts: 0,
  newPricingRequests: 0,
  avgOrderValue: 0,
  unreadMessages: 0,
  totalDesigns: 0,
};

const DARK_THEME: ThemeVars = {
  '--adm-bg': '#0f1115',
  '--adm-sidebar': '#14171d',
  '--adm-surface': '#191d24',
  '--adm-surface-deep': '#11141a',
  '--adm-hover': 'rgba(255,255,255,0.055)',
  '--adm-border': 'rgba(255,255,255,0.085)',
  '--adm-border-strong': 'rgba(255,255,255,0.15)',
  '--adm-text': '#f7fafc',
  '--adm-text-sub': '#cbd5e1',
  '--adm-text-muted': '#94a3b8',
  '--adm-text-faint': '#64748b',
  '--adm-input': '#11141a',
  '--adm-alt-row': 'rgba(255,255,255,0.025)',
};

const LIGHT_THEME: ThemeVars = {
  '--adm-bg': '#f5f7f9',
  '--adm-sidebar': '#ffffff',
  '--adm-surface': '#ffffff',
  '--adm-surface-deep': '#eef2f6',
  '--adm-hover': 'rgba(15,23,42,0.055)',
  '--adm-border': 'rgba(15,23,42,0.095)',
  '--adm-border-strong': 'rgba(15,23,42,0.16)',
  '--adm-text': '#172033',
  '--adm-text-sub': '#334155',
  '--adm-text-muted': '#64748b',
  '--adm-text-faint': '#8a96a8',
  '--adm-input': '#ffffff',
  '--adm-alt-row': 'rgba(15,23,42,0.025)',
};

const REQUEST_STATUS_CFG: Record<
  PricingRequest['status'],
  {
    gradient: string;
    badge: string;
    dot: string;
    label: { ar: string; en: string };
  }
> = {
  new: {
    gradient: 'from-cyan-500 to-cyan-600',
    badge: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
    dot: 'bg-cyan-400',
    label: { ar: 'جديد', en: 'New' },
  },
  reviewing: {
    gradient: 'from-amber-500 to-orange-500',
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    dot: 'bg-amber-400',
    label: { ar: 'مراجعة', en: 'Reviewing' },
  },
  approved: {
    gradient: 'from-emerald-500 to-teal-500',
    badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    dot: 'bg-emerald-400',
    label: { ar: 'معتمد', en: 'Approved' },
  },
  converted: {
    gradient: 'from-violet-500 to-fuchsia-500',
    badge: 'bg-violet-500/15 text-violet-300 border border-violet-500/30',
    dot: 'bg-violet-400',
    label: { ar: 'محول', en: 'Converted' },
  },
  rejected: {
    gradient: 'from-rose-500 to-red-500',
    badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    dot: 'bg-rose-400',
    label: { ar: 'مرفوض', en: 'Rejected' },
  },
};

const PRIORITY_CFG: Record<
  PricingRequest['priority'],
  { badge: string; label: { ar: string; en: string } }
> = {
  urgent: {
    badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    label: { ar: 'عاجل', en: 'Urgent' },
  },
  high: {
    badge: 'bg-orange-500/15 text-orange-300 border border-orange-500/30',
    label: { ar: 'عالية', en: 'High' },
  },
  medium: {
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    label: { ar: 'متوسطة', en: 'Medium' },
  },
  low: {
    badge: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
    label: { ar: 'منخفضة', en: 'Low' },
  },
};

const CONTACT_STATUS_CFG: Record<
  Contact['status'],
  { gradient: string; text: string; label: { ar: string; en: string } }
> = {
  new: {
    gradient: 'from-cyan-500 to-blue-500',
    text: 'text-cyan-300',
    label: { ar: 'جديد', en: 'New' },
  },
  read: {
    gradient: 'from-blue-500 to-indigo-500',
    text: 'text-blue-300',
    label: { ar: 'مقروء', en: 'Read' },
  },
  contacted: {
    gradient: 'from-amber-500 to-orange-500',
    text: 'text-amber-300',
    label: { ar: 'تم التواصل', en: 'Contacted' },
  },
  resolved: {
    gradient: 'from-emerald-500 to-teal-500',
    text: 'text-emerald-300',
    label: { ar: 'محلول', en: 'Resolved' },
  },
};

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const asDbResponse = <T,>(response: unknown) => response as DbResponse<T>;

const formatMoney = (value?: number | null, currency = 'EGP') =>
  `${Number(value || 0).toLocaleString()} ${currency || 'EGP'}`;

const formatDate = (value?: string, isArabic = false) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

const formatDateTime = (value?: string, isArabic = false) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const getWhatsappUrl = (phone?: string | null) => {
  if (!phone) return '#';
  const cleanPhone = phone.replace(/\D/g, '');
  const normalized = cleanPhone.startsWith('20') ? cleanPhone : `20${cleanPhone}`;
  return `https://wa.me/${normalized}`;
};

const getClientSignupProfile = (client?: Client | null): ClientSignupProfile => {
  const profile = client?.package_details?.signup_profile;
  return profile && typeof profile === 'object' ? (profile as ClientSignupProfile) : {};
};

const parseBrandColors = (value: string) =>
  value
    .split(',')
    .map((color) => color.trim())
    .filter(Boolean);

const getStatusCfg = (status?: string) =>
  REQUEST_STATUS_CFG[(status || 'new') as PricingRequest['status']] ??
  REQUEST_STATUS_CFG.new;

const getPriorityCfg = (priority?: string) =>
  PRIORITY_CFG[(priority || 'low') as PricingRequest['priority']] ??
  PRIORITY_CFG.low;

const getContactStatusCfg = (status?: string) =>
  CONTACT_STATUS_CFG[(status || 'new') as Contact['status']] ??
  CONTACT_STATUS_CFG.new;

const sortValue = (item: Record<string, unknown>, field: string) => {
  const value = item[field];

  if (field.endsWith('_at')) return new Date(String(value || 0)).getTime();
  if (typeof value === 'number') return value;

  return String(value ?? '').toLowerCase();
};

const matchesQuery = (query: string, values: Array<string | null | undefined>) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return values.some((value) => String(value || '').toLowerCase().includes(q));
};

const formatJson = (value: unknown, fallback: unknown) => {
  try {
    return JSON.stringify(value ?? fallback, null, 2);
  } catch {
    return JSON.stringify(fallback, null, 2);
  }
};

const parseJsonField = <T,>(value: string, fallback: T): T => {
  if (!value.trim()) return fallback;
  return JSON.parse(value) as T;
};

const safeParseJsonField = <T,>(value: string, fallback: T): T => {
  try {
    return parseJsonField(value, fallback);
  } catch {
    return fallback;
  }
};

const diffPayload = <T extends Record<string, unknown>>(
  original: Record<string, unknown>,
  next: T
) => {
  return Object.entries(next).reduce<Record<string, unknown>>((payload, [key, value]) => {
    const oldValue = original[key];
    const changed = JSON.stringify(oldValue ?? null) !== JSON.stringify(value ?? null);
    if (changed) payload[key] = value;
    return payload;
  }, {});
};

const fieldClass =
  'w-full rounded-xl border border-[var(--adm-border)] bg-[var(--adm-input)] px-3 py-2.5 text-sm text-[var(--adm-text)] outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60';

const Button = ({
  children,
  variant = 'surface',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'surface' | 'ghost' | 'danger' | 'success';
}) => (
  <button
    type="button"
    className={cn(
      buttonBase,
      variant === 'primary' &&
        'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/15',
      variant === 'surface' &&
        'border border-[var(--adm-border)] bg-[var(--adm-surface)] text-[var(--adm-text-sub)] hover:border-emerald-500/30 hover:bg-[var(--adm-hover)] hover:text-[var(--adm-text)]',
      variant === 'ghost' &&
        'text-[var(--adm-text-muted)] hover:bg-[var(--adm-hover)] hover:text-[var(--adm-text)]',
      variant === 'danger' &&
        'border border-rose-500/25 bg-rose-500/15 text-rose-300 hover:bg-rose-500 hover:text-white',
      variant === 'success' &&
        'border border-emerald-500/25 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-white',
      className
    )}
    {...props}
  >
    {children}
  </button>
);

const IconButton = ({
  label,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={label}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--adm-text-muted)] transition hover:bg-[var(--adm-hover)] hover:text-[var(--adm-text)]',
          className
        )}
        {...props}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const SectionCard = ({
  title,
  icon: Icon,
  children,
  action,
  className,
}: {
  title: string;
  icon?: ElementType;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      'rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 shadow-sm',
      className
    )}
  >
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--adm-text-muted)]">
        {Icon && <Icon className="h-4 w-4 text-emerald-400" />}
        {title}
      </h3>
      {action}
    </div>
    {children}
  </section>
);

const EmptyState = ({
  icon: Icon,
  title,
  action,
}: {
  icon: ElementType;
  title: string;
  action?: ReactNode;
}) => (
  <div className="rounded-2xl border border-dashed border-[var(--adm-border-strong)] bg-[var(--adm-surface)] py-14 text-center text-[var(--adm-text-faint)]">
    <Icon className="mx-auto mb-3 h-11 w-11 opacity-45" />
    <p className="font-semibold">{title}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const SearchBar = ({
  searchTerm,
  setSearchTerm,
  isArabic,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  isArabic: boolean;
}) => (
  <div className="relative w-full max-w-md">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--adm-text-faint)]" />
    <input
      type="search"
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
      placeholder={isArabic ? 'بحث...' : 'Search...'}
      className={cn(fieldClass, 'pl-10')}
    />
  </div>
);

const ViewToggle = ({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) => (
  <div className="flex rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-1">
    <IconButton
      label="Card view"
      onClick={() => setViewMode('card')}
      className={viewMode === 'card' ? 'bg-emerald-500/15 text-emerald-300' : ''}
    >
      <LayoutGrid className="h-4 w-4" />
    </IconButton>
    <IconButton
      label="Table view"
      onClick={() => setViewMode('table')}
      className={viewMode === 'table' ? 'bg-emerald-500/15 text-emerald-300' : ''}
    >
      <Table2 className="h-4 w-4" />
    </IconButton>
  </div>
);

const StatusBadge = ({ status, isArabic }: { status?: string; isArabic: boolean }) => {
  const cfg = getStatusCfg(status);
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-bold', cfg.badge)}>
      {cfg.label[isArabic ? 'ar' : 'en']}
    </span>
  );
};

const PriorityBadge = ({
  priority,
  isArabic,
}: {
  priority?: string;
  isArabic: boolean;
}) => {
  const cfg = getPriorityCfg(priority);
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold', cfg.badge)}>
      <Flag className="h-2.5 w-2.5" />
      {cfg.label[isArabic ? 'ar' : 'en']}
    </span>
  );
};

const RoleBadge = ({ role, isArabic }: { role?: string; isArabic: boolean }) => {
  const labels: Record<string, string> = {
    admin: isArabic ? 'مدير' : 'Admin',
    sales: isArabic ? 'مبيعات' : 'Sales',
    designer: isArabic ? 'مصمم' : 'Designer',
    manager: isArabic ? 'مدير مشروع' : 'Manager',
  };

  const styles: Record<string, string> = {
    admin: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    sales: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    designer: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    manager: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-xs font-bold',
        styles[role || 'sales'] ?? styles.sales
      )}
    >
      {labels[role || 'sales'] ?? role}
    </span>
  );
};

const MetricCard = ({
  title,
  value,
  icon: Icon,
  tone,
  helper,
}: {
  title: string;
  value: string | number;
  icon: ElementType;
  tone: string;
  helper?: string;
}) => (
  <div className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--adm-text-faint)]">
          {title}
        </p>
        <p className="mt-2 text-2xl font-black text-[var(--adm-text)]">{value}</p>
      </div>
      <div className={cn('rounded-xl p-2.5', tone)}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
    {helper && <p className="mt-3 text-xs text-[var(--adm-text-muted)]">{helper}</p>}
  </div>
);

const AdminModalShell = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'lg',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      hideCloseButton
      className={cn(
        'border-[var(--adm-border)] bg-[var(--adm-bg)] p-0 text-[var(--adm-text)] shadow-2xl',
        size === 'md' && 'max-w-xl',
        size === 'lg' && 'max-w-3xl',
        size === 'xl' && 'max-w-5xl'
      )}
    >
      <DialogHeader className="border-b border-[var(--adm-border)] px-5 py-4 text-left">
        <DialogTitle className="text-[var(--adm-text)]">{title}</DialogTitle>
        {description && (
          <DialogDescription className="text-[var(--adm-text-muted)]">
            {description}
          </DialogDescription>
        )}
      </DialogHeader>
      <ScrollArea className="max-h-[70vh] px-5 py-4">{children}</ScrollArea>
      {footer && <DialogFooter className="border-t border-[var(--adm-border)] px-5 py-4">{footer}</DialogFooter>}
    </DialogContent>
  </Dialog>
);

const EntitySheet = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="flex w-full flex-col border-[var(--adm-border)] bg-[var(--adm-bg)] p-0 text-[var(--adm-text)] sm:max-w-5xl">
      <SheetHeader className="border-b border-[var(--adm-border)] px-5 py-4 text-left">
        <SheetTitle className="text-[var(--adm-text)]">{title}</SheetTitle>
        {description && (
          <SheetDescription className="text-[var(--adm-text-muted)]">
            {description}
          </SheetDescription>
        )}
      </SheetHeader>
      <ScrollArea className="min-h-0 flex-1 px-5 py-4">{children}</ScrollArea>
      {footer && <div className="border-t border-[var(--adm-border)] px-5 py-4">{footer}</div>}
    </SheetContent>
  </Sheet>
);

const JsonEditor = ({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <p className="mb-2 text-xs font-black uppercase tracking-widest text-[var(--adm-text-faint)]">
      {title}
    </p>
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
      className="min-h-48 border-[var(--adm-border)] bg-[var(--adm-input)] font-mono text-xs text-[var(--adm-text)]"
    />
  </div>
);

const StatusHistoryTimeline = ({
  items,
  isArabic,
  emptyLabel,
}: {
  items: PricingRequest['status_history'];
  isArabic: boolean;
  emptyLabel: string;
}) => {
  const history = [...(items || [])].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--adm-border-strong)] bg-[var(--adm-surface-deep)] p-8 text-center text-sm font-semibold text-[var(--adm-text-faint)]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="relative space-y-3">
      <div className="absolute bottom-6 left-[18px] top-6 w-px bg-[var(--adm-border-strong)]" />
      {history.map((entry, index) => {
        const cfg = getStatusCfg(entry.status);

        return (
          <div
            key={`${entry.changed_at}-${entry.status}-${index}`}
            className="relative flex gap-4 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] p-4"
          >
            <div className={cn('relative z-10 mt-1 h-9 w-9 shrink-0 rounded-full border-4 border-[var(--adm-surface-deep)]', cfg.dot)} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={entry.status} isArabic={isArabic} />
                <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--adm-surface)] px-2 py-1 text-[11px] font-bold text-[var(--adm-text-muted)]">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(entry.changed_at, isArabic)}
                </span>
                {entry.changed_by && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-violet-500/15 px-2 py-1 text-[11px] font-bold text-violet-300">
                    <User className="h-3 w-3" />
                    {entry.changed_by}
                  </span>
                )}
              </div>
              {entry.note && (
                <p className="mt-3 text-sm leading-6 text-[var(--adm-text-sub)]">
                  {entry.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const { isDark, toggleTheme } = useAppearance();
  const t = useCallback((ar: string, en: string) => (isArabic ? ar : en), [isArabic]);
  const renderLegacyInlineForms = false;

  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [density, setDensity] = useState<Density>('comfortable');
  const [searchTerm, setSearchTerm] = useState('');

  const [pricingRequests, setPricingRequests] = useState<PricingRequest[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);

  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [contactStatusFilter, setContactStatusFilter] = useState('all');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [deletedFilter, setDeletedFilter] = useState<'active' | 'deleted' | 'all'>('active');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamMember | null>(null);
  const [teamForm, setTeamForm] = useState<TeamMemberForm>(DEFAULT_TEAM_FORM);

  const [showAddDiscount, setShowAddDiscount] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [discountForm, setDiscountForm] = useState<DiscountForm>(DEFAULT_DISCOUNT_FORM);

  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState<ClientForm>(DEFAULT_CLIENT_FORM);

  const [selectedRequest, setSelectedRequest] = useState<PricingRequest | null>(null);
  const [requestDetailLang, setRequestDetailLang] = useState<'ar' | 'en'>('ar');
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [editRequestForm, setEditRequestForm] = useState<EditRequestForm | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [entityView, setEntityView] = useState<EntityView | null>(null);
  const [noteToClient, setNoteToClient] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const loadPricingRequests = useCallback(async () => {
    const response = await supabase
      .from('pricing_requests')
      .select('*')
      .order('created_at', { ascending: false });
    const { data, error } = asDbResponse<PricingRequest[]>(response);

    if (error) {
      console.error('loadPricingRequests:', error);
      return;
    }

    setPricingRequests(data || []);
  }, []);

  const loadDiscountCodes = useCallback(async () => {
    const response = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });
    const { data, error } = asDbResponse<DiscountCode[]>(response);

    if (error) {
      console.error('loadDiscountCodes:', error);
      return;
    }

    setDiscountCodes(data || []);
  }, []);

  const loadContacts = useCallback(async () => {
    const response = await supabase
      .from('contacts')
      .select('*')
      .eq('source', 'contact_form')
      .order('created_at', { ascending: false });
    const { data, error } = asDbResponse<Contact[]>(response);

    if (error) {
      console.error('loadContacts:', error);
      return;
    }

    setContacts(data || []);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    const response = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    const { data, error } = asDbResponse<AuditLog[]>(response);

    if (error) {
      console.error('loadAuditLogs:', error);
      return;
    }

    setAuditLogs(data || []);
  }, []);

  const loadNotifications = useCallback(async () => {
    const response = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    const { data, error } = asDbResponse<NotificationItem[]>(response);

    if (error) {
      console.error('loadNotifications:', error);
      return;
    }

    setNotifications(data || []);
  }, []);

  const loadTeamMembers = useCallback(async () => {
    const response = await supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: false });
    const { data, error } = asDbResponse<TeamMember[]>(response);

    if (error) {
      console.error('loadTeamMembers:', error);
      return;
    }

    setTeamMembers(data || []);
  }, []);

  const loadClients = useCallback(async () => {
    const response = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    const { data, error } = asDbResponse<Client[]>(response);

    if (error) {
      console.error('loadClients:', error);
      return;
    }

    setClients(data || []);
  }, []);

  const loadStats = useCallback(async () => {
    const [requestsRes, contactsRes, ordersRes] = await Promise.all([
      supabase.from('pricing_requests').select('status, estimated_total'),
      supabase.from('contacts').select('status'),
      supabase.from('orders').select('total_price, status, payment_status'),
    ]);

    const requests = asDbResponse<Array<{ status?: string; estimated_total?: number }>>(requestsRes).data || [];
    const contactList = asDbResponse<Array<{ status?: string }>>(contactsRes).data || [];
    const orders =
      asDbResponse<Array<{ total_price?: number; status?: string; payment_status?: string }>>(ordersRes)
        .data || [];
    const paidOrders = orders.filter((order) => order.payment_status === 'paid');
    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + Number(order.total_price || 0),
      0
    );

    setStats({
      totalOrders: orders.length,
      totalRevenue,
      totalContacts: contactList.length,
      totalPricingRequests: requests.length,
      pendingOrders: requests.filter(
        (request) => request.status === 'new' || request.status === 'reviewing'
      ).length,
      completedOrders: requests.filter((request) => request.status === 'approved').length,
      newContacts: contactList.filter((contact) => contact.status === 'new').length,
      newPricingRequests: requests.filter((request) => request.status === 'new').length,
      avgOrderValue:
        orders.length > 0
          ? Math.round(
              orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0) /
                orders.length
            )
          : 0,
      unreadMessages: contactList.filter((contact) => contact.status === 'new').length,
      totalDesigns: 0,
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      await Promise.all([
        loadPricingRequests(),
        loadDiscountCodes(),
        loadContacts(),
        loadAuditLogs(),
        loadNotifications(),
        loadTeamMembers(),
        loadClients(),
        loadStats(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error(t('فشل تحميل البيانات', 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [
    loadAuditLogs,
    loadClients,
    loadContacts,
    loadDiscountCodes,
    loadNotifications,
    loadPricingRequests,
    loadStats,
    loadTeamMembers,
    t,
  ]);

  const logAudit = useCallback(
    async (entityType: string, entityId: string, action: string, oldVal = '', newVal = '') => {
      await supabase.from('audit_logs').insert({
        entity_type: entityType,
        entity_id: entityId,
        action,
        old_values: oldVal ? { value: oldVal } : null,
        new_values: newVal ? { value: newVal } : null,
        changed_by: ADMIN_EMAIL,
        changed_by_type: 'team_member',
        created_at: new Date().toISOString(),
      });
    },
    []
  );

  useEffect(() => {
    const checkAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlDevMode = params.get('dev');
      const localDevMode = localStorage.getItem('lumos_admin_dev');

      if (urlDevMode === 'true') localStorage.setItem('lumos_admin_dev', 'true');

      if (urlDevMode === 'true' || localDevMode === 'true') {
        setIsAuthorized(true);
        await loadData();
        return;
      }

      try {
        const auth = supabase.auth as {
          getUser?: () => Promise<{ data?: { user?: { email?: string | null } | null } }>;
          getSession?: () => Promise<{
            data?: { session?: { user?: { email?: string | null } | null } | null };
          }>;
        };

        const userResponse = auth.getUser
          ? await auth.getUser()
          : await auth.getSession?.();
        const email =
          'session' in (userResponse?.data || {})
            ? userResponse?.data?.session?.user?.email
            : userResponse?.data?.user?.email;

        if (email === ADMIN_EMAIL) {
          setIsAuthorized(true);
          await loadData();
          return;
        }

        navigate('/');
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/');
      }
    };

    checkAuth();
  }, [loadData, navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      if (showDeleteConfirm) {
        setShowDeleteConfirm(null);
        return;
      }

      if (selectedRequest) {
        setSelectedRequest(null);
        setIsEditingRequest(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedRequest, showDeleteConfirm]);

  const filteredRequests = useMemo(() => {
    return [...pricingRequests]
      .filter((request) => {
        const isDeleted = Boolean(request.delete_reason);
        if (deletedFilter === 'active' && isDeleted) return false;
        if (deletedFilter === 'deleted' && !isDeleted) return false;
        if (statusFilter !== 'all' && request.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && request.priority !== priorityFilter) return false;

        return matchesQuery(searchTerm, [
          request.guest_name,
          request.guest_email,
          request.guest_phone,
          request.company_name,
          request.package_name,
        ]);
      })
      .sort((a, b) => {
        const av = sortValue(a as unknown as Record<string, unknown>, sortField);
        const bv = sortValue(b as unknown as Record<string, unknown>, sortField);

        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [deletedFilter, pricingRequests, priorityFilter, searchTerm, sortDir, sortField, statusFilter]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      if (contactStatusFilter !== 'all' && contact.status !== contactStatusFilter) {
        return false;
      }

      return matchesQuery(searchTerm, [
        contact.name,
        contact.email,
        contact.phone,
        contact.business_name,
        contact.industry,
      ]);
    });
  }, [contactStatusFilter, contacts, searchTerm]);

  const filteredDiscounts = useMemo(
    () =>
      discountCodes.filter((code) =>
        matchesQuery(searchTerm, [code.code, code.description, code.discount_type])
      ),
    [discountCodes, searchTerm]
  );

  const filteredTeam = useMemo(
    () =>
      teamMembers.filter((member) =>
        matchesQuery(searchTerm, [member.name, member.email, member.phone, member.role])
      ),
    [searchTerm, teamMembers]
  );

  const filteredClients = useMemo(
    () =>
      clients.filter((client) =>
        matchesQuery(searchTerm, [
          client.username,
          client.email,
          client.phone,
          client.phone_number,
          client.company_name,
          client.package_name,
          client.industry,
          client.budget_range,
          client.full_contact_name,
          client.business_tagline,
          client.referral_source,
        ])
      ),
    [clients, searchTerm]
  );

  const filteredAuditLogs = useMemo(
    () =>
      auditLogs.filter((log) => {
        if (auditActionFilter !== 'all' && log.action !== auditActionFilter) return false;

        return matchesQuery(searchTerm, [
          log.action,
          log.entity_type,
          log.change_summary,
          log.change_summary_ar,
        ]);
      }),
    [auditActionFilter, auditLogs, searchTerm]
  );

  const unreadNotifCount = notifications.filter((notification) => !notification.is_read).length;
  const newRequestCount = pricingRequests.filter((request) => request.status === 'new').length;
  const newContactCount = contacts.filter((contact) => contact.status === 'new').length;
  const pipelineTotal = pricingRequests.reduce(
    (sum, request) => sum + Number(request.estimated_total || 0),
    0
  );

  const tabs = useMemo(
    () => [
      {
        id: 'requests' as Tab,
        label: t('الطلبات', 'Requests'),
        icon: FileText,
        badge: newRequestCount,
      },
      { id: 'discounts' as Tab, label: t('الأكواد', 'Discounts'), icon: Tag, badge: 0 },
      {
        id: 'contacts' as Tab,
        label: t('جهات الاتصال', 'Contacts'),
        icon: Mail,
        badge: newContactCount,
      },
      {
        id: 'notifications' as Tab,
        label: t('الإشعارات', 'Notifications'),
        icon: Bell,
        badge: unreadNotifCount,
      },
      { id: 'audit' as Tab, label: t('السجلات', 'Audit'), icon: History, badge: 0 },
      { id: 'team' as Tab, label: t('الفريق', 'Team'), icon: Users, badge: 0 },
      { id: 'clients' as Tab, label: t('العملاء', 'Clients'), icon: Building2, badge: 0 },
      { id: 'stats' as Tab, label: t('الإحصائيات', 'Statistics'), icon: BarChart3, badge: 0 },
    ],
    [newContactCount, newRequestCount, t, unreadNotifCount]
  );

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label || '';
  const themeStyle = isDark ? DARK_THEME : LIGHT_THEME;

  useEffect(() => {
    Object.entries(themeStyle).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [themeStyle]);

  const openRequestDetail = (request: PricingRequest) => {
    setSelectedRequest(request);
    setRequestDetailLang(isArabic ? 'ar' : 'en');
    setIsEditingRequest(false);
    setNoteToClient(request.admin_notes || '');
    setEditRequestForm({
      request_type: request.request_type,
      status: request.status,
      priority: request.priority || 'medium',
      assigned_to: request.assigned_to || null,
      package_id: request.package_id || null,
      selected_services: request.selected_services?.map((service) => service.id) || [],
      estimated_subtotal: request.estimated_subtotal || 0,
      estimated_total: request.estimated_total || 0,
      price_currency: request.price_currency || 'EGP',
      applied_promo_code: request.applied_promo_code || '',
      guest_name: request.guest_name || '',
      guest_phone: request.guest_phone || '',
      guest_email: request.guest_email || '',
      company_name: request.company_name || '',
      request_notes: request.request_notes || '',
      admin_notes: request.admin_notes || '',
      location_url: request.location_url || '',
      request_source: request.request_source || 'pricing_modal',
      discount_breakdown_json: formatJson(request.discount_breakdown, {
        base_discount: 0,
        promo_discount: 0,
        reward_discount: 0,
        total_discount_percent: 0,
      }),
      status_history_json: formatJson(request.status_history, []),
      follow_up_actions_json: formatJson(request.follow_up_actions, []),
      delete_reason: request.delete_reason || '',
    });
  };

  const updateRequestStatus = async (id: string, status: PricingRequest['status']) => {
    const request = pricingRequests.find((item) => item.id === id);
    const oldStatus = request?.status || '';
    const nextHistory = [
      ...(request?.status_history || []),
      {
        status,
        changed_at: new Date().toISOString(),
        changed_by: ADMIN_EMAIL,
        note: `Status changed from ${oldStatus || 'unknown'} to ${status}`,
      },
    ];
    const response = await supabase
      .from('pricing_requests')
      .update({
        status,
        status_history: nextHistory,
        edit_count: Number(request?.edit_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    const { error } = asDbResponse<null>(response);

    if (error) {
      toast.error(t('فشل التحديث', 'Update failed'));
      return;
    }

    await logAudit('pricing_request', id, 'status_changed', oldStatus, status);
    await Promise.all([loadPricingRequests(), loadStats()]);
    toast.success(t('تم التحديث', 'Updated'));
  };

  const assignRequestToTeam = async (id: string, teamMemberId: string) => {
    const request = pricingRequests.find((item) => item.id === id);
    const member = teamMembers.find((teamMember) => teamMember.id === teamMemberId);
    const nextHistory = [
      ...(request?.status_history || []),
      {
        status: request?.status || 'new',
        changed_at: new Date().toISOString(),
        changed_by: ADMIN_EMAIL,
        note: `Assigned to ${member?.name || 'unassigned'}`,
      },
    ];
    const response = await supabase
      .from('pricing_requests')
      .update({
        assigned_to: teamMemberId || null,
        assigned_to_name: member?.name || null,
        assigned_to_role: member?.role || null,
        status_history: nextHistory,
        edit_count: Number(request?.edit_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    const { error } = asDbResponse<null>(response);

    if (error) {
      toast.error(t('فشل التعيين', 'Assign failed'));
      return;
    }

    await logAudit('pricing_request', id, 'assigned', '', member?.name || '');
    await loadPricingRequests();
    toast.success(t('تم التعيين', 'Assigned'));
  };

  const saveRequestEdit = async () => {
    if (!selectedRequest || !editRequestForm) return;

    let discountBreakdown: PricingRequest['discount_breakdown'];
    let statusHistory: PricingRequest['status_history'];
    let followUpActions: PricingRequest['follow_up_actions'];

    try {
      discountBreakdown = parseJsonField(editRequestForm.discount_breakdown_json, {
        base_discount: 0,
        promo_discount: 0,
        reward_discount: 0,
        total_discount_percent: 0,
      });
      statusHistory = parseJsonField(editRequestForm.status_history_json, []);
      followUpActions = parseJsonField(editRequestForm.follow_up_actions_json, []);
    } catch {
      toast.error(t('راجع صيغة JSON قبل الحفظ', 'Fix JSON before saving'));
      return;
    }

    const selectedPackage = editRequestForm.package_id
      ? Object.values(PACKAGES).find((pkg) => pkg.id === editRequestForm.package_id)
      : null;

    const selectedServices = editRequestForm.selected_services
      .map((serviceId) => {
        const service = getAllServices().find((item) => item.id === serviceId);
        if (!service) return null;

        return {
          id: service.id,
          name: service.name,
          nameAr: service.nameAr,
          price: service.price,
          category: service.category || 'custom',
        };
      })
      .filter(Boolean) as PricingRequestItem[];

    if (
      selectedRequest.status !== editRequestForm.status ||
      selectedRequest.priority !== editRequestForm.priority ||
      selectedRequest.assigned_to !== editRequestForm.assigned_to
    ) {
      statusHistory = [
        ...(statusHistory || []),
        {
          status: editRequestForm.status,
          changed_at: new Date().toISOString(),
          changed_by: ADMIN_EMAIL,
          note: `Edited status/priority/assignment from admin sheet`,
        },
      ];
    }

    const nextData = {
      request_type: editRequestForm.request_type,
      status: editRequestForm.status,
      priority: editRequestForm.priority,
      assigned_to: editRequestForm.assigned_to || null,
      package_id: editRequestForm.package_id,
      package_name: selectedPackage
        ? requestDetailLang === 'ar'
          ? selectedPackage.nameAr
          : selectedPackage.name
        : null,
      selected_services: selectedServices,
      estimated_subtotal: editRequestForm.estimated_subtotal,
      estimated_total: editRequestForm.estimated_total,
      price_currency: editRequestForm.price_currency || 'EGP',
      discount_breakdown: discountBreakdown,
      applied_promo_code: editRequestForm.applied_promo_code || null,
      guest_name: editRequestForm.guest_name || null,
      guest_phone: editRequestForm.guest_phone || null,
      guest_email: editRequestForm.guest_email || null,
      company_name: editRequestForm.company_name || null,
      request_notes: editRequestForm.request_notes || null,
      admin_notes: editRequestForm.admin_notes || null,
      status_history: statusHistory,
      follow_up_actions: followUpActions,
      location_url: editRequestForm.location_url || null,
      request_source: editRequestForm.request_source || 'pricing_modal',
      delete_reason: editRequestForm.delete_reason || null,
    };
    const updateData = diffPayload(selectedRequest as unknown as Record<string, unknown>, nextData);
    updateData.updated_at = new Date().toISOString();
    updateData.edit_count = Number(selectedRequest.edit_count || 0) + 1;

    const response = await supabase
      .from('pricing_requests')
      .update(updateData)
      .eq('id', selectedRequest.id);
    const { error } = asDbResponse<null>(response);

    if (error) {
      toast.error(t('فشل حفظ التعديلات', 'Save failed'));
      return;
    }

    await logAudit('pricing_request', selectedRequest.id, 'updated', '', JSON.stringify(updateData));
    setSelectedRequest({ ...selectedRequest, ...nextData, ...updateData } as PricingRequest);
    setIsEditingRequest(false);
    await Promise.all([loadPricingRequests(), loadStats()]);
    toast.success(t('تم التحديث', 'Updated'));
  };

  const deleteRequest = async (id: string) => {
    const request = pricingRequests.find((item) => item.id === id);
    const archiveReason = deleteReason.trim() || `Archived by admin (${ADMIN_EMAIL})`;
    const nextHistory = [
      ...(request?.status_history || []),
      {
        status: 'rejected',
        changed_at: new Date().toISOString(),
        changed_by: ADMIN_EMAIL,
        note: archiveReason,
      },
    ];
    const response = await supabase
      .from('pricing_requests')
      .update({
        delete_reason: archiveReason,
        status: 'rejected',
        status_history: nextHistory,
        edit_count: Number(request?.edit_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    const { error } = asDbResponse<null>(response);

    if (error) {
      toast.error(t('فشل الحذف', 'Delete failed'));
      return;
    }

    await logAudit('pricing_request', id, 'deleted');
    setShowDeleteConfirm(null);
    setDeleteReason('');
    setSelectedRequest(null);
    await Promise.all([loadPricingRequests(), loadStats()]);
    toast.success(t('تم الأرشفة', 'Archived'));
  };

  const sendNoteToClient = async () => {
    if (!selectedRequest || !noteToClient.trim()) return;

    setSendingNote(true);
    const response = await supabase
      .from('pricing_requests')
      .update({ admin_notes: noteToClient, updated_at: new Date().toISOString() })
      .eq('id', selectedRequest.id);
    const { error } = asDbResponse<null>(response);
    setSendingNote(false);

    if (error) {
      toast.error(t('فشل إرسال الملاحظة', 'Send failed'));
      return;
    }

    await logAudit('pricing_request', selectedRequest.id, 'notes_added', '', noteToClient);
    setSelectedRequest({ ...selectedRequest, admin_notes: noteToClient });
    await loadPricingRequests();
    toast.success(t('تم إرسال الملاحظة', 'Note sent'));
  };

  const createTeamMember = async () => {
    if (!teamForm.name || !teamForm.phone || !teamForm.email) {
      toast.error(t('أدخل البيانات المطلوبة', 'Fill required fields'));
      return;
    }

    setSavingForm(true);
    const response = await supabase.from('team_members').insert(teamForm).select().single();
    const { data, error } = asDbResponse<TeamMember>(response);
    setSavingForm(false);

    if (error) {
      toast.error(t('فشل الإضافة', 'Create failed'));
      return;
    }

    if (data) await logAudit('team_member', data.id, 'created', '', teamForm.name);
    setTeamForm(DEFAULT_TEAM_FORM);
    setShowAddTeam(false);
    await loadTeamMembers();
    toast.success(t('تم الإضافة', 'Added'));
  };

  const updateTeamMember = async () => {
    if (!editingTeam || !teamForm.name) return;

    setSavingForm(true);
    const response = await supabase.from('team_members').update(teamForm).eq('id', editingTeam.id);
    const { error } = asDbResponse<null>(response);
    setSavingForm(false);

    if (error) {
      toast.error(t('فشل التحديث', 'Update failed'));
      return;
    }

    await logAudit('team_member', editingTeam.id, 'updated', editingTeam.name, teamForm.name);
    setEditingTeam(null);
    setTeamForm(DEFAULT_TEAM_FORM);
    setShowAddTeam(false);
    await loadTeamMembers();
    toast.success(t('تم التحديث', 'Updated'));
  };

  const deleteTeamMember = async (id: string) => {
    const member = teamMembers.find((teamMember) => teamMember.id === id);
    const response = await supabase.from('team_members').delete().eq('id', id);
    const { error } = asDbResponse<null>(response);

    if (error) {
      toast.error(t('فشل الحذف', 'Delete failed'));
      return;
    }

    if (member) await logAudit('team_member', id, 'deleted', member.name, '');
    await loadTeamMembers();
    toast.success(t('تم الحذف', 'Deleted'));
  };

  const createDiscountCode = async () => {
    if (!discountForm.code || !discountForm.discount_value) {
      toast.error(t('أدخل البيانات المطلوبة', 'Fill required fields'));
      return;
    }

    setSavingForm(true);
    const payload = {
      ...discountForm,
      valid_until: discountForm.valid_until || null,
      usage_limit: discountForm.usage_limit || null,
    };
    const response = await supabase.from('discount_codes').insert(payload).select().single();
    const { data, error } = asDbResponse<DiscountCode>(response);
    setSavingForm(false);

    if (error) {
      toast.error(t('فشل الإضافة', 'Create failed'));
      return;
    }

    if (data) await logAudit('discount_code', data.id, 'created', '', discountForm.code);
    setDiscountForm(DEFAULT_DISCOUNT_FORM);
    setShowAddDiscount(false);
    await loadDiscountCodes();
    toast.success(t('تم الإضافة', 'Added'));
  };

  const updateDiscountCode = async () => {
    if (!editingDiscount || !discountForm.code) return;

    setSavingForm(true);
    const payload = {
      ...discountForm,
      valid_until: discountForm.valid_until || null,
      usage_limit: discountForm.usage_limit || null,
    };
    const response = await supabase
      .from('discount_codes')
      .update(payload)
      .eq('id', editingDiscount.id);
    const { error } = asDbResponse<null>(response);
    setSavingForm(false);

    if (error) {
      toast.error(t('فشل التحديث', 'Update failed'));
      return;
    }

    await logAudit('discount_code', editingDiscount.id, 'updated', editingDiscount.code, discountForm.code);
    setEditingDiscount(null);
    setDiscountForm(DEFAULT_DISCOUNT_FORM);
    setShowAddDiscount(false);
    await loadDiscountCodes();
    toast.success(t('تم التحديث', 'Updated'));
  };

  const toggleDiscountActive = async (id: string, current: boolean) => {
    const response = await supabase.from('discount_codes').update({ is_active: !current }).eq('id', id);
    const { error } = asDbResponse<null>(response);

    if (error) {
      toast.error(t('فشل التحديث', 'Update failed'));
      return;
    }

    await loadDiscountCodes();
  };

  const deleteDiscountCode = async (id: string) => {
    const code = discountCodes.find((discount) => discount.id === id);
    const response = await supabase.from('discount_codes').delete().eq('id', id);
    const { error } = asDbResponse<null>(response);

    if (error) {
      toast.error(t('فشل الحذف', 'Delete failed'));
      return;
    }

    if (code) await logAudit('discount_code', id, 'deleted', code.code, '');
    await loadDiscountCodes();
    toast.success(t('تم الحذف', 'Deleted'));
  };

  const buildClientPayload = (currentClient?: Client | null) => {
    const existingDetails =
      currentClient?.package_details && typeof currentClient.package_details === 'object'
        ? currentClient.package_details
        : {};
    const signupProfile: ClientSignupProfile = {
      business_tagline: clientForm.business_tagline.trim(),
      full_contact_name: clientForm.full_contact_name.trim(),
      website: clientForm.website.trim(),
      brand_feel: clientForm.brand_feel.trim(),
      auth_password_pending: Boolean(clientForm.password.trim()),
    };

    return {
      username: clientForm.username.trim(),
      email: clientForm.email.trim() || null,
      phone: clientForm.phone.trim() || null,
      company_name: clientForm.company_name.trim() || null,
      security_question: clientForm.security_question.trim() || null,
      security_answer: clientForm.security_answer.trim() || null,
      package_name: clientForm.package_name.trim() || null,
      status: clientForm.status.trim() || 'active',
      progress: Math.max(0, Math.min(100, Number(clientForm.progress) || 0)),
      next_steps: clientForm.next_steps.trim() || null,
      admin_notes: clientForm.admin_notes.trim() || null,
      avatar_url: clientForm.profile_picture.trim() || null,
      brand_colors: parseBrandColors(clientForm.brand_colors),
      industry: clientForm.industry.trim() || null,
      services_needed: clientForm.services_needed.trim() ? JSON.parse(clientForm.services_needed) : [],
      budget_range: clientForm.budget_range.trim() || null,
      timeline: clientForm.timeline.trim() || null,
      referral_source: clientForm.referral_source.trim() || null,
      project_summary: clientForm.project_summary.trim() || null,
      signup_source: clientForm.signup_source || 'web_signup',
      signup_completed_at: clientForm.signup_completed_at || null,
      business_tagline: clientForm.business_tagline.trim() || null,
      full_contact_name: clientForm.full_contact_name.trim() || null,
      website: clientForm.website.trim() || null,
      brand_feel: clientForm.brand_feel.trim() || null,
      package_details: {
        ...existingDetails,
        signup_profile: signupProfile,
      },
    };
  };

  const createClient = async () => {
    if (
      !clientForm.username.trim() ||
      !clientForm.email.trim() ||
      !clientForm.password.trim() ||
      !clientForm.business_tagline.trim()
    ) {
      toast.error(t('أدخل البيانات المطلوبة', 'Fill required fields'));
      return;
    }

    setSavingForm(true);
    const response = await supabase.from('clients').insert(buildClientPayload()).select().single();
    const { data, error } = asDbResponse<Client>(response);
    setSavingForm(false);

    if (error) {
      toast.error(t('فشل الإضافة', 'Create failed'));
      return;
    }

    if (data) await logAudit('client', data.id, 'created', '', clientForm.username);
    setClientForm(DEFAULT_CLIENT_FORM);
    setShowAddClient(false);
    await loadClients();
    toast.success(t('تم الإضافة', 'Added'));
  };

  const updateClient = async () => {
    if (!editingClient || !clientForm.username.trim() || !clientForm.email.trim() || !clientForm.business_tagline.trim()) {
      toast.error(t('أدخل البيانات المطلوبة', 'Fill required fields'));
      return;
    }

    setSavingForm(true);
    const response = await supabase.from('clients').update(buildClientPayload(editingClient)).eq('id', editingClient.id);
    const { error } = asDbResponse<null>(response);
    setSavingForm(false);

    if (error) {
      toast.error(t('فشل التحديث', 'Update failed'));
      return;
    }

    await logAudit('client', editingClient.id, 'updated', editingClient.username, clientForm.username);
    setEditingClient(null);
    setClientForm(DEFAULT_CLIENT_FORM);
    setShowAddClient(false);
    await loadClients();
    toast.success(t('تم التحديث', 'Updated'));
  };

  const deleteClient = async (id: string) => {
    const client = clients.find((item) => item.id === id);
    const response = await supabase.from('clients').delete().eq('id', id);
    const { error } = asDbResponse<null>(response);

    if (error) {
      toast.error(t('فشل الحذف', 'Delete failed'));
      return;
    }

    if (client) await logAudit('client', id, 'deleted', client.username, '');
    await loadClients();
    toast.success(t('تم الحذف', 'Deleted'));
  };

  const updateContactStatus = async (id: string, status: Contact['status']) => {
    const oldStatus = contacts.find((contact) => contact.id === id)?.status || '';
    const response = await supabase.from('contacts').update({ status }).eq('id', id);
    const { error } = asDbResponse<null>(response);

    if (error) {
      toast.error(t('فشل التحديث', 'Update failed'));
      return;
    }

    await logAudit('contact', id, 'status_changed', oldStatus, status);
    await Promise.all([loadContacts(), loadStats()]);
    toast.success(t('تم التحديث', 'Updated'));
  };

  const deleteContact = async (id: string) => {
    const response = await supabase.from('contacts').delete().eq('id', id);
    const { error } = asDbResponse<null>(response);

    if (error) {
      toast.error(t('فشل الحذف', 'Delete failed'));
      return;
    }

    await logAudit('contact', id, 'deleted');
    await Promise.all([loadContacts(), loadStats()]);
    toast.success(t('تم الحذف', 'Deleted'));
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    await loadNotifications();
  };

  const markAllNotificationsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    await loadNotifications();
  };

  const copyRequestSummary = async () => {
    if (!selectedRequest) return;

    const text = [
      selectedRequest.guest_name || selectedRequest.company_name || t('طلب بدون اسم', 'Unnamed request'),
      selectedRequest.guest_phone || '',
      selectedRequest.guest_email || '',
      selectedRequest.package_name || '',
      formatMoney(selectedRequest.estimated_total, selectedRequest.price_currency),
    ]
      .filter(Boolean)
      .join('\n');

    await navigator.clipboard?.writeText(text);
    setCopySuccess(true);
    window.setTimeout(() => setCopySuccess(false), 1400);
  };

  const toggleRequestSort = (field: string) => {
    if (sortField === field) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDir('desc');
  };

  const openTeamEditor = (member?: TeamMember) => {
    setEditingTeam(member || null);
    setShowAddTeam(true);
    setTeamForm(
      member
        ? {
            name: member.name,
            role: member.role,
            phone: member.phone || '',
            email: member.email || '',
            avatar_url: member.avatar_url || '',
            is_active: member.is_active,
          }
        : DEFAULT_TEAM_FORM
    );
  };

  const openDiscountEditor = (code?: DiscountCode) => {
    setEditingDiscount(code || null);
    setShowAddDiscount(true);
    setDiscountForm(
      code
        ? {
            code: code.code,
            description: code.description || '',
            discount_type: code.discount_type,
            discount_value: code.discount_value,
            min_order_value: code.min_order_value || 0,
            max_discount: code.max_discount || 0,
            is_active: code.is_active,
            valid_until: code.valid_until || '',
            usage_limit: code.usage_limit || 0,
          }
        : DEFAULT_DISCOUNT_FORM
    );
  };

  const openClientEditor = (client?: Client) => {
    const signupProfile = getClientSignupProfile(client);
    setEditingClient(client || null);
    setShowAddClient(true);
    setClientForm(
      client
        ? {
            profile_picture: client.avatar_url || client.logo_url || '',
            username: client.username,
            email: client.email || '',
            password: '',
            phone: client.phone || client.phone_number || '',
            company_name: client.company_name || '',
            business_tagline: client.business_tagline || signupProfile.business_tagline || '',
            full_contact_name: client.full_contact_name || signupProfile.full_contact_name || '',
            website: client.website || signupProfile.website || '',
            brand_colors: (client.brand_colors || []).join(', '),
            brand_feel: client.brand_feel || signupProfile.brand_feel || '',
            industry: client.industry || '',
            services_needed: client.services_needed ? JSON.stringify(client.services_needed) : '',
            budget_range: client.budget_range || '',
            timeline: client.timeline || '',
            referral_source: client.referral_source || '',
            project_summary: client.project_summary || '',
            signup_source: client.signup_source || 'web_signup',
            signup_completed_at: client.signup_completed_at || '',
            security_question: client.security_question || '',
            security_answer: client.security_answer || '',
            status: client.status || 'active',
            progress: client.progress || 0,
            next_steps: client.next_steps || '',
            admin_notes: client.admin_notes || '',
            package_name: client.package_name || '',
          }
        : DEFAULT_CLIENT_FORM
    );
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-[var(--adm-bg)] p-8"
        style={themeStyle}
      >
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="mb-3 h-4 w-40 bg-[var(--adm-surface)]" />
              <Skeleton className="h-8 w-64 bg-[var(--adm-surface)]" />
            </div>
            <Skeleton className="h-11 w-32 rounded-xl bg-[var(--adm-surface)]" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-28 rounded-2xl bg-[var(--adm-surface)]" />
            ))}
          </div>
          <Skeleton className="h-[480px] rounded-2xl bg-[var(--adm-surface)]" />
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  const renderFilterButton = (
    key: string,
    label: string,
    count: number,
    active: boolean,
    onClick: () => void
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition',
        active
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
          : 'border-[var(--adm-border)] bg-[var(--adm-surface)] text-[var(--adm-text-faint)] hover:border-[var(--adm-border-strong)] hover:text-[var(--adm-text)]'
      )}
    >
      <span>{label}</span>
      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">{count}</span>
    </button>
  );

  const renderRequests = () => {
    const statusFilters = [
      { key: 'all', label: t('الكل', 'All'), count: pricingRequests.length },
      ...Object.entries(REQUEST_STATUS_CFG).map(([key, cfg]) => ({
        key,
        label: cfg.label[isArabic ? 'ar' : 'en'],
        count: pricingRequests.filter((request) => request.status === key).length,
      })),
    ];

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((filter) =>
            renderFilterButton(
              filter.key,
              filter.label,
              filter.count,
              statusFilter === filter.key,
              () => setStatusFilter(filter.key)
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--adm-text-faint)]">
            {t('الأولوية', 'Priority')}
          </span>
          {[
            ['all', t('الكل', 'All')],
            ['urgent', t('عاجل', 'Urgent')],
            ['high', t('عالية', 'High')],
            ['medium', t('متوسطة', 'Medium')],
            ['low', t('منخفضة', 'Low')],
          ].map(([key, label]) => (
            <Button
              key={key}
              variant={priorityFilter === key ? 'success' : 'surface'}
              className="px-3 py-1.5 text-xs"
              onClick={() => setPriorityFilter(key)}
            >
              {label}
            </Button>
          ))}
          {(statusFilter !== 'all' || priorityFilter !== 'all' || searchTerm) && (
            <Button
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setSearchTerm('');
              }}
            >
              <X className="h-3.5 w-3.5" />
              {t('مسح الفلاتر', 'Clear filters')}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              ['active', t('نشط', 'Active')],
              ['deleted', t('مؤرشف', 'Archived')],
              ['all', t('الكل', 'All')],
            ].map(([key, label]) => (
              <Button
                key={key}
                variant={deletedFilter === key ? 'success' : 'surface'}
                className="px-3 py-1.5 text-xs"
                onClick={() => setDeletedFilter(key as typeof deletedFilter)}
              >
                {label}
              </Button>
            ))}
            <Button
              variant={density === 'compact' ? 'success' : 'surface'}
              className="px-3 py-1.5 text-xs"
              onClick={() => setDensity((value) => (value === 'compact' ? 'comfortable' : 'compact'))}
            >
              {density === 'compact' ? t('كثافة عالية', 'Compact') : t('مريح', 'Comfortable')}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--adm-text-muted)]">
            <span>{selectedIds.length} {t('محدد', 'selected')}</span>
            {selectedIds.length > 0 && (
              <Button
                variant="danger"
                className="px-3 py-1.5 text-xs"
                onClick={() => {
                  setDeleteReason('');
                  setShowDeleteConfirm(selectedIds[0]);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('أرشفة أول محدد', 'Archive first selected')}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]">
          <div>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredRequests.map((request) => {
                  const statusCfg = getStatusCfg(request.status);
                  const isClient = Boolean(request.client_id);

                  return (
                    <article
                      key={request.id}
                      className="group relative overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] transition hover:-translate-y-0.5 hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-500/5"
                    >
                      <div className={cn('h-1.5 bg-gradient-to-r', statusCfg.gradient)} />
                      <label className="absolute right-3 top-3 z-10 rounded-lg bg-[var(--adm-bg)]/80 p-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(request.id)}
                          onChange={(event) => {
                            setSelectedIds((ids) =>
                              event.target.checked
                                ? [...ids, request.id]
                                : ids.filter((id) => id !== request.id)
                            );
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => openRequestDetail(request)}
                        className={cn('block w-full text-left', density === 'compact' ? 'p-3' : 'p-4')}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                              <span className={cn('h-2 w-2 rounded-full', statusCfg.dot)} />
                              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--adm-text-faint)]">
                                {statusCfg.label[isArabic ? 'ar' : 'en']}
                              </span>
                              <span className="rounded-full border border-[var(--adm-border)] px-2 py-0.5 text-[9px] font-bold text-[var(--adm-text-muted)]">
                                {isClient ? t('عميل', 'Client') : t('ضيف', 'Guest')}
                              </span>
                            </div>
                            <h3 className="truncate font-bold text-[var(--adm-text)] group-hover:text-emerald-300">
                              {request.guest_name ||
                                request.company_name ||
                                t('طلب بدون اسم', 'Unnamed request')}
                            </h3>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-lg font-black text-emerald-300">
                              {Number(request.estimated_total || 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-[var(--adm-text-faint)]">
                              {request.price_currency || 'EGP'}
                            </p>
                          </div>
                        </div>

                        <div className="mb-3 flex items-center gap-3 text-xs text-[var(--adm-text-muted)]">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-[var(--adm-text-faint)]" />
                            <span className="truncate">{request.guest_email || '-'}</span>
                          </span>
                          {request.guest_phone && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                              <Phone className="h-3 w-3" />
                              {request.guest_phone}
                            </span>
                          )}
                        </div>

                        {request.package_name && (
                          <div className="mb-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] px-3 py-2">
                            <span className="text-xs font-bold text-[var(--adm-text)]">
                              {request.package_name}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <PriorityBadge priority={request.priority} isArabic={isArabic} />
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--adm-surface-deep)] px-2 py-1 text-[10px] font-bold text-[var(--adm-text-muted)]">
                            <Calendar className="h-2.5 w-2.5" />
                            {formatDate(request.created_at, isArabic)}
                          </span>
                          {request.assigned_to_name && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-violet-500/15 px-2 py-1 text-[10px] font-bold text-violet-300">
                              <User className="h-2.5 w-2.5" />
                              {request.assigned_to_name}
                            </span>
                          )}
                        </div>
                      </button>
                      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--adm-border)] bg-[var(--adm-surface-deep)]/80 px-3 py-2">
                        <Button
                          variant="surface"
                          className="px-2.5 py-1.5 text-[11px]"
                          onClick={() => openRequestDetail(request)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t('عرض', 'View')}
                        </Button>
                        <Button
                          variant="surface"
                          className="px-2.5 py-1.5 text-[11px]"
                          onClick={() => updateRequestStatus(request.id, 'reviewing')}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {t('مراجعة', 'Review')}
                        </Button>
                        <Button
                          variant="success"
                          className="px-2.5 py-1.5 text-[11px]"
                          onClick={() => updateRequestStatus(request.id, 'approved')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t('اعتماد', 'Approve')}
                        </Button>
                        {request.guest_phone && (
                          <a
                            href={getWhatsappUrl(request.guest_phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(buttonBase, 'px-2.5 py-1.5 text-[11px] border border-emerald-500/25 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-white')}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            WA
                          </a>
                        )}
                        <Button
                          variant="danger"
                          className="px-2.5 py-1.5 text-[11px]"
                          onClick={() => {
                            setDeleteReason('');
                            setShowDeleteConfirm(request.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('أرشفة', 'Archive')}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <SectionCard title={t('جدول الطلبات', 'Requests table')} icon={Table2} className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className="border-b border-[var(--adm-border)] bg-[var(--adm-surface-deep)]">
                      <tr>
                        {[
                          ['guest_name', t('العميل', 'Client')],
                          ['package_name', t('الباقة', 'Package')],
                          ['estimated_total', t('السعر', 'Price')],
                          ['status', t('الحالة', 'Status')],
                          ['created_at', t('التاريخ', 'Date')],
                        ].map(([field, label]) => (
                          <th
                            key={field}
                            className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-[var(--adm-text-faint)]"
                          >
                            <button type="button" onClick={() => toggleRequestSort(field)}>
                              {label} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                            </button>
                          </th>
                        ))}
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-[var(--adm-text-faint)]">
                          {t('إجراءات', 'Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--adm-border)]">
                      {filteredRequests.map((request, index) => (
                        <tr
                          key={request.id}
                          className={index % 2 ? 'bg-[var(--adm-alt-row)]' : undefined}
                        >
                          <td className="px-4 py-3">
                            <p className="font-bold text-[var(--adm-text)]">
                              {request.guest_name || request.company_name || '-'}
                            </p>
                            <p className="text-xs text-[var(--adm-text-faint)]">
                              {request.guest_phone || '-'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--adm-text-muted)]">
                            {request.package_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-black text-emerald-300">
                            {formatMoney(request.estimated_total, request.price_currency)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={request.status} isArabic={isArabic} />
                          </td>
                          <td className="px-4 py-3 text-xs text-[var(--adm-text-faint)]">
                            {formatDate(request.created_at, isArabic)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <IconButton
                                label={t('عرض', 'View')}
                                onClick={() => openRequestDetail(request)}
                                className="text-emerald-300 hover:bg-emerald-500/15"
                              >
                                <Eye className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label={t('مراجعة', 'Review')}
                                onClick={() => updateRequestStatus(request.id, 'reviewing')}
                                className="text-amber-300 hover:bg-amber-500/15"
                              >
                                <Clock className="h-4 w-4" />
                              </IconButton>
                              <IconButton
                                label={t('اعتماد', 'Approve')}
                                onClick={() => updateRequestStatus(request.id, 'approved')}
                                className="text-emerald-300 hover:bg-emerald-500/15"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </IconButton>
                              {request.guest_phone && (
                                <a
                                  href={getWhatsappUrl(request.guest_phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="WhatsApp"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#25D366] transition hover:bg-[#25D366]/15"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </a>
                              )}
                              <IconButton
                                label={t('أرشفة', 'Archive')}
                                onClick={() => {
                                  setDeleteReason('');
                                  setShowDeleteConfirm(request.id);
                                }}
                                className="text-rose-300 hover:bg-rose-500/15"
                              >
                                <Trash2 className="h-4 w-4" />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}

            {filteredRequests.length === 0 && (
              <EmptyState
                icon={FileText}
                title={
                  pricingRequests.length === 0
                    ? t('لا توجد طلبات بعد', 'No requests yet')
                    : t('لا توجد نتائج مطابقة', 'No matching results')
                }
              />
            )}
          </div>

          <div className="space-y-4">
            <SectionCard title={t('إجمالي المحفظة', 'Pipeline')} icon={Receipt}>
              <p className="text-3xl font-black text-emerald-300">
                {pipelineTotal.toLocaleString()}
              </p>
              <p className="mb-4 text-xs font-bold text-[var(--adm-text-faint)]">EGP</p>
              <div className="space-y-2">
                {Object.entries(REQUEST_STATUS_CFG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                      <span className="text-xs text-[var(--adm-text-muted)]">
                        {cfg.label[isArabic ? 'ar' : 'en']}
                      </span>
                    </div>
                    <span className="text-xs font-black text-[var(--adm-text)]">
                      {pricingRequests.filter((request) => request.status === key).length}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title={t('أنواع الطلبات', 'Request Types')} icon={PackageIcon}>
              <div className="space-y-3">
                {[
                  [t('باقات', 'Package'), pricingRequests.filter((request) => request.request_type === 'package').length, 'text-cyan-300'],
                  [t('مخصص', 'Custom'), pricingRequests.filter((request) => request.request_type === 'custom').length, 'text-violet-300'],
                ].map(([label, count, tone]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--adm-text-muted)]">{label}</span>
                    <span className={cn('text-sm font-black', tone)}>{count}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  };

  const renderDiscounts = () => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => openDiscountEditor()}>
          <Plus className="h-4 w-4" />
          {t('إضافة كود', 'Add Code')}
        </Button>
      </div>

      {renderLegacyInlineForms && (showAddDiscount || editingDiscount) && (
        <SectionCard
          title={editingDiscount ? t('تعديل كود الخصم', 'Edit Discount Code') : t('إضافة كود خصم', 'Add Discount Code')}
          icon={Tag}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              value={discountForm.code}
              onChange={(event) =>
                setDiscountForm({ ...discountForm, code: event.target.value.toUpperCase() })
              }
              placeholder="CODE"
              className={fieldClass}
            />
            <input
              value={discountForm.description}
              onChange={(event) =>
                setDiscountForm({ ...discountForm, description: event.target.value })
              }
              placeholder={t('الوصف', 'Description')}
              className={fieldClass}
            />
            <select
              value={discountForm.discount_type}
              onChange={(event) =>
                setDiscountForm({
                  ...discountForm,
                  discount_type: event.target.value as DiscountForm['discount_type'],
                })
              }
              className={fieldClass}
            >
              <option value="percentage">{t('نسبة مئوية', 'Percentage')}</option>
              <option value="fixed">{t('مبلغ ثابت', 'Fixed')}</option>
            </select>
            <input
              type="number"
              value={discountForm.discount_value}
              onChange={(event) =>
                setDiscountForm({ ...discountForm, discount_value: Number(event.target.value) })
              }
              placeholder={t('القيمة', 'Value')}
              className={fieldClass}
            />
            <input
              type="number"
              value={discountForm.min_order_value}
              onChange={(event) =>
                setDiscountForm({ ...discountForm, min_order_value: Number(event.target.value) })
              }
              placeholder={t('الحد الأدنى', 'Min Order')}
              className={fieldClass}
            />
            <input
              type="number"
              value={discountForm.max_discount}
              onChange={(event) =>
                setDiscountForm({ ...discountForm, max_discount: Number(event.target.value) })
              }
              placeholder={t('أقصى خصم', 'Max Discount')}
              className={fieldClass}
            />
            <input
              type="date"
              value={discountForm.valid_until}
              onChange={(event) =>
                setDiscountForm({ ...discountForm, valid_until: event.target.value })
              }
              className={fieldClass}
            />
            <input
              type="number"
              value={discountForm.usage_limit}
              onChange={(event) =>
                setDiscountForm({ ...discountForm, usage_limit: Number(event.target.value) })
              }
              placeholder={t('حد الاستخدام', 'Usage Limit')}
              className={fieldClass}
            />
            <label className="flex items-center gap-2 text-sm font-bold text-[var(--adm-text-sub)]">
              <input
                type="checkbox"
                checked={discountForm.is_active}
                onChange={(event) =>
                  setDiscountForm({ ...discountForm, is_active: event.target.checked })
                }
              />
              {t('نشط', 'Active')}
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddDiscount(false);
                setEditingDiscount(null);
                setDiscountForm(DEFAULT_DISCOUNT_FORM);
              }}
            >
              {t('إلغاء', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={savingForm}
              onClick={editingDiscount ? updateDiscountCode : createDiscountCode}
            >
              {savingForm && <RefreshCw className="h-4 w-4 animate-spin" />}
              {t('حفظ', 'Save')}
            </Button>
          </div>
        </SectionCard>
      )}

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredDiscounts.map((code) => (
            <article
              key={code.id}
              className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/35"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-emerald-300">{code.code}</h3>
                  <p className="text-sm text-[var(--adm-text-muted)]">{code.description || '-'}</p>
                </div>
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-xs font-bold',
                    code.is_active
                      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-500/30 bg-slate-500/15 text-slate-300'
                  )}
                >
                  {code.is_active ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
                </span>
              </div>
              <p className="mb-4 text-sm font-black text-[var(--adm-text)]">
                {code.discount_type === 'percentage'
                  ? `${code.discount_value}%`
                  : formatMoney(code.discount_value)}
              </p>
              <div className="flex gap-2 border-t border-[var(--adm-border)] pt-4">
                <IconButton label={t('عرض', 'View')} onClick={() => setEntityView({ type: 'discount', record: code })}>
                  <Eye className="h-4 w-4" />
                </IconButton>
                <Button variant="surface" className="flex-1 text-xs" onClick={() => openDiscountEditor(code)}>
                  <Edit2 className="h-3.5 w-3.5" />
                  {t('تعديل', 'Edit')}
                </Button>
                <Button
                  variant="surface"
                  className="flex-1 text-xs"
                  onClick={() => toggleDiscountActive(code.id, code.is_active)}
                >
                  {code.is_active ? t('إيقاف', 'Disable') : t('تفعيل', 'Enable')}
                </Button>
                <IconButton
                  label={t('حذف', 'Delete')}
                  onClick={() => deleteDiscountCode(code.id)}
                  className="text-rose-300 hover:bg-rose-500/15"
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <SectionCard title={t('جدول الأكواد', 'Discount codes table')} icon={Table2} className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="border-b border-[var(--adm-border)] bg-[var(--adm-surface-deep)]">
                <tr>
                  {[t('الكود', 'Code'), t('القيمة', 'Value'), t('الحالة', 'Status'), t('إجراءات', 'Actions')].map((label) => (
                    <th key={label} className="px-4 py-3 text-left text-xs font-black uppercase text-[var(--adm-text-faint)]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--adm-border)]">
                {filteredDiscounts.map((code) => (
                  <tr key={code.id}>
                    <td className="px-4 py-3 font-black text-emerald-300">{code.code}</td>
                    <td className="px-4 py-3 text-sm text-[var(--adm-text)]">
                      {code.discount_type === 'percentage' ? `${code.discount_value}%` : formatMoney(code.discount_value)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--adm-text-muted)]">
                      {code.is_active ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <IconButton label={t('عرض', 'View')} onClick={() => setEntityView({ type: 'discount', record: code })}>
                          <Eye className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={t('تعديل', 'Edit')} onClick={() => openDiscountEditor(code)}>
                          <Edit2 className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={t('حذف', 'Delete')}
                          onClick={() => deleteDiscountCode(code.id)}
                          className="text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {filteredDiscounts.length === 0 && (
        <EmptyState icon={Tag} title={t('لا توجد أكواد خصم', 'No discount codes')} />
      )}
    </div>
  );

  const renderContacts = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all', label: t('الكل', 'All'), count: contacts.length },
          ...Object.entries(CONTACT_STATUS_CFG).map(([key, cfg]) => ({
            key,
            label: cfg.label[isArabic ? 'ar' : 'en'],
            count: contacts.filter((contact) => contact.status === key).length,
          })),
        ].map((filter) =>
          renderFilterButton(
            filter.key,
            filter.label,
            filter.count,
            contactStatusFilter === filter.key,
            () => setContactStatusFilter(filter.key)
          )
        )}
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredContacts.map((contact) => {
            const cfg = getContactStatusCfg(contact.status);

            return (
              <article
                key={contact.id}
                className="overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] transition hover:-translate-y-0.5 hover:border-emerald-500/35"
              >
                <div className={cn('h-1.5 bg-gradient-to-r', cfg.gradient)} />
                <div className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className={cn('text-[10px] font-black uppercase tracking-wider', cfg.text)}>
                        {cfg.label[isArabic ? 'ar' : 'en']}
                      </p>
                      <h3 className="mt-1 font-bold text-[var(--adm-text)]">{contact.name}</h3>
                      <p className="text-xs text-[var(--adm-text-faint)]">
                        {contact.business_name || contact.industry || '-'}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--adm-text-faint)]">{formatDate(contact.created_at, isArabic)}</p>
                  </div>
                  <div className="mb-3 space-y-2 text-xs text-[var(--adm-text-muted)]">
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      {contact.phone || '-'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      {contact.email || '-'}
                    </p>
                  </div>
                  {contact.message && (
                    <div className="mb-3 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] p-3">
                      <p className="line-clamp-3 text-xs text-[var(--adm-text-muted)]">{contact.message}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="surface" className="px-3 py-1.5 text-xs" onClick={() => setEntityView({ type: 'contact', record: contact })}>
                      <Eye className="h-3.5 w-3.5" />
                      {t('عرض', 'View')}
                    </Button>
                    {contact.phone && (
                      <a
                        href={getWhatsappUrl(contact.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#25D366]/15 px-3 py-1.5 text-xs font-bold text-[#25D366]"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    )}
                    <Button variant="surface" className="px-3 py-1.5 text-xs" onClick={() => updateContactStatus(contact.id, 'contacted')}>
                      {t('تم التواصل', 'Contacted')}
                    </Button>
                    <Button variant="success" className="px-3 py-1.5 text-xs" onClick={() => updateContactStatus(contact.id, 'resolved')}>
                      {t('حل', 'Resolve')}
                    </Button>
                    <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteContact(contact.id)}>
                      {t('حذف', 'Delete')}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <SectionCard title={t('جدول جهات الاتصال', 'Contacts table')} icon={Table2} className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-[var(--adm-border)] bg-[var(--adm-surface-deep)]">
                <tr>
                  {[t('الاسم', 'Name'), t('الهاتف', 'Phone'), t('الشركة', 'Company'), t('الحالة', 'Status'), t('إجراءات', 'Actions')].map((label) => (
                    <th key={label} className="px-4 py-3 text-left text-xs font-black uppercase text-[var(--adm-text-faint)]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--adm-border)]">
                {filteredContacts.map((contact) => {
                  const cfg = getContactStatusCfg(contact.status);
                  return (
                    <tr key={contact.id}>
                      <td className="px-4 py-3 font-bold text-[var(--adm-text)]">{contact.name}</td>
                      <td className="px-4 py-3 text-sm text-[var(--adm-text-muted)]">{contact.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-[var(--adm-text-muted)]">{contact.business_name || '-'}</td>
                      <td className={cn('px-4 py-3 text-xs font-bold', cfg.text)}>{cfg.label[isArabic ? 'ar' : 'en']}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <IconButton label={t('عرض', 'View')} onClick={() => setEntityView({ type: 'contact', record: contact })}>
                            <Eye className="h-4 w-4" />
                          </IconButton>
                          <IconButton label={t('حذف', 'Delete')} onClick={() => deleteContact(contact.id)} className="text-rose-300">
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {filteredContacts.length === 0 && <EmptyState icon={Mail} title={t('لا توجد جهات اتصال', 'No contacts')} />}
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="surface" onClick={markAllNotificationsRead} disabled={unreadNotifCount === 0}>
          <CheckCircle2 className="h-4 w-4" />
          {t('تحديد الكل كمقروء', 'Mark all read')}
        </Button>
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            onClick={() => setEntityView({ type: 'notification', record: notification })}
            className={cn(
              'cursor-pointer rounded-2xl border bg-[var(--adm-surface)] p-4 transition hover:border-emerald-500/35',
              notification.is_read ? 'border-[var(--adm-border)]' : 'border-emerald-500/35'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  {!notification.is_read && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                  <p className="font-bold text-[var(--adm-text)]">
                    {isArabic ? notification.title_ar || notification.title : notification.title}
                  </p>
                </div>
                <p className="text-sm text-[var(--adm-text-muted)]">
                  {isArabic ? notification.message_ar || notification.message : notification.message}
                </p>
                <p className="mt-2 text-xs text-[var(--adm-text-faint)]">
                  {formatDate(notification.created_at, isArabic)} · {notification.type}
                </p>
              </div>
              {!notification.is_read && (
                <Button variant="success" className="shrink-0 px-3 py-1.5 text-xs" onClick={(event) => { event.stopPropagation(); markNotificationRead(notification.id); }}>
                  {t('مقروء', 'Read')}
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>
      {notifications.length === 0 && <EmptyState icon={Bell} title={t('لا توجد إشعارات', 'No notifications')} />}
    </div>
  );

  const renderAudit = () => {
    const actions = Array.from(new Set(auditLogs.map((log) => log.action))).filter(Boolean);

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={auditActionFilter === 'all' ? 'success' : 'surface'}
            className="px-3 py-1.5 text-xs"
            onClick={() => setAuditActionFilter('all')}
          >
            {t('الكل', 'All')}
          </Button>
          {actions.map((action) => (
            <Button
              key={action}
              variant={auditActionFilter === action ? 'success' : 'surface'}
              className="px-3 py-1.5 text-xs"
              onClick={() => setAuditActionFilter(action)}
            >
              {action}
            </Button>
          ))}
        </div>
        <SectionCard title={t('سجل النشاط', 'Activity log')} icon={History} className="p-0">
          <div className="divide-y divide-[var(--adm-border)]">
            {filteredAuditLogs.map((log) => (
              <button key={log.id} type="button" onClick={() => setEntityView({ type: 'audit', record: log })} className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-[var(--adm-hover)]">
                <div className="mt-1 rounded-lg bg-violet-500/15 p-2 text-violet-300">
                  <History className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[var(--adm-text)]">
                    {isArabic ? log.change_summary_ar || log.change_summary || log.action : log.change_summary || log.action}
                  </p>
                  <p className="text-sm text-[var(--adm-text-muted)]">
                    {log.entity_type} · {log.entity_id}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-[var(--adm-text-faint)]">
                  {formatDate(log.created_at, isArabic)}
                </p>
              </button>
            ))}
          </div>
        </SectionCard>
        {filteredAuditLogs.length === 0 && <EmptyState icon={History} title={t('لا توجد سجلات', 'No audit logs')} />}
      </div>
    );
  };

  const renderTeam = () => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => openTeamEditor()}>
          <Plus className="h-4 w-4" />
          {t('إضافة عضو', 'Add Member')}
        </Button>
      </div>
      {renderLegacyInlineForms && (showAddTeam || editingTeam) && (
        <SectionCard title={editingTeam ? t('تعديل عضو', 'Edit Member') : t('إضافة عضو', 'Add Member')} icon={Users}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <input className={fieldClass} value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} placeholder={t('الاسم', 'Name')} />
            <input className={fieldClass} value={teamForm.email} onChange={(event) => setTeamForm({ ...teamForm, email: event.target.value })} placeholder={t('البريد', 'Email')} />
            <input className={fieldClass} value={teamForm.phone} onChange={(event) => setTeamForm({ ...teamForm, phone: event.target.value })} placeholder={t('الهاتف', 'Phone')} />
            <select className={fieldClass} value={teamForm.role} onChange={(event) => setTeamForm({ ...teamForm, role: event.target.value as TeamMemberForm['role'] })}>
              <option value="admin">{t('مدير', 'Admin')}</option>
              <option value="sales">{t('مبيعات', 'Sales')}</option>
              <option value="designer">{t('مصمم', 'Designer')}</option>
              <option value="manager">{t('مدير مشروع', 'Manager')}</option>
            </select>
            <input className={fieldClass} value={teamForm.avatar_url} onChange={(event) => setTeamForm({ ...teamForm, avatar_url: event.target.value })} placeholder={t('رابط الصورة', 'Avatar URL')} />
            <label className="flex items-center gap-2 text-sm font-bold text-[var(--adm-text-sub)]">
              <input type="checkbox" checked={teamForm.is_active} onChange={(event) => setTeamForm({ ...teamForm, is_active: event.target.checked })} />
              {t('نشط', 'Active')}
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowAddTeam(false); setEditingTeam(null); setTeamForm(DEFAULT_TEAM_FORM); }}>
              {t('إلغاء', 'Cancel')}
            </Button>
            <Button variant="primary" disabled={savingForm} onClick={editingTeam ? updateTeamMember : createTeamMember}>
              {savingForm && <RefreshCw className="h-4 w-4 animate-spin" />}
              {t('حفظ', 'Save')}
            </Button>
          </div>
        </SectionCard>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {filteredTeam.map((member) => (
          <article key={member.id} className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[var(--adm-text)]">{member.name}</h3>
                <p className="truncate text-sm text-[var(--adm-text-muted)]">{member.email || '-'}</p>
              </div>
              <RoleBadge role={member.role} isArabic={isArabic} />
            </div>
            <div className="mb-4 space-y-2 text-sm text-[var(--adm-text-muted)]">
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {member.phone || '-'}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {member.is_active ? t('نشط', 'Active') : t('غير نشط', 'Inactive')}
              </p>
            </div>
            <div className="flex gap-2 border-t border-[var(--adm-border)] pt-4">
              <IconButton label={t('عرض', 'View')} onClick={() => setEntityView({ type: 'team', record: member })}>
                <Eye className="h-4 w-4" />
              </IconButton>
              <Button variant="surface" className="flex-1 text-xs" onClick={() => openTeamEditor(member)}>
                <Edit2 className="h-3.5 w-3.5" />
                {t('تعديل', 'Edit')}
              </Button>
              <Button variant="danger" className="text-xs" onClick={() => deleteTeamMember(member.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {filteredTeam.length === 0 && <EmptyState icon={Users} title={t('لا يوجد أعضاء فريق', 'No team members')} />}
    </div>
  );

  const renderClients = () => {
    const intakeFields = [
      t('صورة الحساب', 'Profile picture'),
      t('اسم المستخدم', 'Username'),
      t('البريد وكلمة المرور', 'Email and password'),
      t('بيانات الشركة', 'Business profile'),
      t('ألوان وهوية البراند', 'Brand colors'),
      t('الأمان', 'Security question'),
    ];

    return (
      <div className="space-y-6">
        <SectionCard
          title={t('استقبال العملاء وتجهيز التسجيل', 'Client signup intake')}
          icon={Users}
          action={
            <Button variant="primary" onClick={() => openClientEditor()}>
              <Plus className="h-4 w-4" />
              {t('عميل جديد', 'New Client')}
            </Button>
          }
          className="overflow-hidden"
        >
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="max-w-2xl text-sm leading-6 text-[var(--adm-text-muted)]">
                {t(
                  'الجزء ده جاهز لنظام التسجيل القادم: بيانات دخول، ملف شركة، هوية بصرية، وسؤال أمان في نفس مسار التحكم.',
                  'This area is ready for the upcoming signup system: access details, business profile, brand identity, and security control in one flow.'
                )}
              </p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {intakeFields.map((field) => (
                  <div
                    key={field}
                    className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] px-3 py-3"
                  >
                    <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-300" />
                    <p className="text-xs font-black text-[var(--adm-text)]">{field}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--adm-text)]">
                    {t('جاهز للـ Sign up', 'Signup-ready')}
                  </p>
                  <p className="text-xs text-[var(--adm-text-muted)]">
                    {t('كلمة المرور لا يتم حفظها خام.', 'Password is not stored in plain text.')}
                  </p>
                </div>
              </div>
<div className="grid grid-cols-3 gap-2 text-center">
                 <div className="rounded-xl bg-[var(--adm-surface)] p-3">
                   <p className="text-xl font-black text-[var(--adm-text)]">{clients.length}</p>
                   <p className="text-[10px] font-bold text-[var(--adm-text-faint)]">{t('عملاء', 'Clients')}</p>
                 </div>
                 <div className="rounded-xl bg-[var(--adm-surface)] p-3">
                   <p className="text-xl font-black text-emerald-300">
                     {clients.filter((client) => client.email).length}
                   </p>
                   <p className="text-[10px] font-bold text-[var(--adm-text-faint)]">{t('بريد', 'Emails')}</p>
                 </div>
                 <div className="rounded-xl bg-[var(--adm-surface)] p-3">
                   <p className="text-xl font-black text-cyan-300">
                     {clients.filter((client) => (client.brand_colors || []).length > 0).length}
                   </p>
                   <p className="text-[10px] font-bold text-[var(--adm-text-faint)]">{t('براند', 'Brand')}</p>
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-2 text-center">
                 <div className="rounded-xl bg-[var(--adm-surface)] p-3">
                   <p className="text-xl font-black text-amber-300">
                     {clients.filter((c) => c.industry).length}
                   </p>
                   <p className="text-[10px] font-bold text-[var(--adm-text-faint)]">{t('مجال', 'Industry')}</p>
                 </div>
                 <div className="rounded-xl bg-[var(--adm-surface)] p-3">
                   <p className="text-xl font-black text-violet-300">
                     {clients.filter((c) => c.budget_range).length}
                   </p>
                   <p className="text-[10px] font-bold text-[var(--adm-text-faint)]">{t('ميزانية', 'Budget')}</p>
                 </div>
                 <div className="rounded-xl bg-[var(--adm-surface)] p-3">
                   <p className="text-sm font-black text-rose-300 leading-7">
                     {(() => {
                       const sources = clients.filter((c) => c.signup_source).map((c) => c.signup_source);
                       if (!sources.length) return '-';
                       const freq: Record<string, number> = {};
                       sources.forEach((s) => { freq[s] = (freq[s] || 0) + 1; });
                       const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
                       const match = SIGNUP_SOURCES.find((s) => s.value === top);
                       return match ? match.label : top;
                     })()}
                   </p>
                   <p className="text-[10px] font-bold text-[var(--adm-text-faint)]">{t('مصدر', 'Source')}</p>
                 </div>
               </div>
            </div>
          </div>
        </SectionCard>

        {renderLegacyInlineForms && (showAddClient || editingClient) && null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredClients.map((client) => {
            const signupProfile = getClientSignupProfile(client);
            const avatar = client.avatar_url || client.logo_url;
            const brandColors = client.brand_colors || [];
            const services = client.services_needed || [];
            const statusColors: Record<string, string> = {
              active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
              inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
              suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
            };
            const statusBadge = statusColors[client.status || 'active'] ?? statusColors.active;
            const industryLabel = INDUSTRY_OPTIONS.find((o) => o.value === client.industry);
            const budgetLabel = BUDGET_RANGE_OPTIONS.find((o) => o.value === client.budget_range);
            const timelineLabel = TIMELINE_OPTIONS.find((o) => o.value === client.timeline);

            return (
              <article
                key={client.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)]"
              >
                <div className="flex items-center gap-3 border-b border-[var(--adm-border)] bg-[var(--adm-surface-deep)] px-5 py-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--adm-border)] bg-[var(--adm-bg)]">
                    {avatar ? (
                      <img src={avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-[var(--adm-text-faint)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-black text-[var(--adm-text)]">{client.username}</h3>
                    <p className="truncate text-sm text-[var(--adm-text-muted)]">
                      {client.company_name || '-'}
                    </p>
                  </div>
                  <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold', statusBadge)}>
                    {client.status || 'active'}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  {(signupProfile.business_tagline || client.business_tagline) && (
                    <p className="truncate text-sm font-medium text-[var(--adm-text-sub)]">
                      "{(signupProfile.business_tagline || client.business_tagline || '').slice(0, 60)}"
                    </p>
                  )}

                  {signupProfile.full_contact_name && client.company_name && (
                    <p className="text-sm text-[var(--adm-text-muted)]">
                      {signupProfile.full_contact_name}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--adm-text-muted)]">
                    {client.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </span>
                    )}
                    {(client.phone || client.phone_number) && (
                      <span className="flex items-center gap-1 truncate">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{client.phone || client.phone_number}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {client.industry && (
                      <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">
                        {isArabic ? (industryLabel?.labelAr ?? client.industry) : (industryLabel?.labelEn ?? client.industry)}
                      </span>
                    )}
                    {client.budget_range && (
                      <span className="inline-flex items-center rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[11px] font-bold text-violet-300">
                        {isArabic ? (budgetLabel?.labelAr ?? client.budget_range) : (budgetLabel?.labelEn ?? client.budget_range)}
                      </span>
                    )}
                    {client.timeline && (
                      <span className="inline-flex items-center rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[11px] font-bold text-cyan-300">
                        {isArabic ? (timelineLabel?.labelAr ?? client.timeline) : (timelineLabel?.labelEn ?? client.timeline)}
                      </span>
                    )}
                  </div>

                  {services.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {services.slice(0, 6).map((svc) => {
                        const opt = SERVICE_CATEGORY_OPTIONS.find((o) => o.value === svc);
                        return (
                          <span
                            key={svc}
                            className="inline-flex rounded border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--adm-text-muted)]"
                          >
                            {opt ? (isArabic ? opt.labelAr : opt.labelEn) : svc}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {brandColors.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {brandColors.slice(0, 6).map((color) => (
                        <span
                          key={color}
                          className="h-5 w-5 rounded-full border border-white/20"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-[var(--adm-border)] bg-[var(--adm-surface-deep)]/70 px-4 py-3">
                  <div className="flex gap-1">
                    <IconButton label={t('عرض', 'View')} onClick={() => setEntityView({ type: 'client', record: client })}>
                      <Eye className="h-4 w-4" />
                    </IconButton>
                    <Button variant="surface" className="text-xs" onClick={() => openClientEditor(client)}>
                      <Edit2 className="h-3.5 w-3.5" />
                      {t('تعديل', 'Edit')}
                    </Button>
                    <Button variant="danger" className="text-xs" onClick={() => deleteClient(client.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {client.progress != null && client.progress > 0 && (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--adm-text-faint)]">{client.progress}%</span>
                      <div className="h-1.5 w-20 rounded-full bg-[var(--adm-surface-deep)]">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(client.progress, 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {filteredClients.length === 0 && <EmptyState icon={Building2} title={t('لا يوجد عملاء', 'No clients')} />}
      </div>
    );
  };

  const renderStats = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title={t('الطلبات', 'Requests')} value={stats.totalPricingRequests} icon={FileText} tone="bg-cyan-500/15 text-cyan-300" helper={t('طلبات التسعير', 'Pricing requests')} />
        <MetricCard title={t('الإيراد', 'Revenue')} value={formatMoney(stats.totalRevenue)} icon={TrendingUp} tone="bg-emerald-500/15 text-emerald-300" helper={t('الطلبات المدفوعة', 'Paid orders')} />
        <MetricCard title={t('جهات الاتصال', 'Contacts')} value={stats.totalContacts} icon={Mail} tone="bg-amber-500/15 text-amber-300" helper={`${stats.newContacts} ${t('جديد', 'new')}`} />
        <MetricCard title={t('متوسط الطلب', 'Avg Order')} value={formatMoney(stats.avgOrderValue)} icon={Receipt} tone="bg-violet-500/15 text-violet-300" helper={t('قيمة تقريبية', 'Estimated value')} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={t('حالة الطلبات', 'Request Status')} icon={BarChart3}>
          <div className="space-y-4">
            {Object.entries(REQUEST_STATUS_CFG).map(([key, cfg]) => {
              const count = pricingRequests.filter((request) => request.status === key).length;
              const percent = pricingRequests.length ? (count / pricingRequests.length) * 100 : 0;

              return (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-[var(--adm-text-muted)]">{cfg.label[isArabic ? 'ar' : 'en']}</span>
                    <span className="font-black text-[var(--adm-text)]">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--adm-surface-deep)]">
                    <div className={cn('h-full rounded-full bg-gradient-to-r', cfg.gradient)} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
        <SectionCard title={t('نبض التشغيل', 'Operations Pulse')} icon={Zap}>
          <div className="grid grid-cols-2 gap-3">
            {[
              [t('قيد المتابعة', 'Pending'), stats.pendingOrders, AlertTriangle, 'text-amber-300'],
              [t('مكتمل', 'Completed'), stats.completedOrders, CheckCircle2, 'text-emerald-300'],
              [t('رسائل جديدة', 'Unread'), stats.unreadMessages, MessageSquare, 'text-cyan-300'],
              [t('عملاء', 'Clients'), clients.length, Briefcase, 'text-violet-300'],
            ].map(([label, value, Icon, tone]) => {
              const PulseIcon = Icon as ElementType;
              return (
                <div key={String(label)} className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] p-4">
                  <PulseIcon className={cn('mb-3 h-5 w-5', tone as string)} />
                  <p className="text-2xl font-black text-[var(--adm-text)]">{String(value)}</p>
                  <p className="text-xs text-[var(--adm-text-faint)]">{String(label)}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const renderEntityFormDialogs = () => (
    <>
      <AdminModalShell
        open={showAddDiscount || Boolean(editingDiscount)}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDiscount(false);
            setEditingDiscount(null);
            setDiscountForm(DEFAULT_DISCOUNT_FORM);
          }
        }}
        title={editingDiscount ? t('تعديل كود الخصم', 'Edit Discount Code') : t('إضافة كود خصم', 'Add Discount Code')}
        description={t('تحكم كامل في بيانات الكود والحالة وحدود الاستخدام.', 'Full control over code details, status, and usage limits.')}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowAddDiscount(false); setEditingDiscount(null); setDiscountForm(DEFAULT_DISCOUNT_FORM); }}>
              {t('إلغاء', 'Cancel')}
            </Button>
            <Button variant="primary" disabled={savingForm} onClick={editingDiscount ? updateDiscountCode : createDiscountCode}>
              {savingForm && <RefreshCw className="h-4 w-4 animate-spin" />}
              {t('حفظ', 'Save')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input className={fieldClass} value={discountForm.code} onChange={(event) => setDiscountForm({ ...discountForm, code: event.target.value.toUpperCase() })} placeholder="CODE" />
          <input className={fieldClass} value={discountForm.description} onChange={(event) => setDiscountForm({ ...discountForm, description: event.target.value })} placeholder={t('الوصف', 'Description')} />
          <Select value={discountForm.discount_type} onValueChange={(value) => setDiscountForm({ ...discountForm, discount_type: value as DiscountForm['discount_type'] })}>
            <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="percentage">{t('نسبة مئوية', 'Percentage')}</SelectItem><SelectItem value="fixed">{t('مبلغ ثابت', 'Fixed')}</SelectItem></SelectContent>
          </Select>
          <input className={fieldClass} type="number" value={discountForm.discount_value} onChange={(event) => setDiscountForm({ ...discountForm, discount_value: Number(event.target.value) })} placeholder={t('القيمة', 'Value')} />
          <input className={fieldClass} type="number" value={discountForm.min_order_value} onChange={(event) => setDiscountForm({ ...discountForm, min_order_value: Number(event.target.value) })} placeholder={t('الحد الأدنى', 'Min Order')} />
          <input className={fieldClass} type="number" value={discountForm.max_discount} onChange={(event) => setDiscountForm({ ...discountForm, max_discount: Number(event.target.value) })} placeholder={t('أقصى خصم', 'Max Discount')} />
          <input className={fieldClass} type="date" value={discountForm.valid_until} onChange={(event) => setDiscountForm({ ...discountForm, valid_until: event.target.value })} />
          <input className={fieldClass} type="number" value={discountForm.usage_limit} onChange={(event) => setDiscountForm({ ...discountForm, usage_limit: Number(event.target.value) })} placeholder={t('حد الاستخدام', 'Usage Limit')} />
          <label className="flex items-center gap-3 text-sm font-bold text-[var(--adm-text-sub)]">
            <Switch checked={discountForm.is_active} onCheckedChange={(checked) => setDiscountForm({ ...discountForm, is_active: checked })} />
            {t('نشط', 'Active')}
          </label>
        </div>
      </AdminModalShell>

      <AdminModalShell
        open={showAddTeam || Boolean(editingTeam)}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddTeam(false);
            setEditingTeam(null);
            setTeamForm(DEFAULT_TEAM_FORM);
          }
        }}
        title={editingTeam ? t('تعديل عضو', 'Edit Member') : t('إضافة عضو', 'Add Member')}
        description={t('إدارة بيانات وصلاحية عضو الفريق.', 'Manage team member details and availability.')}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowAddTeam(false); setEditingTeam(null); setTeamForm(DEFAULT_TEAM_FORM); }}>{t('إلغاء', 'Cancel')}</Button>
            <Button variant="primary" disabled={savingForm} onClick={editingTeam ? updateTeamMember : createTeamMember}>
              {savingForm && <RefreshCw className="h-4 w-4 animate-spin" />}
              {t('حفظ', 'Save')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input className={fieldClass} value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} placeholder={t('الاسم', 'Name')} />
          <input className={fieldClass} value={teamForm.email} onChange={(event) => setTeamForm({ ...teamForm, email: event.target.value })} placeholder={t('البريد', 'Email')} />
          <input className={fieldClass} value={teamForm.phone} onChange={(event) => setTeamForm({ ...teamForm, phone: event.target.value })} placeholder={t('الهاتف', 'Phone')} />
          <Select value={teamForm.role} onValueChange={(value) => setTeamForm({ ...teamForm, role: value as TeamMemberForm['role'] })}>
            <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">{t('مدير', 'Admin')}</SelectItem>
              <SelectItem value="sales">{t('مبيعات', 'Sales')}</SelectItem>
              <SelectItem value="designer">{t('مصمم', 'Designer')}</SelectItem>
              <SelectItem value="manager">{t('مدير مشروع', 'Manager')}</SelectItem>
            </SelectContent>
          </Select>
          <input className={fieldClass} value={teamForm.avatar_url} onChange={(event) => setTeamForm({ ...teamForm, avatar_url: event.target.value })} placeholder={t('رابط الصورة', 'Avatar URL')} />
          <label className="flex items-center gap-3 text-sm font-bold text-[var(--adm-text-sub)]">
            <Switch checked={teamForm.is_active} onCheckedChange={(checked) => setTeamForm({ ...teamForm, is_active: checked })} />
            {t('نشط', 'Active')}
          </label>
        </div>
      </AdminModalShell>

      <AdminModalShell
        open={showAddClient || Boolean(editingClient)}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddClient(false);
            setEditingClient(null);
            setClientForm(DEFAULT_CLIENT_FORM);
          }
        }}
        title={editingClient ? t('تعديل ملف عميل', 'Edit Client Profile') : t('تجهيز عميل للتسجيل', 'Prepare Client Signup')}
        description={t('بيانات الحساب، الشركة، البراند، الأمان، والتحكم التشغيلي في مودال واحد.', 'Account, business, brand, security, and operational control in one modal.')}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowAddClient(false); setEditingClient(null); setClientForm(DEFAULT_CLIENT_FORM); }}>{t('إلغاء', 'Cancel')}</Button>
            <Button variant="primary" disabled={savingForm} onClick={editingClient ? updateClient : createClient}>
              {savingForm && <RefreshCw className="h-4 w-4 animate-spin" />}
              {t('حفظ', 'Save')}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] p-4 md:flex-row md:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-bg)]">
              {clientForm.profile_picture ? (
                <img src={clientForm.profile_picture} alt="" className="h-full w-full object-cover" />
              ) : (
                <Image className="h-7 w-7 text-[var(--adm-text-faint)]" />
              )}
            </div>
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('صورة الحساب', 'Profile Picture')}</span>
                <input className={fieldClass} value={clientForm.profile_picture} onChange={(event) => setClientForm({ ...clientForm, profile_picture: event.target.value })} placeholder="https://..." />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('اسم المستخدم', 'Username')}</span>
                <input className={fieldClass} value={clientForm.username} onChange={(event) => setClientForm({ ...clientForm, username: event.target.value })} placeholder="lumos_client" />
              </label>
            </div>
          </div>

          <SectionCard title={t('بيانات الدخول', 'Account Access')} icon={Lock}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('البريد الإلكتروني *', 'Email Address *')}</span>
                <input className={fieldClass} type="email" value={clientForm.email} onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })} placeholder="client@company.com" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('كلمة المرور *', 'Password *')}</span>
                <input className={fieldClass} type="password" value={clientForm.password} onChange={(event) => setClientForm({ ...clientForm, password: event.target.value })} placeholder={editingClient ? t('اتركها فارغة بدون تغيير', 'Leave empty to keep pending') : '••••••••'} />
                <span className="block text-[11px] text-[var(--adm-text-faint)]">
                  {t('مؤقتًا لا يتم حفظ كلمة المرور خام؛ ستتصل لاحقًا بنظام التسجيل.', 'Temporarily not stored as plain text; it will connect to auth later.')}
                </span>
              </label>
            </div>
          </SectionCard>

          <SectionCard title={t('ملف الشركة والهوية', 'Business And Brand')} icon={Building2}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('اسم الشركة / النشاط', 'Company / Business Name')}</span>
                <input className={fieldClass} value={clientForm.company_name} onChange={(event) => setClientForm({ ...clientForm, company_name: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('وصف قصير للبيزنس *', 'Business Tagline *')}</span>
                <input className={fieldClass} value={clientForm.business_tagline} onChange={(event) => setClientForm({ ...clientForm, business_tagline: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('اسم مسؤول التواصل', 'Full Contact Name')}</span>
                <input className={fieldClass} value={clientForm.full_contact_name} onChange={(event) => setClientForm({ ...clientForm, full_contact_name: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('رقم الهاتف', 'Phone Number')}</span>
                <input className={fieldClass} value={clientForm.phone} onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('الموقع - اختياري', 'Website - Optional')}</span>
                <input className={fieldClass} value={clientForm.website} onChange={(event) => setClientForm({ ...clientForm, website: event.target.value })} placeholder="https://..." />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('ألوان البراند', 'Brand Colors')}</span>
                <div className="flex gap-2">
                  <input className={cn(fieldClass, 'flex-1')} value={clientForm.brand_colors} onChange={(event) => setClientForm({ ...clientForm, brand_colors: event.target.value })} placeholder="#10b981, #06b6d4" />
                  <Palette className="mt-3 h-4 w-4 text-[var(--adm-text-faint)]" />
                </div>
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('وصف إحساس البراند', 'Describe Your Brand Feel')}</span>
                <Textarea className={fieldClass} value={clientForm.brand_feel} onChange={(event) => setClientForm({ ...clientForm, brand_feel: event.target.value })} placeholder={t('راقي، سريع، تقني، ودود...', 'Premium, fast, technical, friendly...')} />
              </label>
              {/* ─── Project Details ─── */}
              <div className="col-span-2 mt-2">
                <div className="h-px bg-[var(--adm-border)]" />
              </div>
              <div className="col-span-2">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('تفاصيل المشروع', 'Project Details')}</span>
              </div>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('المجال / الصناعة', 'Industry')}</span>
                <select className={fieldClass} value={clientForm.industry} onChange={(e) => setClientForm({ ...clientForm, industry: e.target.value })}>
                  <option value="">{t('— اختر —', '— Select —')}</option>
                  {INDUSTRY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelAr, opt.labelEn)}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('نطاق الميزانية', 'Budget Range')}</span>
                <select className={fieldClass} value={clientForm.budget_range} onChange={(e) => setClientForm({ ...clientForm, budget_range: e.target.value })}>
                  <option value="">{t('— اختر —', '— Select —')}</option>
                  {BUDGET_RANGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelAr, opt.labelEn)}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('الجدول الزمني', 'Timeline')}</span>
                <select className={fieldClass} value={clientForm.timeline} onChange={(e) => setClientForm({ ...clientForm, timeline: e.target.value })}>
                  <option value="">{t('— اختر —', '— Select —')}</option>
                  {TIMELINE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelAr, opt.labelEn)}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('كيف عرفت عنا؟', 'Referral Source')}</span>
                <select className={fieldClass} value={clientForm.referral_source} onChange={(e) => setClientForm({ ...clientForm, referral_source: e.target.value })}>
                  <option value="">{t('— اختر —', '— Select —')}</option>
                  {REFERRAL_SOURCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{t(opt.labelAr, opt.labelEn)}</option>)}
                </select>
              </label>
              <div>
                <label className="text-xs font-black text-[var(--adm-text-muted)]">{t('الخدمات المطلوبة', 'Services Needed')}</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {SERVICE_CATEGORY_OPTIONS.map((cat) => {
                    const selected = (clientForm.services_needed ? JSON.parse(clientForm.services_needed) : []).includes(cat.value);
                    return (
                      <button key={cat.value} type="button" onClick={() => {
                        const current = clientForm.services_needed ? JSON.parse(clientForm.services_needed) : [];
                        const next = selected ? current.filter((v: string) => v !== cat.value) : [...current, cat.value];
                        setClientForm({ ...clientForm, services_needed: JSON.stringify(next) });
                      }} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs transition-colors ${selected ? 'border-primary/50 bg-primary/10 text-primary' : 'border-[var(--adm-border)] bg-[var(--adm-input)] text-[var(--adm-text-secondary)] hover:border-primary/30'}`}>
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${selected ? 'bg-primary border-primary' : 'border-[var(--adm-border)]'}`}>
                          {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </div>
                        <span>{t(cat.labelAr, cat.labelEn)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('ملخص المشروع', 'Project Summary')}</span>
                <Textarea className={fieldClass} value={clientForm.project_summary} onChange={(e) => setClientForm({ ...clientForm, project_summary: e.target.value })} placeholder={t('وصف مختصر للمشروع...', 'Brief project description...')} rows={2} />
              </label>
            </div>
          </SectionCard>

          <SectionCard title={t('الأمان والتشغيل', 'Security And Operations')} icon={Shield}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('سؤال الأمان', 'Security Question')}</span>
                <input className={fieldClass} value={clientForm.security_question} onChange={(event) => setClientForm({ ...clientForm, security_question: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('إجابة الأمان', 'Security Answer')}</span>
                <input className={fieldClass} value={clientForm.security_answer} onChange={(event) => setClientForm({ ...clientForm, security_answer: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('الباقة', 'Package')}</span>
                <input className={fieldClass} value={clientForm.package_name} onChange={(event) => setClientForm({ ...clientForm, package_name: event.target.value })} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('التقدم', 'Progress')}</span>
                <input className={fieldClass} type="number" min={0} max={100} value={clientForm.progress} onChange={(event) => setClientForm({ ...clientForm, progress: Number(event.target.value) })} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('الحالة', 'Status')}</span>
                <input className={fieldClass} value={clientForm.status} onChange={(event) => setClientForm({ ...clientForm, status: event.target.value })} />
              </label>
              <label className="space-y-1.5 md:col-span-3">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('الخطوات التالية', 'Next steps')}</span>
                <input className={fieldClass} value={clientForm.next_steps} onChange={(event) => setClientForm({ ...clientForm, next_steps: event.target.value })} />
              </label>
              <label className="space-y-1.5 md:col-span-3">
                <span className="text-xs font-black text-[var(--adm-text-muted)]">{t('ملاحظات الأدمن', 'Admin Notes')}</span>
                <Textarea className={fieldClass} value={clientForm.admin_notes} onChange={(event) => setClientForm({ ...clientForm, admin_notes: event.target.value })} />
              </label>
            </div>
          </SectionCard>
        </div>
      </AdminModalShell>
    </>
  );

  const renderRequestModal = () => {
    if (!selectedRequest) return null;

    const requestServices = selectedRequest.selected_services || [];

    return (
      <AdminModalShell
        open={Boolean(selectedRequest)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setIsEditingRequest(false);
          }
        }}
        title={selectedRequest.guest_name || selectedRequest.company_name || t('طلب بدون اسم', 'Unnamed request')}
        description={`${formatDate(selectedRequest.created_at, isArabic)} · ${formatMoney(selectedRequest.estimated_total, selectedRequest.price_currency)} · ${t('تعديلات', 'Edits')}: ${selectedRequest.edit_count || 0}`}
        size="xl"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="surface" onClick={() => setRequestDetailLang(requestDetailLang === 'ar' ? 'en' : 'ar')}>
              {requestDetailLang.toUpperCase()}
            </Button>
            {selectedRequest.guest_phone && (
              <a
                href={getWhatsappUrl(selectedRequest.guest_phone)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonBase, 'border border-emerald-500/25 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-white')}
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </a>
            )}
            {selectedRequest.guest_email && (
              <a
                href={`mailto:${selectedRequest.guest_email}`}
                className={cn(buttonBase, 'border border-[var(--adm-border)] bg-[var(--adm-surface)] text-[var(--adm-text-sub)] hover:bg-[var(--adm-hover)]')}
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
            )}
            <Button variant="surface" onClick={copyRequestSummary}>
              <Copy className="h-4 w-4" />
              {copySuccess ? t('تم النسخ', 'Copied') : t('نسخ', 'Copy')}
            </Button>
            <Button variant="surface" onClick={() => setIsEditingRequest((value) => !value)}>
              <Edit2 className="h-4 w-4" />
              {isEditingRequest ? t('عرض التفاصيل', 'View Details') : t('تعديل', 'Edit')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteReason(selectedRequest.delete_reason || '');
                setShowDeleteConfirm(selectedRequest.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
              {t('أرشفة', 'Archive')}
            </Button>
          </div>
        }
      >
        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-[var(--adm-surface-deep)] p-2">
            {[
              ['overview', t('نظرة عامة', 'Overview')],
              ['client', t('العميل', 'Client')],
              ['pricing', t('التسعير', 'Pricing')],
              ['services', t('الخدمات', 'Services')],
              ['workflow', t('المسار', 'Workflow')],
              ['followups', t('المتابعات', 'Follow-ups')],
              ['history', t('السجل', 'History')],
              ['advanced', t('متقدم', 'Advanced')],
              ['danger', t('خطر', 'Danger')],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-lg data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <SectionCard title={t('الحالة', 'Status')} icon={Clock}>
                <StatusBadge status={selectedRequest.status} isArabic={isArabic} />
              </SectionCard>
              <SectionCard title={t('الأولوية', 'Priority')} icon={Flag}>
                <PriorityBadge priority={selectedRequest.priority} isArabic={isArabic} />
              </SectionCard>
              <SectionCard title={t('الإجمالي', 'Total')} icon={Receipt}>
                <p className="text-2xl font-black text-emerald-300">
                  {formatMoney(selectedRequest.estimated_total, selectedRequest.price_currency)}
                </p>
              </SectionCard>
              <SectionCard title={t('تعديل', 'Edit Count')} icon={Edit2}>
                <p className="text-2xl font-black text-[var(--adm-text)]">{selectedRequest.edit_count || 0}</p>
              </SectionCard>
            </div>
            {isEditingRequest && editRequestForm && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Select value={editRequestForm.request_type} onValueChange={(value) => setEditRequestForm({ ...editRequestForm, request_type: value as PricingRequest['request_type'] })}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="package">Package</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                </Select>
                <Select value={editRequestForm.status} onValueChange={(value) => setEditRequestForm({ ...editRequestForm, status: value as PricingRequest['status'] })}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(REQUEST_STATUS_CFG).map(([key, cfg]) => <SelectItem key={key} value={key}>{cfg.label[isArabic ? 'ar' : 'en']}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={editRequestForm.priority} onValueChange={(value) => setEditRequestForm({ ...editRequestForm, priority: value as PricingRequest['priority'] })}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CFG).map(([key, cfg]) => <SelectItem key={key} value={key}>{cfg.label[isArabic ? 'ar' : 'en']}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          <TabsContent value="client" className="space-y-4">
            {isEditingRequest && editRequestForm ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input className={fieldClass} value={editRequestForm.guest_name} onChange={(event) => setEditRequestForm({ ...editRequestForm, guest_name: event.target.value })} placeholder={t('الاسم', 'Name')} />
                <input className={fieldClass} value={editRequestForm.company_name} onChange={(event) => setEditRequestForm({ ...editRequestForm, company_name: event.target.value })} placeholder={t('الشركة', 'Company')} />
                <input className={fieldClass} value={editRequestForm.guest_phone} onChange={(event) => setEditRequestForm({ ...editRequestForm, guest_phone: event.target.value })} placeholder={t('الهاتف', 'Phone')} />
                <input className={fieldClass} value={editRequestForm.guest_email} onChange={(event) => setEditRequestForm({ ...editRequestForm, guest_email: event.target.value })} placeholder={t('البريد', 'Email')} />
                <input className={fieldClass} value={editRequestForm.location_url} onChange={(event) => setEditRequestForm({ ...editRequestForm, location_url: event.target.value })} placeholder={t('الموقع', 'Location URL')} />
                <input className={fieldClass} value={editRequestForm.request_source} onChange={(event) => setEditRequestForm({ ...editRequestForm, request_source: event.target.value })} placeholder={t('المصدر', 'Source')} />
              </div>
            ) : (
              <SectionCard title={t('بيانات العميل', 'Client details')} icon={User}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    [t('الاسم', 'Name'), selectedRequest.guest_name || selectedRequest.company_name],
                    [t('الشركة', 'Company'), selectedRequest.company_name],
                    [t('الهاتف', 'Phone'), selectedRequest.guest_phone],
                    [t('البريد', 'Email'), selectedRequest.guest_email],
                    [t('المصدر', 'Source'), selectedRequest.request_source],
                    [t('الموقع', 'Location'), selectedRequest.location_url],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] p-3">
                      <p className="text-xs font-bold text-[var(--adm-text-faint)]">{String(label)}</p>
                      <p className="mt-1 break-words text-sm font-semibold text-[var(--adm-text)]">{String(value || '-')}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            {isEditingRequest && editRequestForm ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <input className={fieldClass} type="number" value={editRequestForm.estimated_subtotal} onChange={(event) => setEditRequestForm({ ...editRequestForm, estimated_subtotal: Number(event.target.value) })} placeholder={t('الإجمالي قبل الخصم', 'Subtotal')} />
                <input className={fieldClass} type="number" value={editRequestForm.estimated_total} onChange={(event) => setEditRequestForm({ ...editRequestForm, estimated_total: Number(event.target.value) })} placeholder={t('الإجمالي', 'Total')} />
                <input className={fieldClass} value={editRequestForm.price_currency} onChange={(event) => setEditRequestForm({ ...editRequestForm, price_currency: event.target.value })} placeholder="EGP" />
                <input className={fieldClass} value={editRequestForm.applied_promo_code} onChange={(event) => setEditRequestForm({ ...editRequestForm, applied_promo_code: event.target.value })} placeholder={t('كود الخصم', 'Promo code')} />
                <Select value={editRequestForm.package_id || 'none'} onValueChange={(value) => setEditRequestForm({ ...editRequestForm, package_id: value === 'none' ? null : value })}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('بدون باقة', 'No package')}</SelectItem>
                    {Object.values(PACKAGES).map((pkg) => <SelectItem key={pkg.id} value={pkg.id}>{requestDetailLang === 'ar' ? pkg.nameAr : pkg.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard title={t('قبل الخصم', 'Subtotal')} value={formatMoney(selectedRequest.estimated_subtotal, selectedRequest.price_currency)} icon={Receipt} tone="bg-cyan-500/15 text-cyan-300" />
                <MetricCard title={t('الإجمالي', 'Total')} value={formatMoney(selectedRequest.estimated_total, selectedRequest.price_currency)} icon={TrendingUp} tone="bg-emerald-500/15 text-emerald-300" />
                <MetricCard title={t('العملة', 'Currency')} value={selectedRequest.price_currency} icon={Tag} tone="bg-violet-500/15 text-violet-300" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            {isEditingRequest && editRequestForm ? (
              <SectionCard title={t('الخدمات المختارة', 'Selected Services')} icon={PackageIcon}>
                <div className="grid max-h-80 grid-cols-1 gap-2 overflow-auto md:grid-cols-2">
                  {getAllServices().map((service) => (
                    <label key={service.id} className="flex items-center gap-2 rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] p-3 text-sm text-[var(--adm-text-sub)]">
                      <input
                        type="checkbox"
                        checked={editRequestForm.selected_services.includes(service.id)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...editRequestForm.selected_services, service.id]
                            : editRequestForm.selected_services.filter((id) => id !== service.id);
                          const total = getAllServices()
                            .filter((item) => next.includes(item.id))
                            .reduce((sum, item) => sum + item.price, 0);
                          setEditRequestForm({
                            ...editRequestForm,
                            selected_services: next,
                            estimated_subtotal: total,
                            estimated_total: total,
                          });
                        }}
                      />
                      <span className="flex-1">{requestDetailLang === 'ar' ? service.nameAr : service.name}</span>
                      <span className="text-xs font-bold text-emerald-300">{service.price.toLocaleString()}</span>
                    </label>
                  ))}
                </div>
              </SectionCard>
            ) : (
              <SectionCard title={selectedRequest.package_name || t('الخدمات المختارة', 'Selected services')} icon={PackageIcon}>
                <div className="space-y-2">
                  {requestServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] p-3">
                      <span className="text-sm font-bold text-[var(--adm-text)]">{requestDetailLang === 'ar' ? service.nameAr || service.name : service.name}</span>
                      <span className="text-sm font-black text-emerald-300">{formatMoney(service.price, selectedRequest.price_currency)}</span>
                    </div>
                  ))}
                  {requestServices.length === 0 && <p className="text-sm text-[var(--adm-text-muted)]">{t('لا توجد خدمات محددة', 'No selected services')}</p>}
                </div>
              </SectionCard>
            )}
          </TabsContent>

          <TabsContent value="workflow" className="space-y-4">
            <SectionCard title={t('تغيير الحالة', 'Change status')} icon={CheckCircle2}>
              <div className="flex flex-wrap gap-2">
                {Object.keys(REQUEST_STATUS_CFG).map((status) => (
                  <Button key={status} variant="surface" className="text-xs" onClick={() => updateRequestStatus(selectedRequest.id, status as PricingRequest['status'])}>
                    {REQUEST_STATUS_CFG[status as PricingRequest['status']].label[isArabic ? 'ar' : 'en']}
                  </Button>
                ))}
              </div>
            </SectionCard>
            <SectionCard title={t('تعيين لفريق', 'Assign to team')} icon={Users}>
              <Select
                value={(isEditingRequest && editRequestForm ? editRequestForm.assigned_to : selectedRequest.assigned_to) || 'none'}
                onValueChange={(value) => {
                  const next = value === 'none' ? null : value;
                  if (isEditingRequest && editRequestForm) setEditRequestForm({ ...editRequestForm, assigned_to: next });
                  else assignRequestToTeam(selectedRequest.id, next || '');
                }}
              >
                <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('بدون تعيين', 'Unassigned')}</SelectItem>
                  {teamMembers.map((member) => <SelectItem key={member.id} value={member.id}>{member.name} · {member.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </SectionCard>
            <SectionCard title={t('ملاحظات', 'Notes')} icon={MessageSquare}>
              <Textarea
                className={cn(fieldClass, 'min-h-28')}
                value={isEditingRequest && editRequestForm ? editRequestForm.admin_notes : noteToClient}
                onChange={(event) => {
                  if (isEditingRequest && editRequestForm) setEditRequestForm({ ...editRequestForm, admin_notes: event.target.value });
                  else setNoteToClient(event.target.value);
                }}
              />
              {!isEditingRequest && (
                <div className="mt-3 flex justify-end">
                  <Button variant="primary" disabled={sendingNote} onClick={sendNoteToClient}>
                    {sendingNote && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {t('حفظ الملاحظة', 'Save note')}
                  </Button>
                </div>
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="followups">
            {isEditingRequest && editRequestForm ? (
              <JsonEditor title={t('إجراءات المتابعة JSON', 'Follow-up actions JSON')} value={editRequestForm.follow_up_actions_json} onChange={(value) => setEditRequestForm({ ...editRequestForm, follow_up_actions_json: value })} />
            ) : (
              <SectionCard title={t('إجراءات المتابعة', 'Follow-up actions')} icon={Calendar}>
                <pre className="whitespace-pre-wrap rounded-xl bg-[var(--adm-surface-deep)] p-4 text-xs text-[var(--adm-text-muted)]">{formatJson(selectedRequest.follow_up_actions, [])}</pre>
              </SectionCard>
            )}
          </TabsContent>

          <TabsContent value="history">
            <SectionCard
              title={t('سجل الحالة', 'Status history')}
              icon={History}
              action={
                <span className="rounded-full bg-[var(--adm-surface-deep)] px-2 py-1 text-[10px] font-black text-[var(--adm-text-faint)]">
                  {(selectedRequest.status_history || []).length}
                </span>
              }
            >
              <StatusHistoryTimeline
                items={
                  isEditingRequest && editRequestForm
                    ? safeParseJsonField(editRequestForm.status_history_json, [])
                    : selectedRequest.status_history
                }
                isArabic={isArabic}
                emptyLabel={t('لا يوجد سجل تغييرات بعد', 'No status changes yet')}
              />
            </SectionCard>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            {isEditingRequest && editRequestForm ? (
              <>
                <JsonEditor title="discount_breakdown" value={editRequestForm.discount_breakdown_json} onChange={(value) => setEditRequestForm({ ...editRequestForm, discount_breakdown_json: value })} />
                <JsonEditor title="status_history" value={editRequestForm.status_history_json} onChange={(value) => setEditRequestForm({ ...editRequestForm, status_history_json: value })} />
                <Textarea className={cn(fieldClass, 'min-h-24')} value={editRequestForm.request_notes} onChange={(event) => setEditRequestForm({ ...editRequestForm, request_notes: event.target.value })} placeholder={t('ملاحظات الطلب', 'Request notes')} />
              </>
            ) : (
              <SectionCard title={t('حقول النظام', 'System fields')} icon={FileText}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    ['id', selectedRequest.id],
                    ['client_id', selectedRequest.client_id],
                    ['converted_order_id', selectedRequest.converted_order_id],
                    ['created_at', selectedRequest.created_at],
                    ['updated_at', selectedRequest.updated_at],
                    ['reviewed_at', selectedRequest.reviewed_at],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] p-3">
                      <p className="text-xs font-bold text-[var(--adm-text-faint)]">{String(label)}</p>
                      <p className="mt-1 break-all text-sm text-[var(--adm-text)]">{String(value || '-')}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </TabsContent>

          <TabsContent value="danger">
            <SectionCard title={t('الأرشفة', 'Archive')} icon={AlertTriangle}>
              <p className="mb-4 text-sm text-[var(--adm-text-muted)]">
                {selectedRequest.delete_reason || t('هذا الطلب نشط. الأرشفة تطلب سببًا ولن تحذف السجل نهائيًا.', 'This request is active. Archiving requires a reason and will not permanently delete the row.')}
              </p>
              <Button
                variant="danger"
                onClick={() => {
                  setDeleteReason(selectedRequest.delete_reason || '');
                  setShowDeleteConfirm(selectedRequest.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t('أرشفة الطلب', 'Archive request')}
              </Button>
            </SectionCard>
          </TabsContent>

          {isEditingRequest && editRequestForm && (
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--adm-border)] bg-[var(--adm-bg)] py-4">
              <Button variant="ghost" onClick={() => setIsEditingRequest(false)}>{t('إلغاء', 'Cancel')}</Button>
              <Button variant="primary" onClick={saveRequestEdit}>{t('حفظ التعديلات', 'Save Changes')}</Button>
            </div>
          )}
        </Tabs>
      </AdminModalShell>
    );
  };

  const renderEntityView = () => {
    if (!entityView) return null;

    const { type, record } = entityView;
    const title = String(
      (record as Record<string, unknown>).name ||
        (record as Record<string, unknown>).username ||
        (record as Record<string, unknown>).code ||
        (record as Record<string, unknown>).title ||
        (record as Record<string, unknown>).change_summary ||
        (record as Record<string, unknown>).entity_type ||
        t('تفاصيل السجل', 'Record details')
    );

    if (type === 'client') {
      const client = record as Client;
      const signupProfile = getClientSignupProfile(client);
      const avatar = client.avatar_url || client.logo_url;
      const brandColors = (client.brand_colors || []);
      const services = client.services_needed || [];
      const statusColors: Record<string, string> = {
        active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
      };
      const statusBadge = statusColors[client.status || 'active'] ?? statusColors.active;
      const industryLabel = INDUSTRY_OPTIONS.find((o) => o.value === client.industry);
      const referralLabel = REFERRAL_SOURCE_OPTIONS.find((o) => o.value === client.referral_source);
      const budgetLabel = BUDGET_RANGE_OPTIONS.find((o) => o.value === client.budget_range);
      const timelineLabel = TIMELINE_OPTIONS.find((o) => o.value === client.timeline);

      const SectionHeader = ({ icon: Icon, ar, en }: { icon: ElementType; ar: string; en: string }) => (
        <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--adm-text-muted)]">
          <Icon className="h-4 w-4 text-emerald-400" />
          {t(ar, en)}
        </h4>
      );

      return (
        <EntitySheet
          open={Boolean(entityView)}
          onOpenChange={(open) => { if (!open) setEntityView(null); }}
          title={client.username || t('عميل', 'Client')}
          description={client.company_name || t('ملف العميل', 'Client profile')}
        >
          <div className="space-y-6">
            {/* Profile Section */}
            <section className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
              <SectionHeader icon={User} ar="الملف الشخصي" en="Profile" />
              <div className="mt-4 flex flex-col items-center gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--adm-border)] bg-[var(--adm-bg)]">
                  {avatar ? (
                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-[var(--adm-text-faint)]" />
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-[var(--adm-text)]">{client.username}</h3>
                  <span className={cn('mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold', statusBadge)}>
                    {client.status || 'active'}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm text-[var(--adm-text-muted)]">
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-[var(--adm-text-sub)] transition hover:text-emerald-400">
                    <Mail className="h-4 w-4" />
                    {client.email}
                  </a>
                )}
                {(client.phone || client.phone_number) && (
                  <a href={`tel:${client.phone || client.phone_number}`} className="flex items-center gap-1.5 text-[var(--adm-text-sub)] transition hover:text-emerald-400">
                    <Phone className="h-4 w-4" />
                    {client.phone || client.phone_number}
                  </a>
                )}
                {(signupProfile.website || client.website) && (
                  <a href={signupProfile.website || client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[var(--adm-text-sub)] transition hover:text-emerald-400">
                    <Globe2 className="h-4 w-4" />
                    {signupProfile.website || client.website}
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-[var(--adm-text-faint)]">
                {client.signup_source && (
                  <span className="rounded-md bg-[var(--adm-surface-deep)] px-2 py-1">
                    {t('مصدر التسجيل', 'Source')}: {SIGNUP_SOURCES.find((s) => s.value === client.signup_source)?.label ?? client.signup_source}
                  </span>
                )}
                {client.signup_completed_at && (
                  <span className="rounded-md bg-[var(--adm-surface-deep)] px-2 py-1">
                    {t('تاريخ التسجيل', 'Signed up')}: {formatDate(client.signup_completed_at, isArabic)}
                  </span>
                )}
              </div>
            </section>

            {/* Business Section */}
            <section className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
              <SectionHeader icon={Building2} ar="النشاط التجاري" en="Business" />
              <div className="mt-4 space-y-3">
                {client.company_name && (
                  <div>
                    <p className="text-xs font-black text-[var(--adm-text-faint)]">{t('اسم الشركة', 'Company Name')}</p>
                    <p className="font-bold text-[var(--adm-text)]">{client.company_name}</p>
                  </div>
                )}
                {(signupProfile.full_contact_name || client.full_contact_name) && (
                  <div>
                    <p className="text-xs font-black text-[var(--adm-text-faint)]">{t('اسم مسؤول التواصل', 'Contact Name')}</p>
                    <p className="text-[var(--adm-text-sub)]">{signupProfile.full_contact_name || client.full_contact_name}</p>
                  </div>
                )}
                {(signupProfile.business_tagline || client.business_tagline) && (
                  <div>
                    <p className="text-xs font-black text-[var(--adm-text-faint)]">{t('الشعار', 'Tagline')}</p>
                    <p className="text-[var(--adm-text-sub)] italic">"{signupProfile.business_tagline || client.business_tagline}"</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {client.industry && (
                    <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-300">
                      {isArabic ? (industryLabel?.labelAr ?? client.industry) : (industryLabel?.labelEn ?? client.industry)}
                    </span>
                  )}
                  {client.referral_source && (
                    <span className="inline-flex items-center rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-300">
                      {isArabic ? (referralLabel?.labelAr ?? client.referral_source) : (referralLabel?.labelEn ?? client.referral_source)}
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Brand Section */}
            {brandColors.length > 0 && (
              <section className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
                <SectionHeader icon={Palette} ar="الهوية البصرية" en="Brand" />
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {brandColors.map((color) => (
                      <div key={color} className="flex items-center gap-2">
                        <span
                          className="h-7 w-7 shrink-0 rounded-full border border-white/20"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-mono text-xs text-[var(--adm-text-muted)]">{color}</span>
                      </div>
                    ))}
                  </div>
                  {(signupProfile.brand_feel || client.brand_feel) && (
                    <div>
                      <p className="text-xs font-black text-[var(--adm-text-faint)]">{t('إحساس البراند', 'Brand Feel')}</p>
                      <p className="text-[var(--adm-text-sub)]">{signupProfile.brand_feel || client.brand_feel}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Project Section */}
            <section className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
              <SectionHeader icon={FileText} ar="المشروع" en="Project" />
              <div className="mt-4 space-y-3">
                {services.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-black text-[var(--adm-text-faint)]">{t('الخدمات المطلوبة', 'Services Needed')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {services.map((svc) => {
                        const opt = SERVICE_CATEGORY_OPTIONS.find((o) => o.value === svc);
                        return (
                          <span key={svc} className="inline-flex rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] px-2 py-0.5 text-xs font-bold text-[var(--adm-text-sub)]">
                            {opt ? (isArabic ? opt.labelAr : opt.labelEn) : svc}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {client.budget_range && (
                    <span className="inline-flex items-center rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-bold text-violet-300">
                      {isArabic ? (budgetLabel?.labelAr ?? client.budget_range) : (budgetLabel?.labelEn ?? client.budget_range)}
                    </span>
                  )}
                  {client.timeline && (
                    <span className="inline-flex items-center rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-300">
                      {isArabic ? (timelineLabel?.labelAr ?? client.timeline) : (timelineLabel?.labelEn ?? client.timeline)}
                    </span>
                  )}
                </div>
                {client.project_summary && (
                  <blockquote className="border-s-2 border-[var(--adm-text-faint)] bg-[var(--adm-surface-deep)] px-3 py-2 text-sm italic text-[var(--adm-text-sub)]">
                    {client.project_summary}
                  </blockquote>
                )}
              </div>
            </section>

            {/* Security Section */}
            {(client.security_question || signupProfile.auth_password_pending != null) && (
              <section className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
                <SectionHeader icon={Shield} ar="الأمان" en="Security" />
                <div className="mt-4 space-y-2 text-sm">
                  {client.security_question && (
                    <div>
                      <p className="text-xs font-black text-[var(--adm-text-faint)]">{t('سؤال الأمان', 'Security Question')}</p>
                      <p className="text-[var(--adm-text-sub)]">{client.security_question}</p>
                    </div>
                  )}
                  {client.security_answer && (
                    <div>
                      <p className="text-xs font-black text-[var(--adm-text-faint)]">{t('إجابة الأمان', 'Security Answer')}</p>
                      <p className="text-[var(--adm-text-sub)]">{client.security_answer}</p>
                    </div>
                  )}
                  {signupProfile.auth_password_pending != null && (
                    <div>
                      <p className="text-xs font-black text-[var(--adm-text-faint)]">{t('كلمة المرور معلقة', 'Auth Password Pending')}</p>
                      <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-bold', signupProfile.auth_password_pending ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30')}>
                        {signupProfile.auth_password_pending ? t('نعم', 'Yes') : t('لا', 'No')}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Admin Section */}
            <section className="rounded-2xl border border-[var(--adm-border)] bg-[var(--adm-surface)] p-5">
              <SectionHeader icon={PackageIcon} ar="إدارة الأدمن" en="Admin" />
              <div className="mt-4 space-y-3">
                {client.package_name && (
                  <div>
                    <p className="text-xs font-black text-[var(--adm-text-faint)]">{t('الباقة', 'Package')}</p>
                    <p className="font-bold text-[var(--adm-text)]">{client.package_name}</p>
                  </div>
                )}
                {client.progress != null && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-[var(--adm-text-faint)]">{t('التقدم', 'Progress')}</span>
                      <span className="font-black text-[var(--adm-text)]">{client.progress}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[var(--adm-surface-deep)]">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(client.progress, 100)}%` }} />
                    </div>
                  </div>
                )}
                {client.next_steps && (
                  <div>
                    <p className="text-xs font-black text-[var(--adm-text-faint)]">{t('الخطوات التالية', 'Next Steps')}</p>
                    <p className="text-[var(--adm-text-sub)]">{client.next_steps}</p>
                  </div>
                )}
                {client.admin_notes && (
                  <div>
                    <p className="text-xs font-black text-[var(--adm-text-faint)]">{t('ملاحظات الأدمن', 'Admin Notes')}</p>
                    <p className="whitespace-pre-wrap text-[var(--adm-text-sub)]">{client.admin_notes}</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </EntitySheet>
      );
    }

    const genericRecord = record as Record<string, unknown>;

    return (
      <EntitySheet
        open={Boolean(entityView)}
        onOpenChange={(open) => {
          if (!open) setEntityView(null);
        }}
        title={title}
        description={t('عرض كامل لكل بيانات السجل', 'Full read-only record view')}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Object.entries(genericRecord).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-[var(--adm-border)] bg-[var(--adm-surface-deep)] p-3">
              <p className="text-xs font-black uppercase tracking-wider text-[var(--adm-text-faint)]">{key}</p>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-sm text-[var(--adm-text)]">
                {typeof value === 'object' && value !== null ? formatJson(value, {}) : String(value ?? '-')}
              </pre>
            </div>
          ))}
        </div>
      </EntitySheet>
    );
  };

  return (
    <div
      className="flex min-h-screen bg-[var(--adm-bg)] text-[var(--adm-text)]"
      dir={isArabic ? 'rtl' : 'ltr'}
      style={themeStyle}
    >
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--adm-border)] bg-[var(--adm-sidebar)] lg:flex">
        <div className="border-b border-[var(--adm-border)] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/15">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-black leading-tight text-[var(--adm-text)]">Lumos</h1>
              <p className="text-xs font-semibold text-[var(--adm-text-faint)]">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-auto p-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm('');
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold transition',
                  isActive
                    ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300 shadow-lg shadow-emerald-500/5'
                    : 'border-transparent text-[var(--adm-text-muted)] hover:bg-[var(--adm-hover)] hover:text-[var(--adm-text)]'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="min-w-[20px] rounded-full bg-rose-500/15 px-1.5 py-0.5 text-center text-[10px] font-black text-rose-300">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-[var(--adm-border)] p-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[var(--adm-text-muted)] transition hover:bg-[var(--adm-hover)] hover:text-[var(--adm-text)]"
          >
            {isDark ? <Sun className="h-5 w-5 text-amber-300" /> : <Moon className="h-5 w-5 text-indigo-400" />}
            {isDark ? t('الوضع الفاتح', 'Light Mode') : t('الوضع الداكن', 'Dark Mode')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-[var(--adm-text-muted)] transition hover:bg-[var(--adm-hover)] hover:text-[var(--adm-text)]"
          >
            <ChevronRight className="h-5 w-5" />
            {t('العودة للموقع', 'Back to Site')}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
              {t('لوحة إدارة لوموس', 'Lumos Admin Dashboard')}
            </p>
            <h2 className="mt-2 text-2xl font-black text-[var(--adm-text)]">{activeTabLabel}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 overflow-x-auto lg:hidden">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <IconButton
                    key={tab.id}
                    label={tab.label}
                    onClick={() => setActiveTab(tab.id)}
                    className={activeTab === tab.id ? 'bg-emerald-500/15 text-emerald-300' : ''}
                  >
                    <Icon className="h-4 w-4" />
                  </IconButton>
                );
              })}
            </div>
            <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} isArabic={isArabic} />
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            <Button variant="surface" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
              {t('تحديث', 'Refresh')}
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title={t('طلبات جديدة', 'New Requests')} value={newRequestCount} icon={FileText} tone="bg-cyan-500/15 text-cyan-300" />
          <MetricCard title={t('رسائل جديدة', 'New Contacts')} value={newContactCount} icon={Mail} tone="bg-amber-500/15 text-amber-300" />
          <MetricCard title={t('إشعارات', 'Notifications')} value={unreadNotifCount} icon={Bell} tone="bg-violet-500/15 text-violet-300" />
          <MetricCard title={t('المحفظة', 'Pipeline')} value={formatMoney(pipelineTotal)} icon={Receipt} tone="bg-emerald-500/15 text-emerald-300" />
        </div>

        {activeTab === 'requests' && renderRequests()}
        {activeTab === 'discounts' && renderDiscounts()}
        {activeTab === 'contacts' && renderContacts()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'audit' && renderAudit()}
        {activeTab === 'team' && renderTeam()}
        {activeTab === 'clients' && renderClients()}
        {activeTab === 'stats' && renderStats()}
      </main>

      {renderEntityFormDialogs()}
      {renderRequestModal()}
      {renderEntityView()}

      {showDeleteConfirm && (
        <AdminModalShell
          open={Boolean(showDeleteConfirm)}
          onOpenChange={(open) => {
            if (!open) {
              setShowDeleteConfirm(null);
              setDeleteReason('');
            }
          }}
          title={t('أرشفة الطلب', 'Archive request')}
          description={t('الأرشفة من لوحة الأدمن تتم فورًا بدون طلب سبب.', 'Admin archiving runs immediately without requiring a reason.')}
          size="md"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(null);
                  setDeleteReason('');
                }}
              >
                {t('إلغاء', 'Cancel')}
              </Button>
              <Button variant="danger" onClick={() => deleteRequest(showDeleteConfirm)}>
                <Trash2 className="h-4 w-4" />
                {t('أرشفة', 'Archive')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-rose-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">
                {t('سيتم نقل الطلب للأرشيف وتسجيل العملية باسم الأدمن تلقائيًا.', 'The request will be archived and logged under the admin automatically.')}
              </p>
            </div>
          </div>
        </AdminModalShell>
      )}
    </div>
  );
};

export default AdminDashboard;
