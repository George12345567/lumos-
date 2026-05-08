import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Mail,
  MessageSquare,
  FolderOpen,
  ShieldCheck,
  Tag,
  Activity,
  BarChart3,
  Settings,
} from 'lucide-react';
import type { SidebarItem } from '../types';

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'overview', resource: 'dashboard', labelEn: 'Overview', labelAr: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'requests', resource: 'requests', labelEn: 'Requests', labelAr: 'الطلبات', icon: FileText, badgeKey: 'requests' },
  { id: 'clients', resource: 'clients', labelEn: 'Clients', labelAr: 'العملاء', icon: Users },
  { id: 'projects', resource: 'projects', labelEn: 'Projects', labelAr: 'المشاريع', icon: Briefcase },
  { id: 'contacts', resource: 'contacts', labelEn: 'Contacts', labelAr: 'جهات الاتصال', icon: Mail, badgeKey: 'contacts' },
  { id: 'messages', resource: 'messages', labelEn: 'Messages', labelAr: 'الرسائل', icon: MessageSquare, badgeKey: 'messages' },
  { id: 'files', resource: 'files', labelEn: 'Files', labelAr: 'الملفات', icon: FolderOpen },
  { id: 'team', resource: 'team', labelEn: 'Team & Permissions', labelAr: 'الفريق والصلاحيات', icon: ShieldCheck },
  { id: 'discounts', resource: 'discounts', labelEn: 'Discount Codes', labelAr: 'أكواد الخصم', icon: Tag },
  { id: 'audit', resource: 'audit_logs', labelEn: 'Audit Logs', labelAr: 'سجل النشاط', icon: Activity },
  { id: 'statistics', resource: 'statistics', labelEn: 'Statistics', labelAr: 'الإحصائيات', icon: BarChart3 },
  { id: 'settings', resource: 'settings', labelEn: 'Settings', labelAr: 'الإعدادات', icon: Settings },
];
