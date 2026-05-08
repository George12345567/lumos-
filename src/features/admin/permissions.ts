import type { AdminAction, AdminResource, AdminRole } from './types';

type ResourcePerms = Partial<Record<AdminAction, true>>;
type RoleMatrix = Partial<Record<AdminResource, ResourcePerms>>;

const ALL: ResourcePerms = {
  view: true,
  create: true,
  edit: true,
  assign: true,
  delete: true,
  archive: true,
  export: true,
  manage_permissions: true,
};

const VIEW_ONLY: ResourcePerms = { view: true };
const VIEW_EDIT: ResourcePerms = { view: true, edit: true };
const VIEW_CREATE_EDIT: ResourcePerms = { view: true, create: true, edit: true };

/**
 * Frontend-only permission matrix. The truth source for security is Supabase
 * RLS — see RBAC_BACKEND_TODO.md. This map controls which UI affordances are
 * visible/enabled, not whether a request will succeed against the database.
 */
export const ROLE_PERMISSIONS: Record<AdminRole, RoleMatrix> = {
  owner: {
    dashboard: ALL,
    requests: ALL,
    clients: ALL,
    projects: ALL,
    contacts: ALL,
    messages: ALL,
    files: ALL,
    team: ALL,
    discounts: ALL,
    audit_logs: ALL,
    statistics: ALL,
    settings: ALL,
  },
  admin: {
    dashboard: ALL,
    requests: ALL,
    clients: ALL,
    projects: ALL,
    contacts: ALL,
    messages: ALL,
    files: ALL,
    team: { view: true, create: true, edit: true, assign: true, archive: true },
    discounts: ALL,
    audit_logs: VIEW_ONLY,
    statistics: VIEW_ONLY,
    settings: VIEW_ONLY,
  },
  manager: {
    dashboard: VIEW_ONLY,
    requests: { view: true, edit: true, assign: true, archive: true },
    clients: VIEW_EDIT,
    projects: VIEW_EDIT,
    contacts: VIEW_CREATE_EDIT,
    messages: VIEW_CREATE_EDIT,
    files: VIEW_ONLY,
    team: VIEW_ONLY,
    discounts: VIEW_ONLY,
    audit_logs: VIEW_ONLY,
    statistics: VIEW_ONLY,
  },
  sales: {
    dashboard: VIEW_ONLY,
    requests: { view: true, edit: true, assign: true },
    clients: VIEW_EDIT,
    projects: VIEW_ONLY,
    contacts: VIEW_CREATE_EDIT,
    messages: VIEW_CREATE_EDIT,
    statistics: VIEW_ONLY,
  },
  designer: {
    dashboard: VIEW_ONLY,
    clients: VIEW_ONLY,
    projects: VIEW_EDIT,
    files: VIEW_CREATE_EDIT,
  },
  support: {
    dashboard: VIEW_ONLY,
    clients: VIEW_ONLY,
    contacts: VIEW_CREATE_EDIT,
    messages: VIEW_CREATE_EDIT,
  },
  viewer: {
    dashboard: VIEW_ONLY,
    requests: VIEW_ONLY,
    clients: VIEW_ONLY,
    projects: VIEW_ONLY,
    contacts: VIEW_ONLY,
    statistics: VIEW_ONLY,
  },
};

export function can(role: AdminRole, action: AdminAction, resource: AdminResource): boolean {
  return ROLE_PERMISSIONS[role]?.[resource]?.[action] === true;
}

export function canAccessResource(role: AdminRole, resource: AdminResource): boolean {
  return Boolean(ROLE_PERMISSIONS[role]?.[resource]);
}

export const ROLE_LABELS: Record<AdminRole, { en: string; ar: string }> = {
  owner: { en: 'Owner', ar: 'المالك' },
  admin: { en: 'Admin', ar: 'مسؤول' },
  manager: { en: 'Manager', ar: 'مدير' },
  sales: { en: 'Sales', ar: 'مبيعات' },
  designer: { en: 'Designer', ar: 'مصمم' },
  support: { en: 'Support', ar: 'دعم' },
  viewer: { en: 'Viewer', ar: 'مشاهد' },
};

export const RESOURCE_LABELS: Record<AdminResource, { en: string; ar: string }> = {
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم' },
  requests: { en: 'Requests', ar: 'الطلبات' },
  clients: { en: 'Clients', ar: 'العملاء' },
  projects: { en: 'Projects', ar: 'المشاريع' },
  contacts: { en: 'Contacts', ar: 'جهات الاتصال' },
  messages: { en: 'Messages', ar: 'الرسائل' },
  files: { en: 'Files', ar: 'الملفات' },
  team: { en: 'Team', ar: 'الفريق' },
  discounts: { en: 'Discounts', ar: 'الخصومات' },
  audit_logs: { en: 'Audit Logs', ar: 'سجل النشاط' },
  statistics: { en: 'Statistics', ar: 'الإحصائيات' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
};

export const ACTION_LABELS: Record<AdminAction, { en: string; ar: string }> = {
  view: { en: 'View', ar: 'عرض' },
  create: { en: 'Create', ar: 'إنشاء' },
  edit: { en: 'Edit', ar: 'تعديل' },
  assign: { en: 'Assign', ar: 'تعيين' },
  delete: { en: 'Delete', ar: 'حذف' },
  archive: { en: 'Archive', ar: 'أرشفة' },
  export: { en: 'Export', ar: 'تصدير' },
  manage_permissions: { en: 'Manage permissions', ar: 'إدارة الصلاحيات' },
};
