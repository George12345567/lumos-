import { LayoutDashboard, Folder, Sparkles, Settings } from 'lucide-react';
import type React from 'react';

export type TabId = 'home' | 'library' | 'brand' | 'account';

export interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
    hint: string;
}

export const COVER_GRADIENT_MAP: Record<string, string> = {
    'from-indigo-600 via-purple-600 to-pink-500': 'linear-gradient(135deg, #818cf8 0%, #a78bfa 48%, #f9a8d4 100%)',
    'from-slate-800 via-slate-700 to-slate-600': 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 48%, #e2e8f0 100%)',
    'from-emerald-500 via-teal-600 to-cyan-600': 'linear-gradient(135deg, #6ee7b7 0%, #5eead4 52%, #67e8f9 100%)',
    'from-orange-500 via-pink-500 to-rose-500': 'linear-gradient(135deg, #fdba74 0%, #f9a8d4 52%, #fda4af 100%)',
    'from-violet-600 via-indigo-600 to-blue-600': 'linear-gradient(135deg, #c4b5fd 0%, #a5b4fc 52%, #93c5fd 100%)',
};

export const TABS: Tab[] = [
    { id: 'home', label: 'Home', icon: LayoutDashboard, hint: 'Identity, priorities, and action surfaces' },
    { id: 'library', label: 'Library', icon: Folder, hint: 'Designs, files, and review-ready assets' },
    { id: 'brand', label: 'Brand Studio', icon: Sparkles, hint: 'Logo, palette, and visual direction' },
    { id: 'account', label: 'Account', icon: Settings, hint: 'Preferences, security, and system controls' },
];

export const AVATAR_IMAGES = [
    '/AVATARS/10491830.jpg',
    '/AVATARS/9434619.jpg',
    '/AVATARS/9439678.jpg',
    '/AVATARS/androgynous-avatar-non-binary-queer-person(1).jpg',
    '/AVATARS/androgynous-avatar-non-binary-queer-person.jpg',
];

export const PRESET_TIMEZONES = [
    'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
    'Europe/Berlin', 'Asia/Tokyo', 'Asia/Dubai', 'Australia/Sydney',
    'Asia/Riyadh', 'Africa/Cairo', 'Pacific/Auckland',
];

export const BRAND_COLOR_PRESETS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#1e293b', '#64748b',
];
