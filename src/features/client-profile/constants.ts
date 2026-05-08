import { LayoutDashboard, FolderOpen, MessageCircle, Settings, Briefcase, Palette } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TabId = 'overview' | 'projects' | 'messages' | 'files' | 'identity' | 'account';

export interface TabDef {
  id: TabId;
  label: string;
  labelAr: string;
  icon: LucideIcon;
}

/**
 * Primary sections of the simplified premium profile.
 * Official brand assets live in Identity. Safe editable profile details live
 * under Account.
 */
export const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', labelAr: 'المشاريع', icon: Briefcase },
  { id: 'messages', label: 'Messages', labelAr: 'الرسائل', icon: MessageCircle },
  { id: 'files', label: 'Files', labelAr: 'الملفات', icon: FolderOpen },
  { id: 'identity', label: 'Identity', labelAr: 'الهوية', icon: Palette },
  { id: 'account', label: 'Account', labelAr: 'الحساب', icon: Settings },
];

/**
 * Aliases for legacy URLs / FloatingDock action names. Keeps old bookmarks
 * (?tab=orders, ?tab=library, ?tab=brand) and dock CTAs from breaking.
 */
export const TAB_ALIASES: Record<string, TabId> = {
  orders: 'projects',
  library: 'files',
  brand: 'identity',
  brandkit: 'identity',
  identity: 'identity',
  home: 'overview',
};

export const DEFAULT_ACCENT = '#077F5B';

export const BRAND_COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#1e293b', '#64748b',
];

export const PRESET_TIMEZONES = [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
  'Europe/Berlin', 'Asia/Tokyo', 'Asia/Dubai', 'Australia/Sydney',
  'Asia/Riyadh', 'Africa/Cairo', 'Pacific/Auckland',
];

export const PROFILE_VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private', labelAr: 'خاص' },
  { value: 'team', label: 'Team only', labelAr: 'الفريق فقط' },
  { value: 'public', label: 'Public', labelAr: 'عام' },
];

export const AVATAR_PRESETS = [
  '/AVATARS/avatar-1.jpg',
  '/AVATARS/avatar-2.jpg',
  '/AVATARS/avatar-3.jpg',
  '/AVATARS/avatar-4.jpg',
  '/AVATARS/avatar-5.jpg',
  '/AVATARS/avatar-6.jpg',
  '/AVATARS/avatar-7.jpg',
  '/AVATARS/avatar-8.jpg',
  '/AVATARS/avatar-9.jpg',
];

export const COVER_GRADIENT_PRESETS = [
  'linear-gradient(135deg, #077F5B 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
  'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
];

export const STORAGE_BUCKET = 'client-assets';
export const STORAGE_PATHS = {
  avatar: 'profile-avatars',
  logo: 'brand-logos',
  cover: 'profile-covers',
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
