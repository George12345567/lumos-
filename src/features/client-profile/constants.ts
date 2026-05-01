import { LayoutDashboard, Sparkles, Folder, MessageCircle, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TabId = 'overview' | 'brand' | 'library' | 'messages' | 'account';

export interface TabDef {
  id: TabId;
  label: string;
  labelAr: string;
  icon: LucideIcon;
}

export const TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', labelAr: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'brand', label: 'Brand', labelAr: 'الهوية', icon: Sparkles },
  { id: 'library', label: 'Library', labelAr: 'المكتبة', icon: Folder },
  { id: 'messages', label: 'Messages', labelAr: 'المحادثة', icon: MessageCircle },
  { id: 'account', label: 'Account', labelAr: 'الحساب', icon: Settings },
];

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

export const STORAGE_BUCKET = 'client-assets';
export const STORAGE_PATHS = {
  avatar: 'profile-avatars',
  logo: 'brand-logos',
  cover: 'profile-covers',
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
