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
import {
  AlertTriangle,
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
  Sun,
  Type,
  UserCircle,
  UsersRound,
} from 'lucide-react';
import AvatarGenerator, { type AvatarStyle } from '@/components/shared/AvatarGenerator';
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
  useProfileError,
  useProfileLoading,
} from '@/context/AuthContext';
import { useAppearance } from '@/context/AppearanceContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
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
import { profileService, type ProfileData } from '@/services/profileService';
import type { Order } from '@/services/orderService';
import type { Notification } from '@/types/dashboard';
import { useClientProfile } from './hooks/useClientProfile';
import { useClientIdentity } from './hooks/useClientIdentity';
import { useNotifications } from './hooks/useNotifications';
import { useOrders } from './hooks/useOrders';
import { useClientPricingRequests } from './hooks/useClientPricingRequests';
import { usePortalData } from './hooks/usePortalData';
import { useProfileMutation } from './hooks/useProfileMutation';
import type { PricingRequest } from '@/types/dashboard';
import { DEFAULT_ACCENT, TAB_ALIASES } from './constants';

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
  { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', labelAr: 'المشاريع', icon: FolderOpen },
  { id: 'messages', label: 'Messages', labelAr: 'الرسائل', icon: MessageSquare },
  { id: 'files', label: 'Files', labelAr: 'الملفات', icon: FileText },
  { id: 'identity', label: 'Identity', labelAr: 'الهوية', icon: Palette },
  { id: 'account', label: 'Account', labelAr: 'الحساب', icon: Settings },
];

const SOCIAL_FIELDS = ['instagram', 'linkedin', 'behance', 'dribbble', 'twitter', 'github', 'facebook'] as const;

const SECTION_COPY: Record<Exclude<ProfileTab, 'overview'>, { title: string; titleAr: string; description: string; descriptionAr: string }> = {
  projects: {
    title: 'Projects',
    titleAr: 'المشاريع',
    description: 'Track active and completed Lumos projects.',
    descriptionAr: 'تابع مشاريع لوموس النشطة والمكتملة.',
  },
  messages: {
    title: 'Messages',
    titleAr: 'الرسائل',
    description: 'Continue your conversation with the Lumos team.',
    descriptionAr: 'تابع محادثتك مع فريق لوموس.',
  },
  files: {
    title: 'Files',
    titleAr: 'الملفات',
    description: 'Download private files shared for your account.',
    descriptionAr: 'حمّل الملفات الخاصة المشتركة مع حسابك.',
  },
  identity: {
    title: 'Brand Identity',
    titleAr: 'هوية العلامة',
    description: 'All your approved Lumos brand assets in one place.',
    descriptionAr: 'كل أصول هويتك المعتمدة من لوموس في مكان واحد.',
  },
  account: {
    title: 'Account',
    titleAr: 'الحساب',
    description: 'Manage safe profile, brand, and contact details.',
    descriptionAr: 'أدر بيانات الملف والهوية والتواصل الآمنة.',
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
  orders: Order[],
  messages: PortalMessage[],
  assets: PortalAsset[],
  notifications: Notification[],
): ActivityItem[] {
  const fromOrders = orders.slice(0, 4).map((order) => ({
    id: `project-${order.id}`,
    label: `Project ${getReadableStatus(order.status).toLowerCase()}`,
    detail: getProjectTitle(order),
    createdAt: order.updated_at || order.created_at,
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

  return [...fromNotifications, ...fromMessages, ...fromAssets, ...fromOrders]
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
  const { orders, loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useOrders(client?.id);
  const {
    requests: clientRequests,
    loading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useClientPricingRequests(client?.id);
  const { notifications } = useNotifications(client?.id);

  const [tab, setTab] = useState<ProfileTab>(() => normalizeProfileTab(searchParams.get('tab')) ?? 'overview');
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

  useEffect(() => {
    const nextTab = normalizeProfileTab(searchParams.get('tab'));
    if (nextTab && nextTab !== tab) setTab(nextTab);
  }, [searchParams, tab]);

  const handleTabChange = useCallback(
    (nextTab: ProfileTab) => {
      setTab(nextTab);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (nextTab === 'overview') {
          next.delete('tab');
        } else {
          next.set('tab', nextTab);
        }
        return next;
      }, { replace: true });

      window.requestAnimationFrame(() => {
        contentStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
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

  const loadingProfile = authLoading || (isAuthenticated && (profileLoading || loading) && !client);

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading profile" />
      </div>
    );
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
  const activeProjects = orders.filter((order) => {
    const status = (order.status ?? '').toLowerCase();
    return !['completed', 'cancelled', 'refunded'].includes(status);
  }).length;
  const unreadMessages = messages.filter((message) => message.sender !== 'client' && message.is_read === false).length;
  const profileProgress = typeof client.progress === 'number' ? client.progress : profile.progress ?? 0;
  const nextDelivery = orders
    .map(getProjectDelivery)
    .filter(Boolean)
    .sort()[0];
  const sharedAssets = assets.filter((asset) => !asset.is_identity_asset);
  const completion = getProfileCompletion(profile, client, Boolean(avatarUrl));
  const recentActivity = getActivityItems(orders, messages, sharedAssets, notifications);
  const packageName = cleanText(client.package_name || profile.package_name);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      dir={isArabic ? 'rtl' : 'ltr'}
      style={{ '--profile-accent': accent } as CSSProperties}
    >
      <EnhancedNavbar />
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

          {tab === 'overview' ? (
            <>
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
                location={cleanText(profile.location)}
                onAvatarChange={handleAvatarChange}
                onEdit={() => setEditorOpen(true)}
                packageName={packageName}
                tagline={tagline}
                username={username}
                website={getClientWebsite(profile, client)}
                coverGradient={profile.cover_gradient}
              />

              <StatsRow
                activeProjects={activeProjects}
                unreadMessages={unreadMessages}
                profileProgress={profileProgress}
                nextDelivery={nextDelivery}
                isArabic={isArabic}
              />
            </>
          ) : (
            <CompactSectionHeader
              activeTab={tab}
              avatarConfig={profile.avatar_config ?? client.avatar_config}
              avatarUrl={avatarUrl}
              displayName={displayName}
              initialsText={initials(displayName)}
              isArabic={isArabic}
              packageName={packageName}
              username={username}
            />
          )}

          {tab === 'overview' && (
            <OverviewTab
              profile={profile}
              client={client}
              completion={completion}
              recentActivity={recentActivity}
              nextStep={client.next_steps || profile.next_steps}
              isArabic={isArabic}
              onEdit={() => setEditorOpen(true)}
            />
          )}

          {tab === 'projects' && (
            <ProjectsTab
              orders={orders}
              loading={ordersLoading}
              error={ordersError}
              isArabic={isArabic}
              onRefresh={refetchOrders}
              pricingRequests={clientRequests}
              requestsLoading={requestsLoading}
              requestsError={requestsError}
              onRefreshRequests={refetchRequests}
            />
          )}

          {tab === 'messages' && (
            <MessagesTab
              messages={messages}
              loading={portalLoading}
              error={portalError}
              displayName={displayName}
              isArabic={isArabic}
              onRefresh={reloadPortal}
              onSendMessage={sendMessage}
            />
          )}

          {tab === 'files' && (
            <FilesTab
              assets={sharedAssets}
              loading={portalLoading}
              error={portalError}
              isArabic={isArabic}
              onRefresh={reloadPortal}
            />
          )}

          {tab === 'identity' && (
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
          )}

          {tab === 'account' && (
            <AccountTab
              profile={profile}
              client={client}
              hasSecurityQuestion={Boolean(client.security_question)}
              saveState={saveState}
              isArabic={isArabic}
              onEdit={() => setEditorOpen(true)}
              onSignOut={handleSignOut}
            />
          )}
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
          <p className="text-xs font-medium uppercase text-muted-foreground">Lumos</p>
          <h1 className="mt-1 text-lg font-semibold text-card-foreground">
            {isArabic ? 'بوابة العميل' : 'Client Portal'}
          </h1>
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--profile-accent)]/10 px-2.5 py-1 text-xs font-semibold text-[color:var(--profile-accent)]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {isArabic ? 'موثّق' : 'Verified'}
                  </span>
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
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : presetUrl && mode === 'preset' ? (
        <img src={presetUrl} alt="" className="h-full w-full object-cover" />
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
  orders,
  loading,
  error,
  isArabic,
  onRefresh,
  pricingRequests,
  requestsLoading,
  requestsError,
  onRefreshRequests,
}: {
  orders: Order[];
  loading: boolean;
  error: string | null;
  isArabic: boolean;
  onRefresh: () => Promise<void>;
  pricingRequests: PricingRequest[];
  requestsLoading: boolean;
  requestsError: string | null;
  onRefreshRequests: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="space-y-8">
      <ClientRequestsPanel
        requests={pricingRequests}
        loading={requestsLoading}
        error={requestsError}
        isArabic={isArabic}
        onRefresh={onRefreshRequests}
      />

      <div className="space-y-5">
      <SectionHeader
        title={isArabic ? 'المشاريع' : 'Projects'}
        description={isArabic ? 'طلباتك الحالية تظهر كمشاريع داخل البوابة.' : 'Orders are shown as client projects inside the portal.'}
        action={
          <RefreshButton label={isArabic ? 'تحديث' : 'Refresh'} onClick={onRefresh} />
        }
      />

      {error && <InlineError message={error} />}

      {loading ? (
        <SkeletonGrid count={3} />
      ) : orders.length === 0 ? (
        <EmptyState icon={FolderOpen} text={isArabic ? 'ستظهر مشاريعك هنا بمجرد أن يبدأ لوموس العمل معك.' : 'Your projects will appear here once Lumos starts working with you.'} />
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => {
            const progress = getProjectProgress(order);
            const open = expanded === order.id;

            return (
              <Card key={order.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-card-foreground">{getProjectTitle(order)}</h3>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {order.package_name || (isArabic ? 'باقة غير محددة' : 'Package not specified')}
                    </p>
                    {order.notes && <p className="mt-4 text-sm leading-6 text-muted-foreground">{order.notes}</p>}
                  </div>

                  <div className="grid min-w-48 gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-1">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {getProjectDelivery(order) ? formatDate(getProjectDelivery(order)) : isArabic ? 'تسليم غير محدد' : 'Delivery not scheduled'}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{isArabic ? 'التقدم' : 'Progress'}</span>
                    <span className="font-semibold text-card-foreground">{progress}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-[color:var(--profile-accent)]" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {open && (
                  <div className="mt-5 rounded-2xl bg-muted/50 p-4">
                    <p className="text-sm font-medium text-card-foreground">{isArabic ? 'الخدمات' : 'Services'}</p>
                    {order.selected_services?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.selected_services.map((service, index) => (
                          <span key={`${service.name}-${index}`} className="rounded-full bg-card px-3 py-1 text-xs font-medium text-card-foreground">
                            {service.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {isArabic ? 'لا يوجد ملخص خدمات متاح.' : 'No services summary is available.'}
                      </p>
                    )}
                    {order.admin_notes && (
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">{order.admin_notes}</p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : order.id)}
                  className="mt-5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  {open ? (isArabic ? 'إخفاء التفاصيل' : 'Hide Details') : isArabic ? 'عرض التفاصيل' : 'View Details'}
                </button>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </section>
  );
}

const REQUEST_STATUS_LABELS: Record<PricingRequest['status'], { en: string; ar: string; tone: string }> = {
  new: { en: 'New', ar: 'جديد', tone: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200' },
  reviewing: { en: 'In Review', ar: 'قيد المراجعة', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' },
  approved: { en: 'Approved', ar: 'معتمد', tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' },
  converted: { en: 'Converted', ar: 'محوّل', tone: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200' },
  rejected: { en: 'Needs revision', ar: 'يحتاج تعديل', tone: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200' },
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
  loading,
  error,
  isArabic,
  onRefresh,
}: {
  assets: PortalAsset[];
  loading: boolean;
  error: string | null;
  isArabic: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
        title={isArabic ? 'الملفات' : 'Files'}
        description={isArabic ? 'الملفات المشتركة معك من لوموس أو التي رفعتها لحسابك.' : 'Files shared by Lumos or uploaded for your account.'}
        action={<RefreshButton label={isArabic ? 'تحديث' : 'Refresh'} onClick={onRefresh} />}
      />

      {error && <InlineError message={error} />}
      {downloadError && <InlineError message={downloadError} />}

      {assets.length === 0 ? (
        <EmptyState icon={FileText} text={isArabic ? 'ستظهر هنا الملفات المشتركة بينك وبين لوموس.' : 'Files shared by you or Lumos will appear here.'} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assets.map((asset) => (
            <Card key={asset.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--profile-accent)]/10 text-[color:var(--profile-accent)]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold text-card-foreground">{getFileName(asset)}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{getFileType(asset)}</span>
                    <span>{asset.category || 'General'}</span>
                    <span>{formatFileSize(asset.file_size)}</span>
                    <span>{formatDate(asset.uploaded_at || asset.created_at)}</span>
                  </div>
                  {asset.note && <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{asset.note}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {asset.uploaded_by_type === 'client' ? (isArabic ? 'تم الرفع بواسطتك' : 'Uploaded by you') : isArabic ? 'تمت المشاركة بواسطة لوموس' : 'Shared by Lumos'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleDownload(asset)}
                disabled={downloadingId === asset.id}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloadingId === asset.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isArabic ? 'تحميل آمن' : 'Download'}
              </button>
            </Card>
          ))}
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
  const otherAssets = assets.filter((asset) => {
    const category = cleanText(asset.identity_category);
    return !logoCategories.includes(category) && category !== 'brand_guide';
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
        title={isArabic ? 'هوية العلامة' : 'Brand Identity'}
        description={isArabic ? 'كل أصول هويتك المعتمدة من لوموس في مكان واحد.' : 'All your approved Lumos brand assets in one place.'}
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
            ? 'ستظهر أصول هوية علامتك هنا بعد أن يرفعها فريق لوموس.'
            : 'Your brand identity assets will appear here once Lumos uploads them.'}
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
