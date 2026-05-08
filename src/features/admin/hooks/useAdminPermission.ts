import { useMemo } from 'react';
import { useIsAdmin, useSessionEmail } from '@/context/AuthContext';
import { can, canAccessResource } from '../permissions';
import type { AdminAction, AdminResource, AdminRole } from '../types';
import { useAdminAccess } from '../context/AdminAccessContext';

/**
 * Resolves the current user's admin role from auth state.
 *
 * Today: master admin email → 'owner', other admins → 'admin'. There is no
 * `team_members` lookup wired to the active session yet — that requires
 * backend RBAC (see RBAC_BACKEND_TODO.md). Until then everyone who passes
 * AdminRoute is treated as `owner`.
 */
export function useAdminRole(): AdminRole {
  const access = useAdminAccess();
  const isAdmin = useIsAdmin();
  const email = useSessionEmail();
  return useMemo<AdminRole>(() => {
    if (access.allowed) return access.role;
    if (!isAdmin) return 'viewer';
    void email;
    return 'owner';
  }, [access.allowed, access.role, isAdmin, email]);
}

export function useAdminPermission(resource: AdminResource, action: AdminAction = 'view'): boolean {
  const access = useAdminAccess();
  const role = useAdminRole();
  return useMemo(() => {
    if (access.allowed) return access.canAccess(resource, action);
    return can(role, action, resource);
  }, [access, role, action, resource]);
}

export function useCanAccessResource(resource: AdminResource): boolean {
  const access = useAdminAccess();
  const role = useAdminRole();
  return useMemo(() => {
    if (access.allowed) return access.canAccessResource(resource);
    return canAccessResource(role, resource);
  }, [access, role, resource]);
}
