import { useMemo } from 'react';
import { useIsAdmin, useSessionEmail } from '@/context/AuthContext';
import { can, canAccessResource } from '../permissions';
import type { AdminAction, AdminResource, AdminRole } from '../types';

/**
 * Resolves the current user's admin role from auth state.
 *
 * Today: master admin email → 'owner', other admins → 'admin'. There is no
 * `team_members` lookup wired to the active session yet — that requires
 * backend RBAC (see RBAC_BACKEND_TODO.md). Until then everyone who passes
 * AdminRoute is treated as `owner`.
 */
export function useAdminRole(): AdminRole {
  const isAdmin = useIsAdmin();
  const email = useSessionEmail();
  return useMemo<AdminRole>(() => {
    if (!isAdmin) return 'viewer';
    void email;
    return 'owner';
  }, [isAdmin, email]);
}

export function useAdminPermission(resource: AdminResource, action: AdminAction = 'view'): boolean {
  const role = useAdminRole();
  return useMemo(() => can(role, action, resource), [role, action, resource]);
}

export function useCanAccessResource(resource: AdminResource): boolean {
  const role = useAdminRole();
  return useMemo(() => canAccessResource(role, resource), [role, resource]);
}
