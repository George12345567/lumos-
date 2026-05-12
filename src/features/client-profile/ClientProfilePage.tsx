import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  FolderOpen,
  Globe2,
  Hash,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Moon,
  Palette,
  Phone,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Type,
  UserCircle,
  UsersRound,
} from 'lucide-react';
import AvatarGenerator, { type AvatarStyle } from '@/components/shared/AvatarGenerator';
import SafeAvatarImage from '@/components/shared/SafeAvatarImage';
import VerifiedClientBadge from '@/components/shared/VerifiedClientBadge';
import LumosLogo from '@/components/shared/LumosLogo';
import EnhancedNavbar from '@/components/layout/EnhancedNavbar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useClient,
  useAuthActions,
  useAuthLoading,
  useIsAuthenticated,
  useIsTeamMember,
  useTeamRole,
  useProfileError,
  useProfileLoading,
} from '@/context/AuthContext';
import { useAppearance } from '@/context/AppearanceContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import {
  BUDGET_RANGE_OPTIONS,
  INDUSTRY_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  SERVICE_CATEGORY_OPTIONS,
  TIMELINE_OPTIONS,
} from '@/lib/constants';
import { isE164, normalizeWebsiteUrl } from '@/lib/validation';
import {
  getIdentityAssetSignedUrl,
  identityAssetTimestamp,
  identityCategoryLabel,
  IDENTITY_ASSET_CATEGORIES,
  isIdentityImage,
  type ClientIdentity,
  type ClientIdentityAsset,
  type IdentityColor,
  type IdentityTypography,
} from '@/services/clientIdentityService';
import { getAssetDownloadUrl, type PortalAsset, type PortalMessage } from '@/services/clientPortalService';
import {
  clientAssetPlacementLabels,
  clientAssetStatusLabel,
  getClientAssetPlacements,
  isReviewAsset,
} from '@/services/clientAssetPlacement';
import { profileService, type ProfileData } from '@/services/profileService';
import type { Order } from '@/services/orderService';
import {
  getProjectAssetSignedUrl,
  type Project,
  type ProjectDeliverable,
  type ProjectService,
  type ProjectServiceStatus,
} from '@/services/projectService';
import type { Notification } from '@/types/dashboard';
import { TelegramNotificationSettings } from '@/components/notifications/TelegramNotificationSettings';
import { useClientProfile } from './hooks/useClientProfile';
import { useClientIdentity } from './hooks/useClientIdentity';
import { useNotifications } from './hooks/useNotifications';
import { useOrders } from './hooks/useOrders';
import { useClientProjects } from './hooks/useClientProjects';
import { useClientPricingRequests } from './hooks/useClientPricingRequests';
import { useClientNotes } from './hooks/useClientNotes';
import { fetchClientHeroNotes, type ClientNote as HeroNote } from '@/services/clientNotesService';
import { usePortalData } from './hooks/usePortalData';
import { useProfileMutation } from './hooks/useProfileMutation';
import type { PricingRequest } from '@/types/dashboard';
import { DEFAULT_ACCENT, TAB_ALIASES } from './constants';
import { RequestStatusTimeline } from '@/components/requests/RequestStatusTimeline';
import type { ClientNote } from '@/services/clientNotesService';
import { HeroNoteBanner } from './components/HeroNoteBanner';

type ProfileTab = 'overview' | 'projects' | 'messages' | 'files' | 'identity' | 'account';

type EditableProfilePatch = Partial<ProfileData> & { phone?: string };

type ActivityItem = {
  id: string;
  label: string;
  detail?: string;
  createdAt?: string;
  icon: 'message' | 'file' | 'project' | 'notification';
};

type ProfileDraft = {
  display_name: string;
  tagline: string;
  phone_number: string;
  company_name: string;
  industry: string;
  website: string;
  location: string;
  bio: string;
  brand_feel: string;
  timezone: string;
  profile_visibility: string;
  theme_accent: string;
  brand_colors: string[];
  social_links: Record<string, string>;
};

const PROFILE_NAV: Array<{ id: ProfileTab; label: string; labelAr: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Home', labelAr: 'الرئيسية', icon: LayoutDashboard },
  { id: 'projects', label: 'Project Hub', labelAr: 'مركز المشروع', icon: FolderOpen },
  { id: 'identity', label: 'Brand Kit', labelAr: 'حزمة الهوية', icon: Palette },
  { id: 'files', label: 'Files Library', labelAr: 'مكتبة الملفات', icon: Archive },
  { id: 'messages', label: 'Messages', labelAr: 'الرسائل', icon: MessageSquare },
  { id: 'account', label: 'Settings', labelAr: 'الإعدادات', icon: Settings },
];

const SOCIAL_FIELDS = ['instagram', 'linkedin', 'behance', 'dribbble', 'twitter', 'github', 'facebook'] as const;

const SECTION_COPY: Record<Exclude<ProfileTab, 'overview'>, { title: string; titleAr: string; description: string; descriptionAr: string }> = {
  projects: {
    title: 'Project Hub',
    titleAr: 'مركز المشروع',
    description: 'Track progress, approvals, services, and project files.',
    descriptionAr: 'تابع التقدم والموافقات والخدمات وملفات المشروع.',
  },
  messages: {
    title: 'Messages',
    titleAr: 'الرسائل',
    description: 'Continue your conversation with the Lumos team.',
    descriptionAr: 'تابع محادثتك مع فريق لوموس.',
  },
  files: {
    title: 'Files Library',
    titleAr: 'مكتبة الملفات',
    description: 'All your client-visible downloads in one organized archive.',
    descriptionAr: 'كل ملفاتك القابلة للتحميل في أرشيف منظم واحد.',
  },
  identity: {
    title: 'Brand Kit',
    titleAr: 'حزمة الهوية',
    description: 'Final approved brand assets published by Lumos.',
    descriptionAr: 'أصول الهوية النهائية المعتمدة والمنشورة من لوموس.',
  },
  account: {
    title: 'Settings',
    titleAr: 'الإعدادات',
    description: 'Manage account details and Telegram notifications.',
    descriptionAr: 'أدر بيانات الحساب وإشعارات تيليجرام.',
  },
};

function cleanText(value?: string | null) {
  return (value ?? '').trim();
}

function normalizeProfileTab(value?: string | null): ProfileTab | null {
  const key = cleanText(value).toLowerCase();
  if (!key) return null;
  if (PROFILE_NAV.some((item) => item.id === key)) return key as ProfileTab;
  return TAB_ALIASES[key] ?? null;
}

function getStoredProfileTab(): ProfileTab | null {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeProfileTab(window.localStorage.getItem('lumos:lastClientProfileTab'));
  } catch {
    return null;
  }
}

function formatDate(value?: string | null, fallback = '—') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? 'L').concat(parts[1]?.[0] ?? '').toUpperCase();
}

function getDisplayName(profile: ProfileData, client: ReturnType<typeof useClient>) {
  return (
    cleanText(profile.display_name) ||
    cleanText(client?.full_contact_name) ||
    cleanText(client?.company_name) ||
    cleanText(client?.username) ||
    'Lumos Client'
  );
}

function getClientPhone(profile: ProfileData, client: ReturnType<typeof useClient>) {
  return cleanText(profile.phone_number) || cleanText(profile.phone) || cleanText(client?.phone_number) || cleanText(client?.phone);
}

function getClientCompany(profile: ProfileData, client: ReturnType<typeof useClient>) {
  return cleanText(profile.company_name) || cleanText(client?.company_name);
}

function getClientWebsite(profile: ProfileData, client: ReturnType<typeof useClient>) {
  return cleanText(profile.website) || cleanText(client?.website);
}

function getClientIndustry(profile: ProfileData, client: ReturnType<typeof useClient>) {
  return cleanText(profile.industry) || cleanText(client?.industry);
}

function getClientTagline(profile: ProfileData, client: ReturnType<typeof useClient>) {
  return cleanText(profile.tagline) || cleanText(client?.business_tagline);
}

function getSignupProfileSource(profile: ProfileData, client: ReturnType<typeof useClient>): Record<string, unknown> {
  const details = profile.package_details ?? client?.package_details;
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};
  const signupProfile = (details as Record<string, unknown>).signup_profile;
  return signupProfile && typeof signupProfile === 'object' && !Array.isArray(signupProfile)
    ? signupProfile as Record<string, unknown>
    : details as Record<string, unknown>;
}

function getSignupString(
  profile: ProfileData,
  client: ReturnType<typeof useClient>,
  field: 'budget_range' | 'timeline' | 'referral_source' | 'project_summary' | 'brand_feel',
) {
  const direct = profile[field] ?? client?.[field];
  return cleanText(typeof direct === 'string' ? direct : undefined)
    || cleanText(getSignupProfileSource(profile, client)[field] as string | undefined);
}

function getClientServices(profile: ProfileData, client: ReturnType<typeof useClient>) {
  const source = profile.services_needed ?? client?.services_needed ?? getSignupProfileSource(profile, client).services_needed;
  if (!Array.isArray(source)) return [];
  return source.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

function labelFromOptions(
  value: string,
  options: readonly { value: string; labelAr: string; labelEn: string }[],
  isArabic: boolean,
) {
  const option = options.find((item) => item.value === value);
  return option ? (isArabic ? option.labelAr : option.labelEn) : value;
}

function formatServicesNeeded(services: string[], isArabic: boolean) {
  return services.map((service) => labelFromOptions(service, SERVICE_CATEGORY_OPTIONS, isArabic));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeColor(value: string) {
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed.slice(1).split('').map((char) => `${char}${char}`).join('')}`.toUpperCase();
  }
  return trimmed;
}

function getIdentityColors(identity: ClientIdentity | null, profile: ProfileData): IdentityColor[] {
  if (Array.isArray(identity?.color_palette) && identity.color_palette.length > 0) {
    return identity.color_palette
      .map((color) => ({
        label: cleanText(color.label) || cleanText(color.usage) || 'Brand color',
        hex: normalizeColor(cleanText(color.hex)),
        usage: cleanText(color.usage) || 'Brand',
      }))
      .filter((color) => Boolean(color.hex));
  }

  return (profile.brand_colors ?? [])
    .map((hex, index) => ({
      label: ['Primary', 'Secondary', 'Accent'][index] ?? `Color ${index + 1}`,
      hex: normalizeColor(hex),
      usage: ['Primary', 'Accent', 'Brand'][index] ?? 'Brand',
    }))
    .filter((color) => Boolean(color.hex));
}

function getIdentityTypography(identity: ClientIdentity | null): Array<{ label: string; value: string; notes?: string }> {
  const typography = identity?.typography;
  if (!typography || !isRecord(typography)) return [];

  const fields: Array<{ key: keyof IdentityTypography; label: string }> = [
    { key: 'primary', label: 'Primary Font' },
    { key: 'secondary', label: 'Secondary Font' },
    { key: 'heading', label: 'Heading Font' },
    { key: 'body', label: 'Body Font' },
  ];

  const notes = cleanText(typeof typography.usage_notes === 'string' ? typography.usage_notes : undefined);

  return fields
    .map(({ key, label }) => {
      const value = typography[key];
      return {
        label,
        value: typeof value === 'string' ? cleanText(value) : '',
        notes,
      };
    })
    .filter((item) => Boolean(item.value));
}

function getIdentitySocialLinks(identity: ClientIdentity | null, profile: ProfileData) {
  const source = isRecord(identity?.social_links) && Object.keys(identity.social_links).length > 0
    ? identity.social_links
    : profile.social_links ?? {};

  return Object.entries(source)
    .filter(([, value]) => typeof value === 'string' && Boolean(value.trim()))
    .map(([label, value]) => ({ label, value: String(value) }));
}

function getLogoAsset(assets: ClientIdentityAsset[], category: string) {
  return assets.find((asset) => asset.identity_category === category) ?? null;
}

function getIdentityAssetsByCategory(assets: ClientIdentityAsset[], categories: string[]) {
  const set = new Set(categories);
  return assets.filter((asset) => set.has(cleanText(asset.identity_category)));
}

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getProjectDelivery(order: Order) {
  const source = order as Order & Record<string, string | undefined>;
  return source.estimated_delivery || source.delivery_date || source.due_date || '';
}

function getProjectProgress(order: Order) {
  const source = order as Order & Record<string, number | undefined>;
  if (typeof source.progress === 'number') return Math.max(0, Math.min(100, source.progress));

  const status = (order.status ?? '').toLowerCase();
  if (status === 'completed') return 100;
  return 0;
}

function getProjectTitle(order: Order) {
  return cleanText(order.order_type) || cleanText(order.package_name) || 'Lumos project';
}

function getReadableStatus(status?: string | null) {
  if (!status) return 'Pending';
  return status
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const CLIENT_PROJECT_STATUS: Record<Project['status'], { en: string; ar: string; className: string }> = {
  active: { en: 'Active', ar: 'نشط', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' },
  paused: { en: 'Paused', ar: 'متوقف', className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' },
  completed: { en: 'Completed', ar: 'مكتمل', className: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200' },
  cancelled: { en: 'Cancelled', ar: 'ملغي', className: 'bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-200' },
};

const CLIENT_SERVICE_STATUS: Record<ProjectServiceStatus, { en: string; ar: string; className: string }> = {
  not_started: { en: 'Not started', ar: 'لم يبدأ', className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200' },
  in_progress: { en: 'In progress', ar: 'قيد التنفيذ', className: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200' },
  review: { en: 'Under review', ar: 'قيد المراجعة', className: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200' },
  changes_requested: { en: 'Changes requested', ar: 'تعديلات مطلوبة', className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' },
  completed: { en: 'Completed', ar: 'مكتمل', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' },
  delivered: { en: 'Delivered', ar: 'مسلّم', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' },
};

function localizedStatus(
  status: ProjectServiceStatus,
  isArabic: boolean,
) {
  const config = CLIENT_SERVICE_STATUS[status] ?? CLIENT_SERVICE_STATUS.not_started;
  return isArabic ? config.ar : config.en;
}

function getProjectDisplayName(project: Project) {
  return cleanText(project.project_name) || cleanText(project.package_name) || 'Lumos project';
}

function getActiveProjectService(project: Project): ProjectService | null {
  return project.services.find((service) => ['in_progress', 'review', 'changes_requested'].includes(service.status))
    ?? project.services.find((service) => !['completed', 'delivered'].includes(service.status))
    ?? project.services[0]
    ?? null;
}

function getProjectNextStep(project: Project, isArabic: boolean) {
  const activeService = getActiveProjectService(project);

  if (!activeService) {
    return project.client_notes || (isArabic ? 'سيضيف فريق لوموس الخدمات قريباً.' : 'Lumos will add project services soon.');
  }

  if (activeService.status === 'changes_requested') {
    return isArabic ? 'راجِع ملاحظات التعديلات مع فريق لوموس.' : 'Review requested changes with the Lumos team.';
  }

  if (activeService.status === 'review') {
    return isArabic ? 'هذه الخدمة قيد المراجعة النهائية.' : 'This service is in final review.';
  }

  if (activeService.status === 'delivered') {
    const next = project.services.find((service) => !['completed', 'delivered'].includes(service.status));
    return next
      ? (isArabic ? `الخطوة التالية: ${next.service_name}` : `Next up: ${next.service_name}`)
      : (isArabic ? 'كل التسليمات جاهزة للتحميل.' : 'All deliverables are ready to download.');
  }

  if (activeService.status === 'not_started') {
    return isArabic ? `نستعد لبدء ${activeService.service_name}.` : `Preparing to start ${activeService.service_name}.`;
  }

  return isArabic ? `نعمل الآن على ${activeService.service_name}.` : `We are working on ${activeService.service_name}.`;
}

function getProjectDeliverables(project: Project) {
  const byId = new Map<string, ProjectDeliverable>();

  project.deliverables.forEach((asset) => {
    byId.set(asset.id, asset);
  });

  project.services.forEach((service) => {
    service.deliverables?.forEach((asset) => {
      byId.set(asset.id, asset);
    });
  });

  return Array.from(byId.values()).sort((a, b) => {
    const ad = a.created_at || a.uploaded_at || '';
    const bd = b.created_at || b.uploaded_at || '';
    return bd.localeCompare(ad);
  });
}

function getFileName(asset: PortalAsset) {
  return cleanText(asset.file_name) || cleanText(asset.name) || cleanText(asset.asset_url?.split('/').pop()) || cleanText(asset.file_url?.split('/').pop()) || 'Shared file';
}

function getFileType(asset: PortalAsset) {
  const explicit = cleanText(asset.file_type) || cleanText(asset.asset_type);
  if (explicit) return explicit.toUpperCase();

  const extension = getFileName(asset).split('.').pop();
  return extension && extension !== getFileName(asset) ? extension.toUpperCase() : 'FILE';
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return 'Size unavailable';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getActivityItems(
  projects: Project[],
  messages: PortalMessage[],
  assets: PortalAsset[],
  notifications: Notification[],
): ActivityItem[] {
  const fromProjects = projects.slice(0, 4).map((project) => ({
    id: `project-${project.id}`,
    label: `Project ${getReadableStatus(project.status).toLowerCase()}`,
    detail: getProjectDisplayName(project),
    createdAt: project.updated_at || project.created_at,
    icon: 'project' as const,
  }));

  const fromMessages = messages.slice(-4).map((message) => ({
    id: `message-${message.id}`,
    label: message.sender === 'client' ? 'Message sent' : 'Message from Lumos',
    detail: message.message,
    createdAt: message.created_at,
    icon: 'message' as const,
  }));

  const fromAssets = assets.slice(0, 4).map((asset) => ({
    id: `file-${asset.id}`,
    label: 'File shared',
    detail: getFileName(asset),
    createdAt: asset.uploaded_at || asset.created_at,
    icon: 'file' as const,
  }));

  const fromNotifications = notifications.slice(0, 4).map((notification) => ({
    id: `notification-${notification.id}`,
    label: notification.title || 'Notification',
    detail: notification.message,
    createdAt: notification.created_at,
    icon: 'notification' as const,
  }));

  return [...fromNotifications, ...fromMessages, ...fromAssets, ...fromProjects]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 5);
}

function buildDraft(profile: ProfileData, client: ReturnType<typeof useClient>): ProfileDraft {
  const brandColors = [...(profile.brand_colors ?? client?.brand_colors ?? [])].slice(0, 3);
  while (brandColors.length < 3) brandColors.push('');

  return {
    display_name: cleanText(profile.display_name) || cleanText(client?.full_contact_name),
    tagline: getClientTagline(profile, client),
    phone_number: getClientPhone(profile, client),
    company_name: getClientCompany(profile, client),
    industry: getClientIndustry(profile, client),
    website: getClientWebsite(profile, client),
    location: cleanText(profile.location),
    bio: cleanText(profile.bio),
    brand_feel: getSignupString(profile, client, 'brand_feel'),
    timezone: cleanText(profile.timezone),
    profile_visibility: cleanText(profile.profile_visibility) || 'private',
    theme_accent: cleanText(profile.theme_accent) || cleanText(client?.theme_accent) || DEFAULT_ACCENT,
    brand_colors: brandColors,
    social_links: { ...(profile.social_links ?? {}) },
  };
}

function createProfilePatch(draft: ProfileDraft): { patch: EditableProfilePatch | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const phone = draft.phone_number.trim();
  const normalizedWebsite = normalizeWebsiteUrl(draft.website);
  const socialLinks: Record<string, string> = {};

  if (!draft.display_name.trim()) {
    errors.display_name = 'Display name is required.';
  }

  if (draft.tagline.trim().length > 120) {
    errors.tagline = 'Tagline must be 120 characters or fewer.';
  }

  if (draft.bio.trim().length > 500) {
    errors.bio = 'Bio must be 500 characters or fewer.';
  }

  if (draft.brand_feel.trim().length > 500) {
    errors.brand_feel = 'Brand feel must be 500 characters or fewer.';
  }

  if (phone && !isE164(phone)) {
    errors.phone_number = 'Use E.164 format, for example +201001234567.';
  }

  if (normalizedWebsite === null) {
    errors.website = 'Use a valid HTTPS website URL.';
  }

  SOCIAL_FIELDS.forEach((field) => {
    const value = draft.social_links[field]?.trim();
    if (!value) return;

    const normalized = normalizeWebsiteUrl(value);
    if (normalized === null) {
      errors[`social_${field}`] = 'Use valid HTTPS profile links.';
    } else {
      socialLinks[field] = normalized;
    }
  });

  if (Object.keys(errors).length > 0) return { patch: null, errors };

  const brandColors = draft.brand_colors
    .map((color) => color.trim())
    .filter(Boolean)
    .slice(0, 3);

  return {
    patch: {
      display_name: draft.display_name.trim(),
      tagline: draft.tagline.trim(),
      phone_number: phone,
      phone,
      company_name: draft.company_name.trim(),
      industry: draft.industry.trim(),
      website: normalizedWebsite || '',
      location: draft.location.trim(),
      bio: draft.bio.trim(),
      brand_feel: draft.brand_feel.trim(),
      timezone: draft.timezone.trim(),
      profile_visibility: draft.profile_visibility || 'private',
      theme_accent: draft.theme_accent || DEFAULT_ACCENT,
      brand_colors: brandColors,
      social_links: socialLinks,
    },
    errors: {},
  };
}

export default function ClientProfilePage() {
  const client = useClient();
  const { logout, refreshProfile } = useAuthActions();
  const authLoading = useAuthLoading();
  const isAuthenticated = useIsAuthenticated();
  const profileError = useProfileError();
  const profileLoading = useProfileLoading();
  const isTeamMember = useIsTeamMember();
  const teamRole = useTeamRole();
  const { isArabic } = useLanguage();
  const { theme, toggleTheme } = useAppearance();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { profile, setField, loading, error, reload } = useClientProfile();
  const { state: saveState, saveNow } = useProfileMutation();
  const {
    messages,
    assets,
    loading: portalLoading,
    error: portalError,
    reload: reloadPortal,
    sendMessage,
  } = usePortalData(client?.id);
  const {
    identity,
    assets: identityAssets,
    loading: identityLoading,
    error: identityError,
    reload: reloadIdentity,
  } = useClientIdentity(client?.id);
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useClientProjects(client?.id);
  const {
    requests: clientRequests,
    loading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useClientPricingRequests(client?.id);
  const {
    notes: clientNotes,
    loading: notesLoading,
    error: notesError,
    markRead: markClientNoteRead,
  } = useClientNotes(client?.id);
  const { notifications } = useNotifications(client?.id);
  const [heroNotes, setHeroNotes] = useState<HeroNote[]>([]);

  useEffect(() => {
    if (!client?.id) return;
    let cancelled = false;
    void fetchClientHeroNotes(client.id).then((notes) => {
      if (!cancelled) setHeroNotes(notes);
    });
    return () => { cancelled = true; };
  }, [client?.id]);

  const [activeTab, setActiveTab] = useState<ProfileTab>(() => (
    normalizeProfileTab(searchParams.get('tab')) ?? getStoredProfileTab() ?? 'overview'
  ));
  const tab = activeTab;
  const [editorOpen, setEditorOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentStartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) navigate('/client-login', { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const urlTab = normalizeProfileTab(searchParams.get('tab'));

    if (urlTab) {
      setActiveTab((current) => (current === urlTab ? current : urlTab));
      try { window.localStorage.setItem('lumos:lastClientProfileTab', urlTab); } catch { /* ignore */ }
      return;
    }

    const storedTab = getStoredProfileTab();
    if (storedTab && storedTab !== 'overview') {
      setActiveTab((current) => (current === storedTab ? current : storedTab));
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('tab', storedTab);
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    const avatarPath = profile?.avatar_url || client?.avatar_url;

    void profileService.getAvatarUrl(avatarPath).then((url) => {
      if (!cancelled) setAvatarUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [profile?.avatar_url, client?.avatar_url]);

  useEffect(() => {
    let cancelled = false;
    const coverPath = profile?.cover_url;

    if (!coverPath) {
      setCoverUrl(null);
      return () => {
        cancelled = true;
      };
    }

    void profileService.getAvatarUrl(coverPath).then((url) => {
      if (!cancelled) setCoverUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [profile?.cover_url]);

  const handleSignOut = useCallback(async () => {
    await logout();
    navigate('/client-login', { replace: true });
  }, [logout, navigate]);

  const handleTabChange = useCallback(
    (nextTab: ProfileTab) => {
      setActiveTab(nextTab);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (nextTab === 'overview') {
          next.delete('tab');
        } else {
          next.set('tab', nextTab);
        }
        return next;
      }, { replace: true });

      try { window.localStorage.setItem('lumos:lastClientProfileTab', nextTab); } catch { /* ignore */ }
    },
    [setSearchParams],
  );

  const applyLocalPatch = useCallback(
    (patch: EditableProfilePatch) => {
      Object.entries(patch).forEach(([key, value]) => {
        setField(key as keyof ProfileData, value as ProfileData[keyof ProfileData]);
      });
    },
    [setField],
  );

  const saveProfilePatch = useCallback(
    async (patch: EditableProfilePatch) => {
      const success = await saveNow(patch);
      if (success) {
        applyLocalPatch(patch);
      }
      return success;
    },
    [applyLocalPatch, saveNow],
  );

  const handleAvatarChange = useCallback(
    async (file: File | undefined) => {
      if (!file || !client) return;

      setAvatarError(null);

      if (!file.type.startsWith('image/')) {
        setAvatarError('Please choose an image file.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setAvatarError('Avatar image must be 5MB or smaller.');
        return;
      }

      setAvatarUploading(true);
      try {
        const uploaded = await profileService.uploadAvatar(file, client.id);
        if (!uploaded) {
          setAvatarError('Avatar upload failed. Please try again.');
          return;
        }

        const success = await saveProfilePatch({ avatar_url: uploaded.path });
        if (!success) {
          setAvatarError('Avatar uploaded but could not be saved to your profile.');
          return;
        }

        setAvatarUrl(uploaded.url);
      } finally {
        setAvatarUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [client, saveProfilePatch],
  );

  const handleApproveAsset = useCallback(
    async (assetId: string) => {
      if (!client) return;
      try {
        const { data, error } = await supabase.rpc('client_approve_deliverable', { p_asset_id: assetId });
        if (error) throw error;
        if (data && !data.ok) throw new Error(data.error || 'approval_failed');
        await Promise.all([reloadPortal(), reloadIdentity(), refetchProjects()]);
        toast.success(isArabic ? 'تم اعتماد الملف' : 'File approved');
      } catch (error) {
        console.error('[ClientProfilePage.handleApproveAsset]', {
          error,
          assetId,
        });
        toast.error(isArabic ? 'تعذر اعتماد الملف' : 'Could not approve the file');
      }
    },
    [client, isArabic, reloadPortal, reloadIdentity, refetchProjects],
  );

  const handleRequestChanges = useCallback(
    async (assetId: string, message?: string) => {
      if (!client) return;
      try {
        const { data, error } = await supabase.rpc('client_request_deliverable_changes', {
          p_asset_id: assetId,
          p_message: message?.trim() || null,
        });
        if (error) throw error;
        if (data && !data.ok) throw new Error(data.error || 'changes_request_failed');
        await Promise.all([reloadPortal(), refetchProjects()]);
        toast.success(isArabic ? 'تم إرسال طلب التعديلات' : 'Change request sent');
      } catch (error) {
        console.error('[ClientProfilePage.handleRequestChanges]', {
          error,
          assetId,
        });
        toast.error(isArabic ? 'تعذر طلب التعديلات' : 'Could not request changes');
      }
    },
    [client, isArabic, reloadPortal, refetchProjects],
  );

  const loadingProfile =
    authLoading ||
    (profileLoading && !client) ||
    (isAuthenticated && !client && !profileError) ||
    (isAuthenticated && Boolean(client) && !profile && loading);

  if (loadingProfile) {
    return <ProfilePageSkeleton isArabic={isArabic} />;
  }

  if (isAuthenticated && (!client || !profile)) {
    return (
      <div className="min-h-screen bg-background text-foreground" dir={isArabic ? 'rtl' : 'ltr'}>
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
          <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {isArabic ? 'تعذّر تحميل ملفك الشخصي' : 'We couldn’t load your profile'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {profileError || error
                ? isArabic
                  ? 'حدث خطأ أثناء جلب البيانات. أعد المحاولة، أو تواصل مع الدعم إذا استمرت المشكلة.'
                  : 'Something went wrong fetching your data. Try again, or contact support if it keeps happening.'
                : isArabic
                  ? 'لم نعثر على ملف عميل لحسابك بعد.'
                  : 'No client profile is linked to your account yet.'}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  void refreshProfile();
                  void reload();
                }}
                className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
              >
                {isArabic ? 'إعادة المحاولة' : 'Try again'}
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                {isArabic ? 'تسجيل الخروج' : 'Sign out'}
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!client || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading profile" />
      </div>
    );
  }

  const accent = profile.theme_accent || client.theme_accent || DEFAULT_ACCENT;
  const displayName = getDisplayName(profile, client);
  const username = cleanText(client.username) || cleanText(profile.username);
  const tagline = getClientTagline(profile, client);
  const activeProjects = projects.filter((project) => {
    const status = (project.status ?? '').toLowerCase();
    return !['completed', 'cancelled'].includes(status);
  }).length;
  const unreadMessages = messages.filter((message) => message.sender !== 'client' && message.is_read === false).length;
  const profileProgress = typeof client.progress === 'number' ? client.progress : profile.progress ?? 0;
  const nextDelivery = projects
    .map((project) => project.expected_delivery_at || '')
    .filter(Boolean)
    .sort()[0];
  const libraryAssets = assets.filter((asset) => getClientAssetPlacements(asset).appearsInFilesLibrary);
  const recentFiles = libraryAssets.slice(0, 4);
  const completion = getProfileCompletion(profile, client, Boolean(avatarUrl));
  const recentActivity = getActivityItems(projects, messages, recentFiles, notifications);
  const packageName = cleanText(client.package_name || profile.package_name);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      dir={isArabic ? 'rtl' : 'ltr'}
      style={{ '--profile-accent': accent } as CSSProperties}
    >
      <EnhancedNavbar />
      {isTeamMember && searchParams.get('mode') !== 'client' && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-20 lg:pt-24">
          <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm font-medium text-amber-900">
                {isArabic
                  ? `أنت جزء من فريق لوموس بدور ${teamRole || 'عضو فريق'}`
                  : `You're part of the Lumos team as ${teamRole || 'team member'}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/lumos-admin')}
              className="inline-flex items-center justify-center rounded-full bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700 shrink-0"
            >
              {isArabic ? 'لوحة العمليات' : 'Open Operations Dashboard'}
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-44 pt-24 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:pb-28 lg:pt-28">
        <Sidebar active={tab} isArabic={isArabic} onChange={handleTabChange} onSignOut={handleSignOut} />

        <main ref={contentStartRef} className="min-w-0 scroll-mt-28 space-y-5">
          <TopBar
            displayName={displayName}
            avatarUrl={avatarUrl}
            initialsText={initials(displayName)}
            isArabic={isArabic}
            theme={theme}
            onSignOut={handleSignOut}
            onToggleTheme={toggleTheme}
          />

          <HeroProfileCard
            avatarConfig={profile.avatar_config ?? client.avatar_config}
            avatarError={avatarError}
            avatarUploading={avatarUploading}
            avatarUrl={avatarUrl}
            coverUrl={coverUrl}
            displayName={displayName}
            fileInputRef={fileInputRef}
            isArabic={isArabic}
            isVerified={Boolean(client.is_verified || profile.is_verified)}
            verifiedLabel={client.verified_label || (client.is_verified || profile.is_verified ? 'Verified Lumos Client' : undefined)}
            location={cleanText(profile.location)}
            onAvatarChange={handleAvatarChange}
            onEdit={() => setEditorOpen(true)}
            packageName={packageName}
            tagline={tagline}
            username={username}
            website={getClientWebsite(profile, client)}
            coverGradient={profile.cover_gradient}
          />

          {heroNotes.length > 0 && (
            <HeroNoteBanner
              notes={heroNotes}
              isArabic={isArabic}
              onMarkRead={async (noteId) => {
                await markClientNoteRead(noteId);
                setHeroNotes((prev) => prev.filter((n) => n.id !== noteId));
              }}
              onNavigateMessages={() => handleTabChange('messages')}
            />
          )}

          <ProfileTabPanel active={tab === 'overview'}>
            <StatsRow
              activeProjects={activeProjects}
              unreadMessages={unreadMessages}
              profileProgress={profileProgress}
              nextDelivery={nextDelivery}
              isArabic={isArabic}
            />
            <HomeTab
              profile={profile}
              client={client}
              projects={projects}
              assets={libraryAssets}
              notes={clientNotes}
              notesLoading={notesLoading}
              notesError={notesError}
              notifications={notifications}
              recentActivity={recentActivity}
              isArabic={isArabic}
              onNavigate={handleTabChange}
              onMarkNoteRead={markClientNoteRead}
            />
          </ProfileTabPanel>

          <ProfileTabPanel active={tab === 'projects'}>
            <ProjectsTab
              projects={projects}
              loading={projectsLoading}
              error={projectsError}
              isArabic={isArabic}
              onRefresh={refetchProjects}
              pricingRequests={clientRequests}
              requestsLoading={requestsLoading}
              requestsError={requestsError}
              onRefreshRequests={refetchRequests}
              clientNotes={clientNotes}
              onMessage={() => handleTabChange('messages')}
              onMarkNoteRead={markClientNoteRead}
              onApproveAsset={handleApproveAsset}
              onRequestChanges={handleRequestChanges}
            />
          </ProfileTabPanel>

          <ProfileTabPanel active={tab === 'messages'}>
            <MessagesTab
              messages={messages}
              loading={portalLoading}
              error={portalError}
              displayName={displayName}
              isArabic={isArabic}
              onRefresh={reloadPortal}
              onSendMessage={sendMessage}
            />
          </ProfileTabPanel>

          <ProfileTabPanel active={tab === 'files'}>
            <FilesTab
              assets={libraryAssets}
              projects={projects}
              loading={portalLoading}
              error={portalError}
              isArabic={isArabic}
              onRefresh={reloadPortal}
            />
          </ProfileTabPanel>

          <ProfileTabPanel active={tab === 'identity'}>
            <IdentityTab
              identity={identity}
              assets={identityAssets}
              profile={profile}
              client={client}
              loading={identityLoading}
              error={identityError}
              isArabic={isArabic}
              onRefresh={reloadIdentity}
            />
          </ProfileTabPanel>

          <ProfileTabPanel active={tab === 'account'}>
            <AccountTab
              profile={profile}
              client={client}
              hasSecurityQuestion={Boolean(client.security_question)}
              saveState={saveState}
              isArabic={isArabic}
              onEdit={() => setEditorOpen(true)}
              onSignOut={handleSignOut}
            />
          </ProfileTabPanel>
        </main>
      </div>

      <MobileNav active={tab} isArabic={isArabic} onChange={handleTabChange} onSignOut={handleSignOut} />

      <EditProfileDialog
        open={editorOpen}
        profile={profile}
        client={client}
        isArabic={isArabic}
        onOpenChange={setEditorOpen}
        onSave={saveProfilePatch}
      />
    </div>
  );
}

function ProfileTabPanel({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn('profile-tab-panel space-y-5', active ? 'block' : 'hidden')}
      data-active={active ? 'true' : 'false'}
      aria-hidden={!active}
    >
      {children}
    </section>
  );
}

function Sidebar({
  active,
  isArabic,
  onChange,
  onSignOut,
}: {
  active: ProfileTab;
  isArabic: boolean;
  onChange: (tab: ProfileTab) => void;
  onSignOut: () => Promise<void>;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 flex h-[calc(100vh-7rem)] flex-col rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="px-3 py-2">
          <LumosLogo variant="nav" size="sm" showText />
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {isArabic ? 'بوابة العميل' : 'Client Portal'}
          </p>
        </div>

        <nav className="mt-3 space-y-1" aria-label={isArabic ? 'تنقل ملف العميل' : 'Client profile navigation'}>
          {PROFILE_NAV.map((item) => {
            const Icon = item.icon;
            const selected = active === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  selected
                    ? 'bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)] ring-1 ring-[color:var(--profile-accent)]/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{isArabic ? item.labelAr : item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => void onSignOut()}
          className="mt-auto flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span>{isArabic ? 'تسجيل الخروج' : 'Sign out'}</span>
        </button>
      </div>
    </aside>
  );
}

function MobileNav({
  active,
  isArabic,
  onChange,
  onSignOut,
}: {
  active: ProfileTab;
  isArabic: boolean;
  onChange: (tab: ProfileTab) => void;
  onSignOut: () => Promise<void>;
}) {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur lg:hidden">
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
        {PROFILE_NAV.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium transition',
                selected
                  ? 'bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{isArabic ? item.labelAr : item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span>{isArabic ? 'خروج' : 'Sign out'}</span>
        </button>
      </div>
    </nav>
  );
}

function ProfilePageSkeleton({ isArabic }: { isArabic: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? 'rtl' : 'ltr'}>
      <EnhancedNavbar />
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-44 pt-24 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:pb-28 lg:pt-28">
        <aside className="hidden lg:block">
          <div className="sticky top-24 h-[calc(100vh-7rem)] rounded-2xl border border-border bg-card p-3 shadow-sm">
            <LumosLogo variant="nav" size="sm" showText />
            <div className="mt-3 h-4 w-28 animate-pulse rounded-full bg-muted" />
            <div className="mt-6 space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-11 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          </div>
        </aside>
        <main className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
            <div className="mt-3 h-7 w-56 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="h-32 animate-pulse bg-muted" />
            <div className="p-5">
              <div className="h-16 w-16 animate-pulse rounded-2xl bg-muted" />
              <div className="mt-4 h-7 w-64 animate-pulse rounded-full bg-muted" />
              <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-full bg-muted" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl border border-border bg-card shadow-sm" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function TopBar({
  displayName,
  avatarUrl,
  initialsText,
  isArabic,
  theme,
  onSignOut,
  onToggleTheme,
}: {
  displayName: string;
  avatarUrl: string | null;
  initialsText: string;
  isArabic: boolean;
  theme: 'dark' | 'light';
  onSignOut: () => Promise<void>;
  onToggleTheme: () => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs text-muted-foreground">{isArabic ? 'مرحباً بك في لوموس' : 'Welcome back'}</p>
        <h2 className="text-xl font-semibold text-foreground">{displayName}</h2>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
          aria-label={theme === 'dark' ? (isArabic ? 'تفعيل الوضع الفاتح' : 'Switch to light mode') : (isArabic ? 'تفعيل الوضع الداكن' : 'Switch to dark mode')}
          title={theme === 'dark' ? (isArabic ? 'الوضع الفاتح' : 'Light mode') : (isArabic ? 'الوضع الداكن' : 'Dark mode')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <Avatar avatarUrl={avatarUrl} initialsText={initialsText} size="sm" />
            <span className="hidden max-w-36 truncate sm:inline">{displayName}</span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 z-30 w-48 rounded-3xl border border-border bg-card p-2 shadow-xl">
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                {isArabic ? 'تسجيل الخروج' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function CompactSectionHeader({
  activeTab,
  avatarConfig,
  avatarUrl,
  displayName,
  initialsText,
  isArabic,
  packageName,
  username,
}: {
  activeTab: Exclude<ProfileTab, 'overview'>;
  avatarConfig?: Record<string, unknown> | null;
  avatarUrl: string | null;
  displayName: string;
  initialsText: string;
  isArabic: boolean;
  packageName: string;
  username: string;
}) {
  const copy = SECTION_COPY[activeTab];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar avatarConfig={avatarConfig} avatarUrl={avatarUrl} initialsText={initialsText} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted-foreground">
              {displayName}{username ? ` · @${username}` : ''}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              {isArabic ? copy.titleAr : copy.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isArabic ? copy.descriptionAr : copy.description}
            </p>
          </div>
        </div>
        {packageName && (
          <span className="w-max rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-card-foreground">
            {packageName}
          </span>
        )}
      </div>
    </section>
  );
}

function HeroProfileCard({
  avatarConfig,
  avatarError,
  avatarUploading,
  avatarUrl,
  coverGradient,
  coverUrl,
  displayName,
  fileInputRef,
  isArabic,
  isVerified,
  verifiedLabel,
  location,
  onAvatarChange,
  onEdit,
  packageName,
  tagline,
  username,
  website,
}: {
  avatarConfig?: Record<string, unknown> | null;
  avatarError: string | null;
  avatarUploading: boolean;
  avatarUrl: string | null;
  coverGradient?: string | null;
  coverUrl: string | null;
  displayName: string;
  fileInputRef: RefObject<HTMLInputElement>;
  isArabic: boolean;
  isVerified: boolean;
  verifiedLabel?: string;
  location: string;
  onAvatarChange: (file: File | undefined) => Promise<void>;
  onEdit: () => void;
  packageName: string;
  tagline: string;
  username: string;
  website: string;
}) {
  const coverStyle: CSSProperties = coverUrl
    ? { backgroundImage: `url(${coverUrl})` }
    : {
        background:
          coverGradient ||
          'radial-gradient(circle at top left, color-mix(in srgb, var(--profile-accent) 38%, transparent), transparent 36%), linear-gradient(135deg, #121826 0%, #1f2937 52%, #f7c873 100%)',
      };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative h-36 bg-cover bg-center sm:h-44 lg:h-48" style={coverStyle}>
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <div className="px-4 pb-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-10 flex flex-col gap-3 sm:-mt-12 sm:flex-row sm:items-end">
            <div className="relative h-[88px] w-[88px] shrink-0 rounded-2xl border-4 border-card bg-card shadow-md sm:h-24 sm:w-24 lg:h-28 lg:w-28">
              <Avatar avatarConfig={avatarConfig} avatarUrl={avatarUrl} initialsText={initials(displayName)} size="lg" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void onAvatarChange(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={isArabic ? 'تغيير الصورة الشخصية' : 'Change avatar'}
              >
                {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>

            <div className="min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-card-foreground sm:text-3xl">{displayName}</h1>
                {isVerified && (
                  <VerifiedClientBadge label={verifiedLabel || (isArabic ? 'عميل لوموس موثّق' : 'Verified Lumos Client')} />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {username && <span>@{username}</span>}
                {location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {location}
                  </span>
                )}
                {website && (
                  <a
                    href={normalizeWebsiteUrl(website) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 transition hover:text-foreground"
                  >
                    <Globe2 className="h-4 w-4" />
                    {website.replace(/^https?:\/\//i, '')}
                  </a>
                )}
              </div>
              {tagline && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{tagline}</p>}
              {avatarError && <p className="mt-3 text-sm text-destructive">{avatarError}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {packageName && (
              <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-card-foreground">
                {packageName}
              </span>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
            >
              <Edit3 className="h-4 w-4" />
              {isArabic ? 'تعديل الملف' : 'Edit Profile'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Avatar({
  avatarConfig,
  avatarUrl,
  initialsText,
  size = 'md',
}: {
  avatarConfig?: Record<string, unknown> | null;
  avatarUrl: string | null;
  initialsText: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const numericSize = size === 'sm' ? 36 : size === 'md' ? 48 : 88;
  const mode = typeof avatarConfig?.mode === 'string' ? avatarConfig.mode : '';
  const presetUrl = typeof avatarConfig?.presetUrl === 'string' ? avatarConfig.presetUrl : '';
  const seed = typeof avatarConfig?.seed === 'string' ? avatarConfig.seed : initialsText;
  const style = typeof avatarConfig?.style === 'string' ? avatarConfig.style as AvatarStyle : 'nanoBanana';
  const colors = Array.isArray(avatarConfig?.colors)
    ? avatarConfig.colors.filter((color): color is string => typeof color === 'string' && Boolean(color.trim()))
    : undefined;

  return (
    <div
      className={cn(
        'flex overflow-hidden rounded-full bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]',
        size === 'sm' && 'h-9 w-9',
        size === 'md' && 'h-12 w-12',
        size === 'lg' && 'h-full w-full rounded-[1.25rem]',
      )}
    >
      {avatarUrl ? (
        <SafeAvatarImage
          src={avatarUrl}
          className="h-full w-full object-cover"
          fallback={<span className="m-auto font-semibold">{initialsText}</span>}
        />
      ) : presetUrl && mode === 'preset' ? (
        <SafeAvatarImage
          src={presetUrl}
          className="h-full w-full object-cover"
          fallback={<span className="m-auto font-semibold">{initialsText}</span>}
        />
      ) : mode === 'generate' || avatarConfig?.seed || avatarConfig?.style ? (
        <div className="m-auto overflow-hidden rounded-[inherit]">
          <AvatarGenerator
            seed={seed}
            style={style}
            size={numericSize}
            colors={colors}
            staticRender
          />
        </div>
      ) : (
        <span
          className={cn(
            'm-auto font-semibold',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-base',
            size === 'lg' && 'text-4xl',
          )}
        >
          {initialsText}
        </span>
      )}
    </div>
  );
}

function StatsRow({
  activeProjects,
  unreadMessages,
  profileProgress,
  nextDelivery,
  isArabic,
}: {
  activeProjects: number;
  unreadMessages: number;
  profileProgress: number;
  nextDelivery?: string;
  isArabic: boolean;
}) {
  const stats = [
    {
      label: isArabic ? 'مشاريع نشطة' : 'Active Projects',
      value: activeProjects.toString(),
      icon: FolderOpen,
    },
    {
      label: isArabic ? 'رسائل غير مقروءة' : 'Unread Messages',
      value: unreadMessages.toString(),
      icon: MessageSquare,
    },
    {
      label: isArabic ? 'تقدم المشروع' : 'Project Progress',
      value: `${Math.max(0, Math.min(100, profileProgress || 0))}%`,
      icon: CheckCircle2,
    },
    {
      label: isArabic ? 'التسليم القادم' : 'Next Delivery',
      value: nextDelivery ? formatDate(nextDelivery) : isArabic ? 'غير محدد' : 'Not scheduled',
      icon: CalendarDays,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article key={stat.label} className="min-h-[112px] rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground sm:text-sm">{stat.label}</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]">
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-3 break-words text-xl font-semibold text-card-foreground">{stat.value}</p>
          </article>
        );
      })}
    </section>
  );
}

function getProfileCompletion(profile: ProfileData, client: ReturnType<typeof useClient>, hasAvatar: boolean) {
  const checks = [
    { label: 'Avatar', labelAr: 'الصورة الشخصية', ok: hasAvatar || Boolean(profile.avatar_url || client?.avatar_url) },
    { label: 'Display name', labelAr: 'اسم العرض', ok: Boolean(cleanText(profile.display_name)) },
    { label: 'Phone', labelAr: 'الهاتف', ok: Boolean(getClientPhone(profile, client)) },
    { label: 'Company', labelAr: 'الشركة', ok: Boolean(getClientCompany(profile, client)) },
    { label: 'Website', labelAr: 'الموقع', ok: Boolean(getClientWebsite(profile, client)) },
    { label: 'Bio', labelAr: 'نبذة', ok: Boolean(cleanText(profile.bio)) },
    { label: 'Brand colors', labelAr: 'ألوان الهوية', ok: Boolean((profile.brand_colors ?? client?.brand_colors ?? []).length) },
  ];

  const completed = checks.filter((item) => item.ok).length;
  return {
    percentage: Math.round((completed / checks.length) * 100),
    missing: checks.filter((item) => !item.ok),
  };
}

function projectHasVerifiedBadge(project: Project) {
  return Boolean(
    project.client_verified_badge
      && ['active', 'completed'].includes(project.status)
      && (project.project_started_at || project.started_at),
  );
}

function ProjectVerifiedBadge({ project, isArabic }: { project: Project; isArabic: boolean }) {
  if (!projectHasVerifiedBadge(project)) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-sm dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200">
      <BadgeCheck className="h-3.5 w-3.5" />
      {project.verified_badge_label || (isArabic ? 'مشروع لوموس موثّق' : 'Verified Lumos Project')}
    </span>
  );
}

function getPrimaryProject(projects: Project[]) {
  return projects.find((project) => project.status === 'active')
    ?? projects.find((project) => project.status === 'paused')
    ?? projects[0]
    ?? null;
}

function getProjectPhase(project: Project | null, isArabic: boolean) {
  if (!project) return isArabic ? 'لا يوجد مشروع نشط' : 'No active project';
  const activeService = getActiveProjectService(project);
  return activeService
    ? `${activeService.service_name} · ${localizedStatus(activeService.status, isArabic)}`
    : isArabic ? 'قيد الإعداد' : 'Project setup';
}

function getHomeAction(projects: Project[], assets: PortalAsset[], notes: ClientNote[], isArabic: boolean) {
  const pinnedNote = notes.find((note) => !note.read_at && ['urgent', 'important'].includes(note.priority))
    ?? notes.find((note) => !note.read_at);
  if (pinnedNote) {
    return {
      title: pinnedNote.title,
      detail: pinnedNote.body,
      cta: pinnedNote.project_id ? (isArabic ? 'عرض المشروع' : 'View Project') : (isArabic ? 'قراءة الملاحظة' : 'Read Note'),
      target: pinnedNote.project_id ? 'projects' as ProfileTab : 'overview' as ProfileTab,
    };
  }

  const reviewAsset = assets.find((asset) => isReviewAsset(asset));
  if (reviewAsset) {
    return {
      title: isArabic ? `${getFileName(reviewAsset)} جاهز للمراجعة` : `${getFileName(reviewAsset)} is ready for review`,
      detail: isArabic ? 'راجع الملف وأرسل موافقتك أو ملاحظاتك من مركز المشروع.' : 'Review the file and send approval or feedback from the Project Hub.',
      cta: isArabic ? 'المراجعة الآن' : 'Review Now',
      target: 'projects' as ProfileTab,
    };
  }

  const reviewProject = projects.find((project) => project.services.some((service) => ['review', 'changes_requested'].includes(service.status)));
  if (reviewProject) {
    return {
      title: isArabic ? `${getProjectDisplayName(reviewProject)} يحتاج انتباهك` : `${getProjectDisplayName(reviewProject)} needs your attention`,
      detail: getProjectNextStep(reviewProject, isArabic),
      cta: isArabic ? 'فتح المشروع' : 'Open Project',
      target: 'projects' as ProfileTab,
    };
  }

  return null;
}

function HomeTab({
  profile,
  client,
  projects,
  assets,
  notes,
  notesLoading,
  notesError,
  notifications,
  recentActivity,
  isArabic,
  onNavigate,
  onMarkNoteRead,
}: {
  profile: ProfileData;
  client: ReturnType<typeof useClient>;
  projects: Project[];
  assets: PortalAsset[];
  notes: ClientNote[];
  notesLoading: boolean;
  notesError: string | null;
  notifications: Notification[];
  recentActivity: ActivityItem[];
  isArabic: boolean;
  onNavigate: (tab: ProfileTab) => void;
  onMarkNoteRead: (noteId: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const activeProject = getPrimaryProject(projects);
  const action = getHomeAction(projects, assets, notes, isArabic);
  const companyName = getClientCompany(profile, client) || getDisplayName(profile, client);
  const recentNotifications = notifications.slice(0, 3);
  const recentDeliveredFiles = assets
    .filter((asset) => ['delivered', 'approved', 'final'].includes(cleanText(asset.deliverable_status).toLowerCase()) || asset.published_to_identity)
    .slice(0, 3);
  const homeNotes = notes.filter((note) => ['home', 'both'].includes(note.placement));

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border bg-muted/30 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[color:var(--profile-accent)]">
                  {isArabic ? 'مرحباً' : 'Welcome'}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-card-foreground">{companyName}</h2>
              </div>
              {activeProject ? <ProjectVerifiedBadge project={activeProject} isArabic={isArabic} /> : null}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {activeProject ? (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {isArabic ? 'المشروع النشط' : 'Active project'}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-card-foreground">{getProjectDisplayName(activeProject)}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{getProjectPhase(activeProject, isArabic)}</p>
                  </div>
                  <div className="w-full rounded-2xl border border-border bg-background p-4 sm:w-44">
                    <p className="text-xs text-muted-foreground">{isArabic ? 'التقدم' : 'Progress'}</p>
                    <p className="mt-1 text-3xl font-semibold text-card-foreground">{activeProject.progress || 0}%</p>
                    <ProjectProgressBar progress={activeProject.progress || 0} className="mt-3" />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <InfoItem icon={Clock3} label={isArabic ? 'المرحلة الحالية' : 'Current phase'} value={getProjectPhase(activeProject, isArabic)} />
                  <InfoItem icon={CalendarDays} label={isArabic ? 'التسليم المتوقع' : 'Expected delivery'} value={activeProject.expected_delivery_at ? formatDate(activeProject.expected_delivery_at) : isArabic ? 'غير محدد بعد' : 'Not scheduled yet'} />
                  <InfoItem icon={MessageSquare} label={isArabic ? 'الخطوة التالية' : 'Next step'} value={getProjectNextStep(activeProject, isArabic)} />
                </div>
              </>
            ) : (
              <EmptyState
                icon={FolderOpen}
                compact
                text={isArabic ? 'سيظهر مشروعك النشط هنا بعد أن يؤكده فريق لوموس.' : 'Your active project appears here after Lumos confirms it.'}
              />
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]">
              {action ? <Sparkles className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-card-foreground">{isArabic ? 'مطلوب منك' : 'Action Needed'}</p>
              <h3 className="mt-2 text-lg font-semibold text-card-foreground">
                {action?.title || (isArabic ? 'كل شيء جاهز حالياً' : 'You’re all caught up.')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {action?.detail || (isArabic ? 'سنرسل لك إشعاراً عندما يكون التحديث التالي جاهزاً.' : 'We’ll notify you when the next update is ready.')}
              </p>
            </div>
          </div>
          {action ? (
            <button
              type="button"
              onClick={() => onNavigate(action.target)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              {action.cta}
            </button>
          ) : null}
        </Card>
      </div>

      {notesError ? <InlineError message={notesError} /> : null}
      {homeNotes.length > 0 ? (
        <div className="grid gap-3">
          {homeNotes.slice(0, 2).map((note) => (
            <ClientPinnedNoteCard
              key={note.id}
              note={note}
              isArabic={isArabic}
              onMarkRead={onMarkNoteRead}
              onMessage={() => onNavigate('messages')}
              onProject={() => onNavigate('projects')}
            />
          ))}
        </div>
      ) : notesLoading ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isArabic ? 'جار تحميل الملاحظات...' : 'Loading notes...'}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <HomeNavCard
          icon={FolderOpen}
          title={isArabic ? 'مركز المشروع' : 'Project Hub'}
          description={isArabic ? 'تابع التقدم واعتمد الأعمال' : 'Track progress and approve work'}
          onClick={() => onNavigate('projects')}
        />
        <HomeNavCard
          icon={Palette}
          title={isArabic ? 'حزمة الهوية' : 'Brand Kit'}
          description={isArabic ? 'أصول هويتك النهائية المعتمدة' : 'Your final approved brand assets'}
          onClick={() => onNavigate('identity')}
        />
        <HomeNavCard
          icon={Archive}
          title={isArabic ? 'مكتبة الملفات' : 'Files Library'}
          description={isArabic ? 'كل التحميلات في مكان واحد' : 'All your downloads in one place'}
          onClick={() => onNavigate('files')}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-semibold text-card-foreground">{isArabic ? 'آخر الإشعارات' : 'Latest Updates'}</p>
          <div className="mt-4 space-y-3">
            {recentNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">{isArabic ? 'لا توجد إشعارات حديثة.' : 'No recent notifications.'}</p>
            ) : (
              recentNotifications.map((notification) => (
                <ActivityRow
                  key={notification.id}
                  item={{
                    id: notification.id,
                    label: notification.title,
                    detail: notification.message,
                    createdAt: notification.created_at,
                    icon: 'notification',
                  }}
                />
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-card-foreground">{isArabic ? 'ملفات مسلّمة حديثاً' : 'Recent Delivered Files'}</p>
          <div className="mt-4 space-y-3">
            {recentDeliveredFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">{isArabic ? 'ستظهر الملفات المسلّمة هنا.' : 'Delivered files will appear here.'}</p>
            ) : (
              recentDeliveredFiles.map((asset) => (
                <div key={asset.id} className="rounded-2xl border border-border bg-background p-3">
                  <p className="truncate text-sm font-semibold text-card-foreground">{getFileName(asset)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{clientAssetStatusLabel(asset.deliverable_status)} · {formatDate(asset.uploaded_at || asset.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-card-foreground">{isArabic ? 'نشاط المشروع' : 'Project Activity'}</p>
          <div className="mt-4 space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">{isArabic ? 'سيظهر النشاط هنا.' : 'Activity will appear here.'}</p>
            ) : (
              recentActivity.slice(0, 3).map((item) => <ActivityRow key={item.id} item={item} />)
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}

function HomeNavCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof FolderOpen;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[color:var(--profile-accent)]/40 hover:shadow-md"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-card-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </button>
  );
}

function ClientPinnedNoteCard({
  note,
  isArabic,
  onMarkRead,
  onMessage,
  onProject,
  showProjectButton = true,
}: {
  note: ClientNote;
  isArabic: boolean;
  onMarkRead: (noteId: string) => Promise<{ success: boolean; error?: string }>;
  onMessage: () => void;
  onProject: () => void;
  showProjectButton?: boolean;
}) {
  const tone = note.priority === 'urgent'
    ? 'border-rose-200 bg-rose-50/80 text-rose-950 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100'
    : note.priority === 'important'
      ? 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100'
      : 'border-border bg-card text-card-foreground';

  return (
    <Card className={cn('p-5', tone)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
            {isArabic ? 'ملاحظة مهمة من لوموس' : 'Important note from Lumos'}
          </p>
          <h3 className="mt-2 text-base font-semibold">{note.title}</h3>
          <p className="mt-2 text-sm leading-6 opacity-80">{note.body}</p>
        </div>
        {note.read_at ? (
          <span className="w-max rounded-full bg-white/60 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {isArabic ? 'تمت القراءة' : 'Read'}
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {note.is_dismissible && !note.read_at ? (
          <button
            type="button"
            onClick={() => void onMarkRead(note.id)}
            className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"
          >
            {isArabic ? 'تمت القراءة' : 'Mark as read'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onMessage}
          className="rounded-full border border-current/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/40"
        >
          {isArabic ? 'رد / راسلنا' : 'Reply / Message us'}
        </button>
        {note.project_id && showProjectButton ? (
          <button
            type="button"
            onClick={onProject}
            className="rounded-full border border-current/20 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/40"
          >
            {isArabic ? 'عرض المشروع' : 'View project'}
          </button>
        ) : null}
      </div>
    </Card>
  );
}

function OverviewTab({
  profile,
  client,
  completion,
  recentActivity,
  nextStep,
  isArabic,
  onEdit,
}: {
  profile: ProfileData;
  client: ReturnType<typeof useClient>;
  completion: ReturnType<typeof getProfileCompletion>;
  recentActivity: ActivityItem[];
  nextStep?: string | null;
  isArabic: boolean;
  onEdit: () => void;
}) {
  const services = formatServicesNeeded(getClientServices(profile, client), isArabic);
  const budgetRange = getSignupString(profile, client, 'budget_range');
  const timeline = getSignupString(profile, client, 'timeline');
  const referralSource = getSignupString(profile, client, 'referral_source');
  const projectSummary = getSignupString(profile, client, 'project_summary');

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[color:var(--profile-accent)]">
              {isArabic ? 'معلومات الملف' : 'Profile Info'}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-card-foreground">
              {isArabic ? 'عن العميل' : 'About'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <Edit3 className="h-4 w-4" />
            {isArabic ? 'تعديل المعلومات' : 'Edit Information'}
          </button>
        </div>

        <p className="mt-5 min-h-14 rounded-2xl bg-muted/50 p-4 text-sm leading-7 text-muted-foreground">
          {profile.bio || getClientTagline(profile, client) || (isArabic ? 'أضف نبذة مختصرة عن شركتك.' : 'Add a short bio for your company.')}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoItem icon={Building2} label={isArabic ? 'الشركة' : 'Company'} value={getClientCompany(profile, client)} />
          <InfoItem icon={Palette} label={isArabic ? 'المجال' : 'Industry'} value={getClientIndustry(profile, client)} />
          <InfoItem icon={Mail} label={isArabic ? 'البريد' : 'Email'} value={client?.email || profile.email} />
          <InfoItem icon={Phone} label={isArabic ? 'الهاتف' : 'Phone'} value={getClientPhone(profile, client)} />
          <InfoItem icon={Globe2} label={isArabic ? 'الموقع' : 'Website'} value={getClientWebsite(profile, client)} />
          <InfoItem icon={MapPin} label={isArabic ? 'الموقع الجغرافي' : 'Location'} value={profile.location} />
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-card-foreground">
              {isArabic ? 'تفاصيل المشروع' : 'Project Snapshot'}
            </h3>
            {services.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {services.length} {isArabic ? 'خدمات' : services.length === 1 ? 'service' : 'services'}
              </span>
            )}
          </div>
          {projectSummary && (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{projectSummary}</p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <InfoItem
              icon={FileText}
              label={isArabic ? 'الميزانية' : 'Budget'}
              value={budgetRange ? labelFromOptions(budgetRange, BUDGET_RANGE_OPTIONS, isArabic) : ''}
            />
            <InfoItem
              icon={Clock3}
              label={isArabic ? 'الجدول' : 'Timeline'}
              value={timeline ? labelFromOptions(timeline, TIMELINE_OPTIONS, isArabic) : ''}
            />
            <InfoItem
              icon={UserCircle}
              label={isArabic ? 'مصدر التعارف' : 'Referral'}
              value={referralSource ? labelFromOptions(referralSource, REFERRAL_SOURCE_OPTIONS, isArabic) : ''}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {services.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                {isArabic ? 'لم يتم حفظ خدمات مطلوبة بعد.' : 'No requested services saved yet.'}
              </span>
            ) : (
              services.map((service) => (
                <span key={service} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {service}
                </span>
              ))
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-card-foreground">
                {isArabic ? 'اكتمال الملف' : 'Profile Completion'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isArabic ? 'الحقول الناقصة تظهر هنا فقط.' : 'Missing real profile fields appear here.'}
              </p>
            </div>
            <span className="text-3xl font-semibold text-[color:var(--profile-accent)]">{completion.percentage}%</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-[color:var(--profile-accent)]"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {completion.missing.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isArabic ? 'ملفك مكتمل.' : 'Your profile is complete.'}
              </p>
            ) : (
              completion.missing.slice(0, 4).map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--profile-accent)]" />
                  {isArabic ? item.labelAr : item.label}
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="mt-4 w-full rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
          >
            {isArabic ? 'إكمال الملف' : 'Complete profile'}
          </button>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-medium text-card-foreground">{isArabic ? 'الخطوة التالية' : 'Next Step'}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {nextStep || (isArabic ? 'ستظهر خطوتك التالية هنا بمجرد أن يحدّث لوموس مشروعك.' : 'Your next step will appear here once Lumos updates your project.')}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-medium text-card-foreground">{isArabic ? 'النشاط الأخير' : 'Recent Activity'}</p>
          <div className="mt-4 space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isArabic ? 'سيظهر نشاطك هنا.' : 'Your activity will appear here.'}
              </p>
            ) : (
              recentActivity.map((item) => <ActivityRow key={item.id} item={item} />)
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}

function ProjectsTab({
  projects,
  loading,
  error,
  isArabic,
  onRefresh,
  pricingRequests,
  requestsLoading,
  requestsError,
  onRefreshRequests,
  clientNotes,
  onMessage,
  onMarkNoteRead,
  onApproveAsset,
  onRequestChanges,
}: {
  projects: Project[];
  loading: boolean;
  error: string | null;
  isArabic: boolean;
  onRefresh: () => Promise<void>;
  pricingRequests: PricingRequest[];
  requestsLoading: boolean;
  requestsError: string | null;
  onRefreshRequests: () => Promise<void>;
  clientNotes: ClientNote[];
  onMessage: () => void;
  onMarkNoteRead: (noteId: string) => Promise<{ success: boolean; error?: string }>;
  onApproveAsset?: (assetId: string) => Promise<void> | void;
  onRequestChanges?: (assetId: string, message?: string) => Promise<void> | void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedProject = useMemo(
    () => selectedId ? projects.find((project) => project.id === selectedId) ?? null : null,
    [projects, selectedId],
  );

  return (
    <section className="space-y-5">
      <div className="space-y-5">
        <SectionHeader
          title={isArabic ? 'مركز المشروع' : 'Project Hub'}
          description={isArabic ? 'تابع التقدم والموافقات والخدمات والملفات المرتبطة بالمشروع.' : 'Track progress, approvals, services, and project-related files.'}
          action={
            <RefreshButton label={isArabic ? 'تحديث' : 'Refresh'} loading={loading} onClick={onRefresh} />
          }
        />

        {error && <InlineError message={error} />}

        {loading ? (
          <SkeletonGrid count={3} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            text={isArabic
              ? 'ستظهر مشاريعك هنا بمجرد أن يحوّل لوموس طلبك المعتمد إلى مشروع فعلي.'
              : 'Your projects will appear here once Lumos converts your approved request into a real project.'}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {projects.map((project) => (
              <ProjectClientCard
                key={project.id}
                project={project}
                isArabic={isArabic}
                onOpen={() => setSelectedId(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ProjectDetailsDialog
        project={selectedProject}
        isArabic={isArabic}
        notes={clientNotes}
        onMessage={onMessage}
        onMarkNoteRead={onMarkNoteRead}
        onApproveAsset={onApproveAsset}
        onRequestChanges={onRequestChanges}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </section>
  );
}

function ProjectClientCard({
  project,
  isArabic,
  onOpen,
}: {
  project: Project;
  isArabic: boolean;
  onOpen: () => void;
}) {
  const activeService = getActiveProjectService(project);
  const status = CLIENT_PROJECT_STATUS[project.status] ?? CLIENT_PROJECT_STATUS.active;
  const deliverables = getProjectDeliverables(project);
  const nextStep = getProjectNextStep(project, isArabic);
  const actionCount = deliverables.filter((asset) => getClientAssetPlacements(asset).appearsInActions).length
    + project.services.filter((service) => ['review', 'changes_requested'].includes(service.status)).length;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-xl font-semibold text-card-foreground">{getProjectDisplayName(project)}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
              {isArabic ? status.ar : status.en}
            </span>
            <ProjectVerifiedBadge project={project} isArabic={isArabic} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {project.invoice_number ? (
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-card-foreground">
                <Hash className="h-3.5 w-3.5" />
                {project.invoice_number}
              </span>
            ) : null}
            <span>{project.package_name || (isArabic ? 'باقة لوموس' : 'Lumos package')}</span>
          </div>
        </div>
        <div className="shrink-0 rounded-2xl border border-border bg-background px-4 py-3 text-left sm:text-right">
          <p className="text-xs text-muted-foreground">{isArabic ? 'التقدم' : 'Progress'}</p>
          <p className="mt-1 text-2xl font-semibold text-card-foreground">{project.progress || 0}%</p>
        </div>
      </div>

      <ProjectProgressBar progress={project.progress || 0} className="mt-4" />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ProjectInfoPill
          icon={CalendarDays}
          label={isArabic ? 'التسليم المتوقع' : 'Expected delivery'}
          value={project.expected_delivery_at ? formatDate(project.expected_delivery_at) : isArabic ? 'غير محدد بعد' : 'Not scheduled yet'}
        />
        <ProjectInfoPill
          icon={CheckCircle2}
          label={isArabic ? 'الخدمات المختارة' : 'Selected services'}
          value={`${project.services.length}`}
        />
        <ProjectInfoPill
          icon={Clock3}
          label={isArabic ? 'الخدمة الحالية' : 'Active service'}
          value={activeService?.service_name || (isArabic ? 'سيتم تحديدها قريباً' : 'To be scheduled')}
        />
        <ProjectInfoPill
          icon={Download}
          label={isArabic ? 'التسليمات' : 'Deliverables'}
          value={`${deliverables.length}`}
        />
        <ProjectInfoPill
          icon={Sparkles}
          label={isArabic ? 'إجراءات مطلوبة' : 'Action needed'}
          value={`${actionCount}`}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {isArabic ? 'الخطوة التالية' : 'Next step'}
        </p>
        <p className="mt-2 text-sm leading-6 text-card-foreground">{nextStep}</p>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
      >
        <FolderOpen className="h-4 w-4" />
        {isArabic ? 'فتح المشروع' : 'Open Project'}
      </button>
    </Card>
  );
}

function ProjectDetailsDialog({
  project,
  isArabic,
  notes,
  onMessage,
  onMarkNoteRead,
  onApproveAsset,
  onRequestChanges,
  onOpenChange,
}: {
  project: Project | null;
  isArabic: boolean;
  notes: ClientNote[];
  onMessage: () => void;
  onMarkNoteRead: (noteId: string) => Promise<{ success: boolean; error?: string }>;
  onApproveAsset?: (assetId: string) => Promise<void> | void;
  onRequestChanges?: (assetId: string, message?: string) => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!project) return null;

  const activeService = getActiveProjectService(project);
  const deliverables = getProjectDeliverables(project).filter((asset) => getClientAssetPlacements(asset).appearsInProjectHub);
  const projectNotes = notes.filter((note) => note.project_id === project.id && ['project', 'both'].includes(note.placement));
  const nextStep = getProjectNextStep(project, isArabic);
  const currentPhase = activeService
    ? `${activeService.service_name} · ${localizedStatus(activeService.status, isArabic)}`
    : isArabic ? 'قيد الجدولة' : 'Scheduling';

  return (
    <Dialog open={!!project} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {getProjectDisplayName(project)}
            <ProjectVerifiedBadge project={project} isArabic={isArabic} />
          </DialogTitle>
          <DialogDescription>
            {project.invoice_number
              ? `${isArabic ? 'رقم الفاتورة' : 'Invoice'} ${project.invoice_number}`
              : isArabic ? 'مساحة مشروع لوموس' : 'Lumos project workspace'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--profile-accent)]">
                  {isArabic ? 'نظرة عامة' : 'Overview'}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {project.client_notes || (isArabic
                    ? 'سيضيف فريق لوموس ملخص المشروع هنا مع تقدم العمل.'
                    : 'Lumos will add a project summary here as the work progresses.')}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <ProjectInfoPill icon={FolderOpen} label={isArabic ? 'الباقة' : 'Package'} value={project.package_name || '—'} />
                  <ProjectInfoPill icon={Hash} label={isArabic ? 'رقم الفاتورة' : 'Invoice'} value={project.invoice_number || '—'} />
                  <ProjectInfoPill icon={Clock3} label={isArabic ? 'تاريخ البدء' : 'Start date'} value={formatDate(project.started_at || project.created_at)} />
                  <ProjectInfoPill icon={CalendarDays} label={isArabic ? 'التسليم المتوقع' : 'Expected delivery'} value={project.expected_delivery_at ? formatDate(project.expected_delivery_at) : '—'} />
                  <ProjectInfoPill icon={CheckCircle2} label={isArabic ? 'المرحلة الحالية' : 'Current phase'} value={currentPhase} />
                  <ProjectInfoPill icon={MessageSquare} label={isArabic ? 'الخطوة التالية' : 'Next step'} value={nextStep} />
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isArabic ? 'إجمالي التقدم' : 'Total progress'}
                </p>
                <p className="mt-3 text-4xl font-semibold text-card-foreground">{project.progress || 0}%</p>
                <ProjectProgressBar progress={project.progress || 0} className="mt-4" />
                <ProjectJourneyTimeline project={project} isArabic={isArabic} />
              </div>
            </div>
          </Card>

          <ClientActionCenter
            project={project}
            notes={projectNotes}
            isArabic={isArabic}
            onMessage={onMessage}
            onMarkNoteRead={onMarkNoteRead}
            onApproveAsset={onApproveAsset}
            onRequestChanges={onRequestChanges}
          />

          <Card className="p-5">
            <SectionHeader
              title={isArabic ? 'تقدم الخدمات' : 'Services Progress'}
              description={isArabic ? 'كل خدمة مختارة تظهر بتحديث بسيط وواضح.' : 'Each included service appears with a simple client-visible update.'}
            />
            <div className="mt-5 grid gap-3">
              {project.services.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  compact
                  text={isArabic ? 'ستظهر الخدمات هنا بمجرد إعداد المشروع.' : 'Services will appear here once the project is prepared.'}
                />
              ) : (
                project.services.map((service) => (
                  <ProjectServiceClientCard key={service.id} service={service} isArabic={isArabic} />
                ))
              )}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader
              title={isArabic ? 'ملفات المشروع' : 'Project Files'}
              description={isArabic ? 'الملفات المرتبطة بهذا المشروع والمرئية لك.' : 'Client-visible files linked to this project.'}
            />
            <div className="mt-5 space-y-3">
              {deliverables.length === 0 ? (
                <EmptyState
                  icon={Download}
                  compact
                  text={isArabic
                    ? 'ستظهر التسليمات هنا بمجرد أن ينشرها فريق لوموس.'
                    : 'Your deliverables will appear here once Lumos publishes them.'}
                />
              ) : (
                deliverables.map((asset) => (
                  <ProjectDeliverableRow key={asset.id} asset={asset} isArabic={isArabic} />
                ))
              )}
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProjectInfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderOpen;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <div className="mt-2 break-words text-sm font-semibold text-card-foreground">{value || '—'}</div>
    </div>
  );
}

function ProjectProgressBar({ progress, className }: { progress: number; className?: string }) {
  const safeProgress = Math.max(0, Math.min(100, progress || 0));
  return (
    <div className={cn('h-2 rounded-full bg-muted', className)}>
      <div
        className="h-2 rounded-full bg-[color:var(--profile-accent)] transition-all"
        style={{ width: `${safeProgress}%` }}
      />
    </div>
  );
}

function ProjectJourneyTimeline({ project, isArabic }: { project: Project; isArabic: boolean }) {
  const hasIdentity = project.services.some((service) => /logo|brand|identity|color|typography|social|guide/i.test(`${service.service_name} ${service.description || ''}`));
  const hasReview = project.services.some((service) => ['review', 'completed', 'delivered'].includes(service.status));
  const hasDelivery = project.services.some((service) => service.status === 'delivered');
  const complete = project.status === 'completed' || (project.services.length > 0 && project.services.every((service) => service.status === 'delivered'));
  const items = [
    { label: isArabic ? 'استلام الطلب' : 'Request received', done: true },
    { label: isArabic ? 'بدء المشروع' : 'Project started', done: Boolean(project.started_at || project.created_at) },
    { label: isArabic ? 'تصميم الهوية' : 'Identity design', done: hasIdentity && project.services.some((service) => service.progress > 0) },
    { label: isArabic ? 'المراجعة' : 'Review', done: hasReview },
    { label: isArabic ? 'التسليم' : 'Delivery', done: hasDelivery },
    { label: isArabic ? 'مكتمل' : 'Completed', done: complete },
  ];

  return (
    <ol className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-xs">
          <span className={cn('h-2.5 w-2.5 rounded-full', item.done ? 'bg-[color:var(--profile-accent)]' : 'bg-muted-foreground/25')} />
          <span className={item.done ? 'font-semibold text-card-foreground' : 'text-muted-foreground'}>{item.label}</span>
        </li>
      ))}
    </ol>
  );
}

function ClientActionCenter({
  project,
  notes,
  isArabic,
  onMessage,
  onMarkNoteRead,
  onApproveAsset,
  onRequestChanges,
}: {
  project: Project;
  notes: ClientNote[];
  isArabic: boolean;
  onMessage: () => void;
  onMarkNoteRead: (noteId: string) => Promise<{ success: boolean; error?: string }>;
  onApproveAsset?: (assetId: string) => Promise<void> | void;
  onRequestChanges?: (assetId: string, message?: string) => Promise<void> | void;
}) {
  const activeService = getActiveProjectService(project);
  const projectFiles = getProjectDeliverables(project);
  const delivered = projectFiles.filter((asset) => asset.deliverable_status === 'delivered');
  const reviewFiles = projectFiles.filter((asset) => getClientAssetPlacements(asset).appearsInActions);
  const needsReview = activeService?.status === 'review' || activeService?.status === 'changes_requested';
  const [approving, setApproving] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  const handleApprove = async (assetId: string) => {
    if (!onApproveAsset) { onMessage(); return; }
    setApproving(assetId);
    try { await onApproveAsset(assetId); } finally { setApproving(null); }
  };

  const handleRequestChanges = async (assetId: string) => {
    if (!onRequestChanges) { onMessage(); return; }
    setRequesting(assetId);
    try { await onRequestChanges(assetId); } finally { setRequesting(null); }
  };

  const firstReviewAsset = reviewFiles[0];

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-card-foreground">{isArabic ? 'مركز الإجراءات' : 'Client Action Center'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {needsReview || reviewFiles.length > 0 || notes.some((note) => !note.read_at)
              ? (isArabic ? 'توجد عناصر تحتاج مراجعتك أو ردك.' : 'There are items waiting for your review or reply.')
              : delivered.length > 0
                ? (isArabic ? 'بعض التسليمات جاهزة للتحميل الآن.' : 'Some deliverables are ready to download now.')
                : (isArabic ? 'لا يوجد إجراء مطلوب منك الآن.' : 'No action is needed from you right now.')}
          </p>
        </div>
        <span className="rounded-full bg-[color:var(--profile-accent)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--profile-accent)]">
          {delivered.length > 0
            ? (isArabic ? 'جاهز للتحميل' : 'Ready to download')
            : needsReview || reviewFiles.length > 0 || notes.some((note) => !note.read_at)
              ? (isArabic ? 'يحتاج ردك' : 'Needs your response')
              : activeService?.status === 'in_progress'
              ? (isArabic ? 'نعمل عليه الآن' : 'We are working on this now')
              : (isArabic ? 'قيد المتابعة' : 'In progress')}
        </span>
      </div>

      {notes.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {notes.map((note) => (
            <ClientPinnedNoteCard
              key={note.id}
              note={note}
              isArabic={isArabic}
              onMarkRead={onMarkNoteRead}
              onMessage={onMessage}
              onProject={() => undefined}
              showProjectButton={false}
            />
          ))}
        </div>
      ) : null}

      {reviewFiles.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isArabic ? 'ملفات تحتاج مراجعة' : 'Files needing review'}
          </p>
          {reviewFiles.slice(0, 3).map((asset) => (
            <ProjectDeliverableRow key={asset.id} asset={asset} isArabic={isArabic} compact />
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {onApproveAsset && firstReviewAsset ? (
          <button
            type="button"
            disabled={approving === firstReviewAsset.id}
            onClick={() => void handleApprove(firstReviewAsset.id)}
            className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {approving === firstReviewAsset.id ? (isArabic ? 'جارٍ الاعتماد…' : 'Approving…') : (isArabic ? 'اعتماد' : 'Approve')}
          </button>
        ) : (
          <button type="button" onClick={onMessage} className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90">
            {isArabic ? 'اعتماد عبر الرسائل' : 'Approve'}
          </button>
        )}
        {onRequestChanges && firstReviewAsset ? (
          <button
            type="button"
            disabled={requesting === firstReviewAsset.id}
            onClick={() => void handleRequestChanges(firstReviewAsset.id)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requesting === firstReviewAsset.id ? (isArabic ? 'جارٍ الطلب…' : 'Requesting…') : (isArabic ? 'طلب تعديلات' : 'Request Changes')}
          </button>
        ) : (
          <button type="button" onClick={onMessage} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted">
            {isArabic ? 'طلب تعديلات' : 'Request Changes'}
          </button>
        )}
        <button type="button" onClick={onMessage} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted">
          {isArabic ? 'اسأل سؤالاً' : 'Ask Question'}
        </button>
      </div>
    </Card>
  );
}

function ProjectServiceClientCard({ service, isArabic }: { service: ProjectService; isArabic: boolean }) {
  const status = CLIENT_SERVICE_STATUS[service.status] ?? CLIENT_SERVICE_STATUS.not_started;
  const deliverables = service.deliverables ?? [];
  const delivered = service.status === 'delivered';

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-semibold text-card-foreground">{service.service_name}</h4>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
              {isArabic ? status.ar : status.en}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {service.description || (service.status === 'not_started'
              ? (isArabic ? 'سنبدأ هذه الخدمة في الوقت المناسب ضمن خطة المشروع.' : 'This service will start at the right moment in the project plan.')
              : service.status === 'in_progress'
                ? (isArabic ? 'نعمل على هذه الخدمة الآن.' : 'We are working on this now.')
                : delivered
                  ? (isArabic ? 'تم تسليم هذه الخدمة.' : 'This service has been delivered.')
                  : (isArabic ? 'سيتم تحديث هذه الخدمة قريباً.' : 'This service will be updated soon.'))}
          </p>
          {service.client_visible_notes ? (
            <p className="mt-3 rounded-2xl bg-muted/60 px-3 py-2 text-sm leading-6 text-card-foreground">{service.client_visible_notes}</p>
          ) : null}
        </div>
        <div className="w-full shrink-0 sm:w-32">
          <p className="text-right text-sm font-semibold text-card-foreground">{service.progress || 0}%</p>
          <ProjectProgressBar progress={service.progress || 0} className="mt-2" />
          <p className="mt-2 text-right text-xs text-muted-foreground">
            {service.updated_at ? formatDate(service.updated_at) : formatDate(service.created_at)}
          </p>
        </div>
      </div>

      {delivered ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--profile-accent)]/20 bg-[color:var(--profile-accent)]/5 px-3 py-2 text-sm font-medium text-card-foreground">
          {isArabic ? `${service.service_name} تم تسليمها.` : `${service.service_name} delivered.`}
        </div>
      ) : null}

      {deliverables.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isArabic ? 'الملفات المسلّمة' : 'Delivered files'}
          </p>
          {deliverables.slice(0, 3).map((asset) => (
            <ProjectDeliverableRow key={asset.id} asset={asset} isArabic={isArabic} compact />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {service.status === 'in_progress'
            ? (isArabic ? 'نعمل على هذا الآن.' : 'We are working on this now.')
            : (isArabic ? 'ستظهر الملفات هنا عند نشرها.' : 'Deliverables will appear here once published.')}
        </p>
      )}
    </div>
  );
}

function isProjectImageAsset(asset: ProjectDeliverable) {
  const explicit = cleanText(asset.file_type).toLowerCase();
  const source = cleanText(asset.file_name || asset.file_url).toLowerCase();
  const ext = source.split('?')[0].split('#')[0].split('.').pop() || '';
  return explicit.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(ext);
}

function ProjectPreviewThumb({ asset }: { asset: ProjectDeliverable }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);

    if (!isProjectImageAsset(asset)) return () => {
      cancelled = true;
    };

    void getProjectAssetSignedUrl(asset, 60 * 10).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [asset]);

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]">
      {previewUrl ? (
        <img src={previewUrl} alt="" className="h-full w-full object-cover" />
      ) : isProjectImageAsset(asset) ? (
        <ImageIcon className="h-5 w-5" />
      ) : (
        <FileText className="h-5 w-5" />
      )}
    </span>
  );
}

function ProjectDeliverableRow({
  asset,
  isArabic,
  compact,
}: {
  asset: ProjectDeliverable;
  isArabic: boolean;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const placementLabels = clientAssetPlacementLabels(asset);

  const download = async () => {
    setBusy(true);
    try {
      const url = await getProjectAssetSignedUrl(asset, 60 * 10);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-3 rounded-2xl border border-border bg-background p-3 sm:flex-row sm:items-center', compact && 'p-2')}>
      <ProjectPreviewThumb asset={asset} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-card-foreground">{asset.file_name}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
            {isArabic ? 'معتمد' : 'Approved'}
          </span>
          <span className="rounded-full bg-[color:var(--profile-accent)]/10 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--profile-accent)]">
            {isArabic ? 'منشور' : 'Published'}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {(asset.file_type || asset.asset_type || asset.file_name?.split('.').pop() || 'file').toUpperCase()}
          {formatBytes(asset.file_size) ? ` · ${formatBytes(asset.file_size)}` : ''}
          {asset.created_at || asset.uploaded_at ? ` · ${formatDate(asset.created_at || asset.uploaded_at)}` : ''}
        </p>
        {asset.note && !compact ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{asset.note}</p> : null}
        {!compact && placementLabels.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {isArabic ? 'يظهر في: ' : 'Appears in: '}
            {placementLabels.join(' · ')}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {asset.deliverable_status === 'delivered'
            ? (isArabic ? 'جاهز للتحميل' : 'Ready to download')
            : clientAssetStatusLabel(asset.deliverable_status)}
        </span>
        <button
          type="button"
          onClick={() => void download()}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {isArabic ? 'معاينة' : 'Preview'}
        </button>
        <button
          type="button"
          onClick={() => void download()}
          disabled={busy}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          {isArabic ? 'تحميل' : 'Download'}
        </button>
        {asset.published_to_identity ? (
          <span className="rounded-full bg-[color:var(--profile-accent)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--profile-accent)]">
            {isArabic ? 'في حزمة الهوية' : 'In Brand Kit'}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const REQUEST_STATUS_LABELS: Record<PricingRequest['status'], { en: string; ar: string; tone: string }> = {
  new: { en: 'New', ar: 'جديد', tone: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200' },
  reviewing: { en: 'In Review', ar: 'قيد المراجعة', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' },
  approved: { en: 'Approved', ar: 'معتمد', tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' },
  converted: { en: 'Converted', ar: 'محوّل', tone: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200' },
  rejected: { en: 'Needs revision', ar: 'يحتاج تعديل', tone: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200' },
  cancelled: { en: 'Cancelled', ar: 'ملغي', tone: 'bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-200' },
};

function ClientRequestsPanel({
  requests,
  loading,
  error,
  isArabic,
  onRefresh,
}: {
  requests: PricingRequest[];
  loading: boolean;
  error: string | null;
  isArabic: boolean;
  onRefresh: () => Promise<void>;
}) {
  return (
    <section className="space-y-4">
      <SectionHeader
        title={isArabic ? 'طلبات التسعير' : 'Pricing Requests'}
        description={
          isArabic
            ? 'الطلبات التي قدّمتها من نافذة الأسعار تظهر هنا. الحالة تتحدّث عندما يراجعها فريقنا.'
            : 'Pricing requests you submitted from the pricing modal appear here. The status updates as our team reviews them.'
        }
        action={
          <RefreshButton label={isArabic ? 'تحديث' : 'Refresh'} loading={loading} onClick={onRefresh} />
        }
      />

      {error && <InlineError message={error} />}

      {loading && requests.length === 0 ? (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isArabic ? 'جارٍ تحميل الطلبات…' : 'Loading requests…'}
          </div>
        </Card>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={FileText}
          text={
            isArabic
              ? 'لم تقدّم أي طلب تسعير بعد. افتح نافذة الأسعار وأرسل طلبك الأول.'
              : 'You have not submitted any pricing requests yet. Open the pricing modal to send your first one.'
          }
        />
      ) : (
        <div className="grid gap-3">
          {requests.map((req) => {
            const statusCfg = REQUEST_STATUS_LABELS[req.status] ?? REQUEST_STATUS_LABELS.new;
            const breakdown = req.discount_breakdown;
            const discountAmount = breakdown
              ? (breakdown.base_discount || 0) + (breakdown.promo_discount || 0) + (breakdown.reward_discount || 0)
              : 0;
            const promo = (req.applied_promo_code || '').trim();
            return (
              <Card key={req.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {req.invoice_number ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] font-bold text-card-foreground">
                          <Hash className="h-3 w-3" />
                          {req.invoice_number}
                        </span>
                      ) : null}
                      <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', statusCfg.tone)}>
                        {isArabic ? statusCfg.ar : statusCfg.en}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-card-foreground truncate">
                      {req.package_name || (req.request_type === 'custom' ? (isArabic ? 'باقة مخصصة' : 'Custom plan') : (isArabic ? 'طلب تسعير' : 'Pricing request'))}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatTime(req.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-card-foreground tabular-nums">
                      {req.estimated_total
                        ? `${new Intl.NumberFormat(isArabic ? 'ar' : 'en').format(req.estimated_total)} ${req.price_currency || 'EGP'}`
                        : '—'}
                    </p>
                    {discountAmount > 0 ? (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 tabular-nums">
                        −{new Intl.NumberFormat(isArabic ? 'ar' : 'en').format(discountAmount)} {req.price_currency || 'EGP'}
                        {promo ? ` · ${promo}` : ''}
                      </p>
                    ) : promo ? (
                      <p className="text-[11px] font-mono font-bold tracking-wider text-emerald-700 dark:text-emerald-300">{promo}</p>
                    ) : null}
                  </div>
                </div>

                {req.request_notes ? (
                  <p className="mt-3 rounded-2xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
                    {req.request_notes}
                  </p>
                ) : null}
                <RequestStatusTimeline
                  status={req.status}
                  status_history={req.status_history}
                  mode="compact"
                  animated={false}
                  className="mt-4 bg-muted/20"
                />
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MessagesTab({
  messages,
  loading,
  error,
  displayName,
  isArabic,
  onRefresh,
  onSendMessage,
}: {
  messages: PortalMessage[];
  loading: boolean;
  error: string | null;
  displayName: string;
  isArabic: boolean;
  onRefresh: () => Promise<void>;
  onSendMessage: (message: string) => Promise<boolean>;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setSendError(null);
    try {
      const sent = await onSendMessage(trimmed);
      if (!sent) {
        setSendError(isArabic ? 'تعذّر إرسال الرسالة. حاول مرة أخرى.' : 'Message failed to send. Please try again.');
        return;
      }
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-5">
      <SectionHeader
        title={isArabic ? 'الرسائل' : 'Messages'}
        description={isArabic ? 'محادثة مباشرة مع فريق لوموس.' : 'A direct conversation with the Lumos team.'}
        action={<RefreshButton label={isArabic ? 'تحديث' : 'Refresh'} loading={loading} onClick={onRefresh} />}
      />

      {error && <InlineError message={error} />}

      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm font-semibold text-card-foreground">{isArabic ? 'فريق لوموس' : 'Lumos Team'}</p>
          <p className="text-xs text-muted-foreground">{isArabic ? 'الرسائل هنا تأتي من بيانات العميل الحقيقية.' : 'Only real client messages are shown here.'}</p>
        </div>

        <div className="flex max-h-[440px] min-h-[300px] flex-col gap-4 overflow-y-auto bg-muted/30 p-4 sm:p-5">
          {loading && messages.length === 0 ? (
            <div className="m-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isArabic ? 'جار تحميل الرسائل...' : 'Loading messages...'}
            </div>
          ) : messages.length === 0 ? (
            <EmptyState icon={MessageSquare} text={isArabic ? 'ابدأ محادثة مع فريق لوموس.' : 'Start a conversation with the Lumos team.'} compact />
          ) : (
            messages.map((item) => {
              const fromClient = item.sender === 'client';
              return (
                <div key={item.id} className={cn('flex', fromClient ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%]',
                      fromClient
                        ? 'bg-[color:var(--profile-accent)] text-white'
                        : 'border border-border bg-card text-card-foreground',
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-4">
                      <span className={cn('text-xs font-semibold', fromClient ? 'text-white/85' : 'text-muted-foreground')}>
                        {fromClient ? displayName : item.sender_name || 'Lumos Team'}
                      </span>
                      {typeof item.is_read === 'boolean' && fromClient && (
                        <span className="text-xs text-white/70">{item.is_read ? 'Read' : 'Sent'}</span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">{item.message}</p>
                    {item.attachment_name && (
                      <p className={cn('mt-2 text-xs', fromClient ? 'text-white/75' : 'text-muted-foreground')}>
                        {item.attachment_name}
                      </p>
                    )}
                    <p className={cn('mt-2 text-xs', fromClient ? 'text-white/70' : 'text-muted-foreground')}>
                      {formatTime(item.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="client-message">
              {isArabic ? 'رسالة' : 'Message'}
            </label>
            <textarea
              id="client-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={2}
              className="min-h-12 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[color:var(--profile-accent)]"
              placeholder={isArabic ? 'اكتب رسالتك...' : 'Write your message...'}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !message.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isArabic ? 'إرسال' : 'Send'}
            </button>
          </div>
          {sendError && <p className="mt-3 text-sm text-destructive">{sendError}</p>}
        </div>
      </Card>
    </section>
  );
}

function FilesTab({
  assets,
  projects,
  loading,
  error,
  isArabic,
  onRefresh,
}: {
  assets: PortalAsset[];
  projects: Project[];
  loading: boolean;
  error: string | null;
  isArabic: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'review' | 'final' | 'brand' | 'project' | 'invoice' | 'document'>('all');
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const serviceById = useMemo(() => {
    const map = new Map<string, ProjectService>();
    projects.forEach((project) => project.services.forEach((service) => map.set(service.id, service)));
    return map;
  }, [projects]);
  const filteredAssets = useMemo(() => assets.filter((asset) => {
    const placements = getClientAssetPlacements(asset);
    const status = cleanText(asset.deliverable_status).toLowerCase();
    const category = cleanText(asset.category).toLowerCase();
    const type = cleanText(asset.file_type || asset.asset_type).toLowerCase();

    if (filter === 'review') return placements.appearsInActions || isReviewAsset(asset);
    if (filter === 'final') return ['approved', 'delivered', 'final'].includes(status);
    if (filter === 'brand') return placements.appearsInBrandKit || Boolean(asset.is_identity_asset);
    if (filter === 'project') return placements.appearsInProjectHub || Boolean(asset.project_id);
    if (filter === 'invoice') return /invoice|receipt|payment/.test(`${category} ${type}`);
    if (filter === 'document') return /pdf|doc|document|guide/.test(`${category} ${type} ${getFileName(asset).toLowerCase()}`);
    return true;
  }), [assets, filter]);

  const handleDownload = async (asset: PortalAsset) => {
    if (downloadingId) return;

    setDownloadingId(asset.id);
    setDownloadError(null);
    try {
      const url = await getAssetDownloadUrl(asset);
      if (!url) {
        setDownloadError(isArabic ? 'لا يمكن إنشاء رابط تحميل آمن لهذا الملف.' : 'Could not create a secure download link for this file.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <SkeletonGrid count={4} />;
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        title={isArabic ? 'مكتبة الملفات' : 'Files Library'}
        description={isArabic ? 'أرشيف منظم لكل الملفات المرئية للعميل والقابلة للتحميل.' : 'An organized archive of every client-visible downloadable file.'}
        action={<RefreshButton label={isArabic ? 'تحديث' : 'Refresh'} onClick={onRefresh} />}
      />

      {error && <InlineError message={error} />}
      {downloadError && <InlineError message={downloadError} />}

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: isArabic ? 'الكل' : 'All' },
          { id: 'review', label: isArabic ? 'تحتاج مراجعة' : 'Needs Review' },
          { id: 'final', label: isArabic ? 'النهائية' : 'Final Files' },
          { id: 'brand', label: isArabic ? 'أصول الهوية' : 'Brand Assets' },
          { id: 'project', label: isArabic ? 'ملفات المشروع' : 'Project Files' },
          { id: 'invoice', label: isArabic ? 'الفواتير' : 'Invoices' },
          { id: 'document', label: isArabic ? 'مستندات' : 'Documents' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id as typeof filter)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-semibold transition',
              filter === item.id
                ? 'bg-foreground text-background'
                : 'border border-border text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {assets.length === 0 ? (
        <EmptyState icon={FileText} text={isArabic ? 'ستظهر هنا الملفات المشتركة بينك وبين لوموس.' : 'Files shared by Lumos will appear here.'} />
      ) : filteredAssets.length === 0 ? (
        <EmptyState icon={Archive} text={isArabic ? 'لا توجد ملفات ضمن هذا الفلتر.' : 'No files match this filter.'} />
      ) : (
        <div className="grid gap-3">
          {filteredAssets.map((asset) => {
            const placements = clientAssetPlacementLabels(asset);
            const project = asset.project_id ? projectById.get(asset.project_id) : null;
            const service = asset.project_service_id ? serviceById.get(asset.project_service_id) : null;
            return (
            <Card key={asset.id} className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-card-foreground">{getFileName(asset)}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{getFileType(asset)}</span>
                    <span>{clientAssetStatusLabel(asset.deliverable_status) || asset.category || 'General'}</span>
                    <span>{formatFileSize(asset.file_size)}</span>
                    <span>{formatDate(asset.uploaded_at || asset.created_at)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{isArabic ? 'المشروع: ' : 'Project: '}{project ? getProjectDisplayName(project) : isArabic ? 'عام' : 'General'}</span>
                    {service ? <span>{isArabic ? 'الخدمة: ' : 'Service: '}{service.service_name}</span> : null}
                  </div>
                  {asset.note && <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{asset.note}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {isArabic ? 'يظهر في: ' : 'Appears in: '}
                    {placements.join(' · ')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownload(asset)}
                    disabled={downloadingId === asset.id}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadingId === asset.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    {isArabic ? 'معاينة' : 'Preview'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownload(asset)}
                    disabled={downloadingId === asset.id}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {downloadingId === asset.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {isArabic ? 'تحميل' : 'Download'}
                  </button>
                </div>
              </div>
            </Card>
          );})}
        </div>
      )}
    </section>
  );
}

function IdentityTab({
  identity,
  assets,
  profile,
  client,
  loading,
  error,
  isArabic,
  onRefresh,
}: {
  identity: ClientIdentity | null;
  assets: ClientIdentityAsset[];
  profile: ProfileData;
  client: ReturnType<typeof useClient>;
  loading: boolean;
  error: string | null;
  isArabic: boolean;
  onRefresh: () => Promise<void>;
}) {
  const logoCategories = ['logo_primary', 'logo_secondary', 'logo_icon', 'logo_monochrome', 'logo_light', 'logo_dark'];
  const colors = getIdentityColors(identity, profile);
  const typography = getIdentityTypography(identity);
  const socialLinks = getIdentitySocialLinks(identity, profile);
  const brandName = cleanText(identity?.brand_name) || getClientCompany(profile, client) || getDisplayName(profile, client);
  const tagline = cleanText(identity?.tagline) || getClientTagline(profile, client);
  const industry = cleanText(identity?.industry) || getClientIndustry(profile, client);
  const description = cleanText(identity?.brand_description) || cleanText(profile.bio);
  const brandFeel = cleanText(identity?.brand_feel) || getSignupString(profile, client, 'brand_feel');
  const brandVoice = cleanText(identity?.brand_voice);
  const targetAudience = cleanText(identity?.target_audience);
  const publicNotes = cleanText(identity?.public_notes);
  const usageNotes = cleanText(identity?.usage_notes);
  const brandGuideAssets = getIdentityAssetsByCategory(assets, ['brand_guide']);
  const paletteAssets = getIdentityAssetsByCategory(assets, ['color_palette']);
  const typographyAssets = getIdentityAssetsByCategory(assets, ['typography']);
  const socialIdentityAssets = getIdentityAssetsByCategory(assets, ['social_media_kit', 'social_avatar', 'social_cover']);
  const otherAssets = assets.filter((asset) => {
    const category = cleanText(asset.identity_category);
    return !logoCategories.includes(category)
      && !['brand_guide', 'color_palette', 'typography', 'social_media_kit', 'social_avatar', 'social_cover'].includes(category);
  });
  const hasIdentityData = Boolean(
    identity ||
    assets.length ||
    colors.length ||
    typography.length ||
    socialLinks.length ||
    brandFeel ||
    description ||
    brandVoice ||
    targetAudience ||
    publicNotes,
  );

  return (
    <section className="space-y-5">
      <SectionHeader
        title={isArabic ? 'حزمة الهوية' : 'Brand Kit'}
        description={isArabic ? 'الأصول النهائية المعتمدة فقط بعد نشرها من لوموس.' : 'Only final approved brand assets published by Lumos.'}
        action={
          <RefreshButton
            label={isArabic ? 'تحديث' : 'Refresh'}
            loading={loading}
            onClick={onRefresh}
          />
        }
      />

      {error && <InlineError message={isArabic ? 'تعذر تحميل بيانات الهوية.' : 'Could not load identity data.'} />}

      {!loading && !hasIdentityData && (
        <EmptyState
          icon={Palette}
          text={isArabic
            ? 'حزمة هويتك قيد التحضير. سننشر الأصول النهائية هنا عندما تكون جاهزة.'
            : 'Your Brand Kit is being prepared. We’ll publish your final assets here once they’re ready.'}
        />
      )}

      {loading ? (
        <SkeletonGrid count={4} />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--profile-accent)]">
                  {isArabic ? 'ملخص الهوية' : 'Brand Summary'}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-card-foreground">{brandName || '—'}</h2>
                {tagline && <p className="mt-2 text-sm leading-6 text-muted-foreground">{tagline}</p>}
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <InfoItem icon={Building2} label={isArabic ? 'الصناعة' : 'Industry'} value={industry} />
                  <InfoItem icon={UsersRound} label={isArabic ? 'الجمهور' : 'Audience'} value={targetAudience} />
                </div>
                {description ? (
                  <p className="mt-5 text-sm leading-7 text-muted-foreground">{description}</p>
                ) : (
                  <p className="mt-5 text-sm text-muted-foreground">
                    {isArabic ? 'لم تتم إضافة وصف للعلامة بعد.' : 'No brand description has been added yet.'}
                  </p>
                )}
              </div>
              <div className="border-t border-border bg-muted/30 p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="grid gap-3">
                  <IdentityMiniCard
                    title={isArabic ? 'المزاج' : 'Brand Mood'}
                    value={brandFeel}
                    fallback={isArabic ? 'لم يحدد بعد.' : 'Not defined yet.'}
                  />
                  <IdentityMiniCard
                    title={isArabic ? 'الصوت' : 'Brand Voice'}
                    value={brandVoice}
                    fallback={isArabic ? 'لم يحدد بعد.' : 'No voice notes yet.'}
                  />
                  <IdentityMiniCard
                    title={isArabic ? 'آخر تحديث' : 'Last Updated'}
                    value={identity?.updated_at ? formatDate(identity.updated_at) : ''}
                    fallback={isArabic ? 'لا يوجد سجل هوية بعد.' : 'No identity record yet.'}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader
              title={isArabic ? 'حزمة الشعارات' : 'Logo Kit'}
              description={isArabic ? 'إصدارات الشعار الرسمية المرفوعة من لوموس.' : 'Official logo versions uploaded by Lumos.'}
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {logoCategories.map((category) => (
                <LogoKitCard
                  key={category}
                  asset={getLogoAsset(assets, category)}
                  category={category}
                  isArabic={isArabic}
                />
              ))}
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
            <Card className="p-5 sm:p-6">
              <SectionHeader
                title={isArabic ? 'لوحة الألوان' : 'Color Palette'}
                description={isArabic ? 'انسخ أكواد الألوان لاستخدامها في كل القنوات.' : 'Copy approved color values for every channel.'}
              />
              {colors.length === 0 ? (
                <EmptyState
                  icon={Palette}
                  compact
                  text={isArabic ? 'لم تتم إضافة ألوان للهوية بعد.' : 'No brand colors have been added yet.'}
                />
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {colors.map((color, index) => (
                    <ColorCard key={`${color.hex}-${index}`} color={color} isArabic={isArabic} />
                  ))}
                </div>
              )}
              {paletteAssets.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {paletteAssets.map((asset) => (
                    <IdentityAssetRow key={asset.id} asset={asset} isArabic={isArabic} />
                  ))}
                </div>
              ) : null}
            </Card>

            <Card className="p-5 sm:p-6">
              <SectionHeader
                title={isArabic ? 'الخطوط' : 'Typography'}
                description={isArabic ? 'أنظمة الخطوط وتوجيهات استخدامها.' : 'Font systems and usage guidance.'}
              />
              {typography.length === 0 ? (
                <EmptyState
                  icon={Type}
                  compact
                  text={isArabic ? 'لم تتم إضافة خطوط الهوية بعد.' : 'No typography has been added yet.'}
                />
              ) : (
                <div className="mt-5 space-y-3">
                  {typography.map((item) => (
                    <TypographyCard key={item.label} item={item} />
                  ))}
                </div>
              )}
              {typographyAssets.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {typographyAssets.map((asset) => (
                    <IdentityAssetRow key={asset.id} asset={asset} isArabic={isArabic} />
                  ))}
                </div>
              ) : null}
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            <Card className="p-5 sm:p-6">
              <SectionHeader
                title={isArabic ? 'أصول العلامة' : 'Brand Assets'}
                description={isArabic ? 'الأدلة والقوالب والصور والأيقونات القابلة للتحميل.' : 'Guides, templates, images, and icons ready for download.'}
              />
              <div className="mt-5 space-y-3">
                {[...brandGuideAssets, ...otherAssets].length === 0 ? (
                  <EmptyState
                    icon={FolderOpen}
                    compact
                    text={isArabic ? 'لا توجد ملفات هوية مشتركة بعد.' : 'No identity files have been shared yet.'}
                  />
                ) : (
                  [...brandGuideAssets, ...otherAssets].map((asset) => (
                    <IdentityAssetRow key={asset.id} asset={asset} isArabic={isArabic} />
                  ))
                )}
              </div>
            </Card>

            <div className="space-y-5">
              <Card className="p-5 sm:p-6">
                <SectionHeader
                  title={isArabic ? 'الحضور الاجتماعي' : 'Social Identity'}
                  description={isArabic ? 'روابط الهوية والقنوات العامة.' : 'Public profile links and brand channels.'}
                />
                {socialLinks.length === 0 ? (
                  <p className="mt-5 text-sm text-muted-foreground">
                    {isArabic ? 'لم تتم إضافة روابط اجتماعية بعد.' : 'No social identity links have been added yet.'}
                  </p>
                ) : (
                  <div className="mt-5 space-y-2">
                    {socialLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.value}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-3 text-sm text-card-foreground transition hover:bg-muted"
                      >
                        <span className="capitalize">{link.label}</span>
                        <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
                          <span className="truncate">{link.value}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </span>
                      </a>
                    ))}
                  </div>
                )}
                {socialIdentityAssets.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {socialIdentityAssets.map((asset) => (
                      <IdentityAssetRow key={asset.id} asset={asset} isArabic={isArabic} />
                    ))}
                  </div>
                ) : null}
              </Card>

              <Card className="p-5 sm:p-6">
                <SectionHeader
                  title={isArabic ? 'إرشادات الاستخدام' : 'Notes / Guidelines'}
                  description={isArabic ? 'ملاحظات عامة مرئية للعميل فقط.' : 'Client-visible usage guidance from Lumos.'}
                />
                {publicNotes || usageNotes || brandVoice ? (
                  <div className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                    {publicNotes && <p>{publicNotes}</p>}
                    {usageNotes && <p>{usageNotes}</p>}
                    {brandVoice && <p>{brandVoice}</p>}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-muted-foreground">
                    {isArabic ? 'لا توجد إرشادات عامة بعد.' : 'No public brand guidelines have been added yet.'}
                  </p>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function IdentityMiniCard({ title, value, fallback }: { title: string; value?: string; fallback: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-card-foreground">{value || fallback}</p>
    </div>
  );
}

function LogoKitCard({
  asset,
  category,
  isArabic,
}: {
  asset: ClientIdentityAsset | null;
  category: string;
  isArabic: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<'copy' | 'download' | null>(null);
  const label = identityCategoryLabel(category, isArabic);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);

    if (!asset || !isIdentityImage(asset)) return () => {
      cancelled = true;
    };

    void getIdentityAssetSignedUrl(asset, 60 * 10).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [asset]);

  const copyLink = async () => {
    if (!asset) return;
    setBusy('copy');
    try {
      const url = await getIdentityAssetSignedUrl(asset, 60 * 10);
      if (url) await navigator.clipboard.writeText(url);
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    if (!asset) return;
    setBusy('download');
    try {
      const url = await getIdentityAssetSignedUrl(asset, 60 * 10);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
        {asset && previewUrl ? (
          <img src={previewUrl} alt={asset.file_name} className="h-full w-full object-contain p-4" />
        ) : asset ? (
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]">
            {isIdentityImage(asset) ? <ImageIcon className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
          </span>
        ) : (
          <p className="max-w-44 px-4 text-center text-sm text-muted-foreground">
            {isArabic ? 'لم يتم رفع هذا الملف بعد.' : 'No logo file has been shared yet.'}
          </p>
        )}
      </div>
      <div className="mt-3 min-w-0">
        <p className="text-sm font-semibold text-card-foreground">{label}</p>
        {asset ? (
          <>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                {isArabic ? 'نهائي' : 'Final'}
              </span>
              <span className="rounded-full bg-[color:var(--profile-accent)]/10 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--profile-accent)]">
                {isArabic ? 'منشور' : 'Published'}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{asset.file_name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(identityFileTypeLabel(asset) || 'FILE').toUpperCase()}
              {identityAssetTimestamp(asset) ? ` · ${formatDate(identityAssetTimestamp(asset))}` : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isArabic ? 'رُفع بواسطة لوموس' : `Uploaded by ${asset.uploaded_by_type === 'client' ? 'Client' : 'Lumos/Admin'}`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void download()}
                disabled={busy === 'download'}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                {isArabic ? 'تحميل' : 'Download'}
              </button>
              <button
                type="button"
                onClick={() => void copyLink()}
                disabled={busy === 'copy'}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                <Link2 className="h-3.5 w-3.5" />
                {isArabic ? 'نسخ الرابط' : 'Copy link'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function identityFileTypeLabel(asset: ClientIdentityAsset) {
  return asset.file_type || asset.asset_type || asset.file_name?.split('.').pop() || '';
}

function ColorCard({ color, isArabic }: { color: IdentityColor; isArabic: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
      <span className="h-14 w-14 shrink-0 rounded-2xl border border-border shadow-sm" style={{ backgroundColor: color.hex }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-card-foreground">{color.label || color.usage || 'Brand color'}</p>
        <p className="mt-1 text-xs text-muted-foreground">{color.usage || (isArabic ? 'استخدام عام' : 'General use')}</p>
        <p className="mt-1 font-mono text-sm text-card-foreground">{color.hex}</p>
      </div>
      <CopyValueButton value={color.hex} label={isArabic ? 'نسخ اللون' : 'Copy color'} />
    </div>
  );
}

function TypographyCard({ item }: { item: { label: string; value: string; notes?: string } }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
      <p className="mt-2 text-lg font-semibold text-card-foreground">{item.value}</p>
      {item.notes && <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.notes}</p>}
    </div>
  );
}

function IdentityAssetRow({ asset, isArabic }: { asset: ClientIdentityAsset; isArabic: boolean }) {
  const [busy, setBusy] = useState<'copy' | 'download' | null>(null);

  const copyLink = async () => {
    setBusy('copy');
    try {
      const url = await getIdentityAssetSignedUrl(asset, 60 * 10);
      if (url) await navigator.clipboard.writeText(url);
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    setBusy('download');
    try {
      const url = await getIdentityAssetSignedUrl(asset, 60 * 10);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-3 sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]">
        {isIdentityImage(asset) ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-card-foreground">{asset.file_name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {identityCategoryLabel(asset.identity_category, isArabic)}
          {identityAssetTimestamp(asset) ? ` · ${formatDate(identityAssetTimestamp(asset))}` : ''}
          {formatBytes(asset.file_size) ? ` · ${formatBytes(asset.file_size)}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void download()}
          disabled={busy === 'download'}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          {isArabic ? 'تحميل' : 'Download'}
        </button>
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={busy === 'copy'}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
        >
          <Copy className="h-3.5 w-3.5" />
          {isArabic ? 'نسخ' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function CopyValueButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
      aria-label={label}
      title={label}
    >
      {copied ? <CheckCircle2 className="h-4 w-4 text-[color:var(--profile-accent)]" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function AccountTab({
  profile,
  client,
  hasSecurityQuestion,
  saveState,
  isArabic,
  onEdit,
  onSignOut,
}: {
  profile: ProfileData;
  client: ReturnType<typeof useClient>;
  hasSecurityQuestion: boolean;
  saveState: string;
  isArabic: boolean;
  onEdit: () => void;
  onSignOut: () => Promise<void>;
}) {
  const brandColors = profile.brand_colors ?? client?.brand_colors ?? [];
  const socialLinks = profile.social_links ?? {};
  const brandFeel = getSignupString(profile, client, 'brand_feel');
  const services = formatServicesNeeded(getClientServices(profile, client), isArabic);
  const budgetRange = getSignupString(profile, client, 'budget_range');
  const timeline = getSignupString(profile, client, 'timeline');
  const projectSummary = getSignupString(profile, client, 'project_summary');

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[color:var(--profile-accent)]">
              {isArabic ? 'الحساب' : 'Account'}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-card-foreground">
              {isArabic ? 'معلومات الحساب' : 'Account Information'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
          >
            <Edit3 className="h-4 w-4" />
            {isArabic ? 'تعديل' : 'Edit'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoItem icon={Mail} label={isArabic ? 'البريد الإلكتروني' : 'Email'} value={client?.email || profile.email} readOnly />
          <InfoItem icon={UserCircle} label={isArabic ? 'اسم المستخدم' : 'Username'} value={client?.username || profile.username} readOnly />
          <InfoItem icon={Phone} label={isArabic ? 'الهاتف' : 'Phone'} value={getClientPhone(profile, client)} />
          <InfoItem icon={Building2} label={isArabic ? 'الشركة' : 'Company'} value={getClientCompany(profile, client)} />
          <InfoItem icon={Palette} label={isArabic ? 'المجال' : 'Industry'} value={getClientIndustry(profile, client)} />
          <InfoItem icon={Globe2} label={isArabic ? 'الموقع' : 'Website'} value={getClientWebsite(profile, client)} />
          <InfoItem icon={MapPin} label={isArabic ? 'الموقع الجغرافي' : 'Location'} value={profile.location} />
          <InfoItem icon={Clock3} label={isArabic ? 'المنطقة الزمنية' : 'Timezone'} value={profile.timezone} />
        </div>

        <div className="mt-5 rounded-2xl border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-card-foreground">
            {isArabic ? 'تفضيلات المشروع المحفوظة' : 'Saved Project Preferences'}
          </h3>
          {projectSummary && <p className="mt-3 text-sm leading-6 text-muted-foreground">{projectSummary}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoItem
              icon={FileText}
              label={isArabic ? 'الميزانية' : 'Budget'}
              value={budgetRange ? labelFromOptions(budgetRange, BUDGET_RANGE_OPTIONS, isArabic) : ''}
            />
            <InfoItem
              icon={Clock3}
              label={isArabic ? 'الجدول' : 'Timeline'}
              value={timeline ? labelFromOptions(timeline, TIMELINE_OPTIONS, isArabic) : ''}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {services.length === 0 ? (
              <span className="text-sm text-muted-foreground">{isArabic ? 'لا توجد خدمات محفوظة.' : 'No services saved.'}</span>
            ) : (
              services.map((service) => (
                <span key={service} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {service}
                </span>
              ))
            )}
          </div>
        </div>

        {saveState !== 'idle' && (
          <p className="mt-5 text-sm text-muted-foreground">
            {saveState === 'saving'
              ? isArabic
                ? 'جار الحفظ...'
                : 'Saving...'
              : saveState === 'saved'
                ? isArabic
                  ? 'تم الحفظ.'
                  : 'Saved.'
                : isArabic ? 'تعذر الحفظ.' : 'Could not save.'}
          </p>
        )}
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <p className="text-sm font-medium text-card-foreground">{isArabic ? 'التفضيلات' : 'Preferences'}</p>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-4">
              <span>{isArabic ? 'ظهور الملف' : 'Profile visibility'}</span>
              <span className="font-medium text-card-foreground">{profile.profile_visibility || 'private'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>{isArabic ? 'لون الواجهة' : 'Accent color'}</span>
              <span className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: profile.theme_accent || DEFAULT_ACCENT }} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-medium text-card-foreground">{isArabic ? 'تفاصيل الهوية' : 'Brand Details'}</p>
          {brandFeel && <p className="mt-3 text-sm leading-6 text-muted-foreground">{brandFeel}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {brandColors.length === 0 ? (
              <p className="text-sm text-muted-foreground">{isArabic ? 'لم تتم إضافة ألوان الهوية بعد.' : 'No brand colors added yet.'}</p>
            ) : (
              brandColors.map((color) => (
                <span key={color} className="h-9 w-9 rounded-full border border-border" style={{ backgroundColor: color }} title={color} />
              ))
            )}
          </div>
          <div className="mt-5 space-y-2">
            {Object.entries(socialLinks).filter(([, value]) => Boolean(value)).length === 0 ? (
              <p className="text-sm text-muted-foreground">{isArabic ? 'لا توجد روابط اجتماعية.' : 'No social links added.'}</p>
            ) : (
              Object.entries(socialLinks)
                .filter(([, value]) => Boolean(value))
                .map(([key, value]) => (
                  <a
                    key={key}
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {key}: {value}
                  </a>
                ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-medium text-card-foreground">{isArabic ? 'الأمان' : 'Security'}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {hasSecurityQuestion
              ? isArabic
                ? 'تم إعداد سؤال أمان. لا يتم عرض أو التحقق من الإجابة داخل المتصفح.'
                : 'Security question is set. The answer is not shown or verified in the browser.'
              : isArabic
                ? 'لا يوجد سؤال أمان محفوظ لهذا الحساب.'
                : 'No security question is saved for this account.'}
          </p>
        </Card>

        <Card className="p-5">
          <TelegramNotificationSettings clientId={client?.id} isArabic={isArabic} />
        </Card>

        <Card className="border-destructive/20 p-5">
          <p className="text-sm font-medium text-card-foreground">{isArabic ? 'منطقة الخروج' : 'Danger Zone'}</p>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            {isArabic ? 'تسجيل الخروج' : 'Sign out'}
          </button>
        </Card>
      </div>
    </section>
  );
}

function EditProfileDialog({
  open,
  profile,
  client,
  isArabic,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  profile: ProfileData;
  client: ReturnType<typeof useClient>;
  isArabic: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: EditableProfilePatch) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<ProfileDraft>(() => buildDraft(profile, client));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(buildDraft(profile, client));
      setErrors({});
    }
  }, [client, open, profile]);

  const updateDraft = <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (saving) return;

    const { patch, errors: nextErrors } = createProfilePatch(draft);
    setErrors(nextErrors);
    if (!patch) return;

    setSaving(true);
    try {
      const success = await onSave(patch);
      if (success) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{isArabic ? 'تعديل ملف العميل' : 'Edit Client Profile'}</DialogTitle>
          <DialogDescription>
            {isArabic
              ? 'يمكنك تعديل الحقول الآمنة فقط. البريد واسم المستخدم غير قابلين للتعديل.'
              : 'Only safe client-editable fields are available. Email and username remain read-only.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyInput label={isArabic ? 'البريد الإلكتروني' : 'Email'} value={client?.email || profile.email || ''} />
          <ReadOnlyInput label={isArabic ? 'اسم المستخدم' : 'Username'} value={client?.username || profile.username || ''} />
          <TextInput
            label={isArabic ? 'اسم العرض' : 'Display name'}
            value={draft.display_name}
            error={errors.display_name}
            onChange={(value) => updateDraft('display_name', value)}
          />
          <TextInput
            label={isArabic ? 'الهاتف' : 'Phone'}
            value={draft.phone_number}
            error={errors.phone_number}
            placeholder="+201001234567"
            onChange={(value) => updateDraft('phone_number', value)}
          />
          <TextInput
            label={isArabic ? 'الشركة' : 'Company'}
            value={draft.company_name}
            onChange={(value) => updateDraft('company_name', value)}
          />
          <TextInput
            label={isArabic ? 'المجال' : 'Industry'}
            value={draft.industry}
            onChange={(value) => updateDraft('industry', value)}
          />
          <TextInput
            label={isArabic ? 'الموقع' : 'Website'}
            value={draft.website}
            error={errors.website}
            placeholder="https://example.com"
            onChange={(value) => updateDraft('website', value)}
          />
          <TextInput
            label={isArabic ? 'الموقع الجغرافي' : 'Location'}
            value={draft.location}
            onChange={(value) => updateDraft('location', value)}
          />
          <TextInput
            label={isArabic ? 'المنطقة الزمنية' : 'Timezone'}
            value={draft.timezone}
            placeholder="Africa/Cairo"
            onChange={(value) => updateDraft('timezone', value)}
          />
          <SelectInput
            label={isArabic ? 'ظهور الملف' : 'Profile visibility'}
            value={draft.profile_visibility}
            onChange={(value) => updateDraft('profile_visibility', value)}
            options={[
              { value: 'private', label: isArabic ? 'خاص' : 'Private' },
              { value: 'team', label: isArabic ? 'الفريق فقط' : 'Team only' },
            ]}
          />
          <TextInput
            label={isArabic ? 'وصف مختصر' : 'Tagline'}
            value={draft.tagline}
            error={errors.tagline}
            className="sm:col-span-2"
            onChange={(value) => updateDraft('tagline', value)}
          />
          <TextArea
            label={isArabic ? 'نبذة' : 'Bio'}
            value={draft.bio}
            error={errors.bio}
            className="sm:col-span-2"
            onChange={(value) => updateDraft('bio', value)}
          />
          <TextArea
            label={isArabic ? 'إحساس الهوية' : 'Brand feel'}
            value={draft.brand_feel}
            error={errors.brand_feel}
            className="sm:col-span-2"
            onChange={(value) => updateDraft('brand_feel', value)}
          />
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-card-foreground">{isArabic ? 'ألوان الهوية' : 'Brand colors'}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">{isArabic ? 'لون الواجهة' : 'Accent'}</span>
              <input
                type="color"
                value={draft.theme_accent || DEFAULT_ACCENT}
                onChange={(event) => updateDraft('theme_accent', event.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-background p-1"
              />
            </label>
            {draft.brand_colors.map((color, index) => (
              <label key={index} className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {isArabic ? `لون ${index + 1}` : `Color ${index + 1}`}
                </span>
                <input
                  type="color"
                  value={color || DEFAULT_ACCENT}
                  onChange={(event) => {
                    const next = [...draft.brand_colors];
                    next[index] = event.target.value;
                    updateDraft('brand_colors', next);
                  }}
                  className="h-11 w-full rounded-2xl border border-border bg-background p-1"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold text-card-foreground">{isArabic ? 'روابط اجتماعية' : 'Social links'}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {SOCIAL_FIELDS.map((field) => (
              <TextInput
                key={field}
                label={field.charAt(0).toUpperCase() + field.slice(1)}
                value={draft.social_links[field] || ''}
                error={errors[`social_${field}`]}
                placeholder="https://"
                onChange={(value) =>
                  updateDraft('social_links', {
                    ...draft.social_links,
                    [field]: value,
                  })
                }
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isArabic ? 'حفظ التغييرات' : 'Save changes'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <article className={cn('rounded-2xl border border-border bg-card shadow-sm', className)}>{children}</article>;
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function RefreshButton({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading?: boolean;
  onClick: () => Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
      {label}
    </button>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  readOnly,
}: {
  icon: typeof Building2;
  label: string;
  value?: string | null;
  readOnly?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
        {readOnly && <span className="rounded-full bg-muted px-2 py-0.5 normal-case">{'Read-only'}</span>}
      </div>
      <p className="mt-2 break-words text-sm font-medium text-card-foreground">{value || '—'}</p>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon =
    item.icon === 'message'
      ? MessageSquare
      : item.icon === 'file'
        ? FileText
        : item.icon === 'project'
          ? FolderOpen
          : Bell;

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-card-foreground">{item.label}</p>
        {item.detail && <p className="line-clamp-1 text-xs text-muted-foreground">{item.detail}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{formatTime(item.createdAt)}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <span className="rounded-full bg-[color:var(--profile-accent)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--profile-accent)]">
      {getReadableStatus(status)}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  text,
  compact,
}: {
  icon: typeof FolderOpen;
  text: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card text-center', compact ? 'p-6' : 'p-8')}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-3xl border border-border bg-muted" />
      ))}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn('space-y-2', className)}>
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[color:var(--profile-accent)]"
      />
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function ReadOnlyInput({ label, value }: { label: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <input
        value={value}
        readOnly
        className="h-11 w-full cursor-not-allowed rounded-2xl border border-border bg-muted px-4 text-sm text-muted-foreground outline-none"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-[color:var(--profile-accent)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  error,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}) {
  return (
    <label className={cn('space-y-2', className)}>
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <textarea
        value={value}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[color:var(--profile-accent)]"
      />
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}
