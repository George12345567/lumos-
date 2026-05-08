import type { LucideIcon } from 'lucide-react';

/**
 * Admin role hierarchy.
 *
 * `owner` is the master admin (gated by VITE_MASTER_ADMIN_EMAIL). Everyone
 * else maps from `team_members.role` plus a synthetic `viewer` row for
 * sandboxing future read-only access. These values must mirror what the
 * backend understands once Supabase RLS is hooked up — the frontend gate
 * is UX-only.
 */
export type AdminRole = 'owner' | 'admin' | 'manager' | 'sales' | 'designer' | 'support' | 'viewer';

export type AdminResource =
  | 'dashboard'
  | 'overview'
  | 'requests'
  | 'clients'
  | 'projects'
  | 'contacts'
  | 'messages'
  | 'files'
  | 'identity'
  | 'team'
  | 'discounts'
  | 'audit_logs'
  | 'statistics'
  | 'settings';

export type AdminAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'assign'
  | 'delete'
  | 'archive'
  | 'upload'
  | 'download'
  | 'export'
  | 'manage_permissions';

export interface SidebarItem {
  id: AdminSection;
  resource: AdminResource;
  labelEn: string;
  labelAr: string;
  icon: LucideIcon;
  badgeKey?: 'requests' | 'contacts' | 'messages';
}

export type AdminSection =
  | 'overview'
  | 'requests'
  | 'clients'
  | 'projects'
  | 'contacts'
  | 'messages'
  | 'files'
  | 'team'
  | 'discounts'
  | 'audit'
  | 'statistics'
  | 'settings';
