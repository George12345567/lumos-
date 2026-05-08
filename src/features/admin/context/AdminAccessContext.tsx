import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { can as roleCan, canAccessResource as roleCanAccessResource } from '../permissions';
import type { AdminAction, AdminResource, AdminRole } from '../types';
import type { Client, TeamMember } from '@/types/dashboard';
import { resolveAdminAccess } from '@/services/adminAccessService';

type PermissionBlob = Record<string, Record<string, boolean>>;

interface AdminAccessContextValue {
  loading: boolean;
  allowed: boolean;
  role: AdminRole;
  client: Client | null;
  teamMember: TeamMember | null;
  email: string | null;
  refresh: () => Promise<void>;
  canAccess: (resource: AdminResource, action?: AdminAction) => boolean;
  canAccessResource: (resource: AdminResource) => boolean;
}

const fallback: AdminAccessContextValue = {
  loading: false,
  allowed: false,
  role: 'viewer',
  client: null,
  teamMember: null,
  email: null,
  refresh: async () => {},
  canAccess: () => false,
  canAccessResource: () => false,
};

const AdminAccessContext = createContext<AdminAccessContextValue>(fallback);

function explicitPermission(
  permissions: TeamMember['permissions'] | undefined | null,
  resource: AdminResource,
  action: AdminAction,
): boolean | null {
  const blob = permissions as PermissionBlob | null | undefined;
  const value = blob?.[resource]?.[action];
  return typeof value === 'boolean' ? value : null;
}

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [role, setRole] = useState<AdminRole>('viewer');
  const [client, setClient] = useState<Client | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const access = await resolveAdminAccess();
      setAllowed(access.allowed);
      setRole(access.role);
      setClient(access.client);
      setTeamMember(access.teamMember);
      setEmail(access.email);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const canAccess = useCallback(
    (resource: AdminResource, action: AdminAction = 'view') => {
      if (!allowed) return false;
      if (role === 'owner' || role === 'admin') return roleCan(role, action, resource);

      const explicit = explicitPermission(teamMember?.permissions, resource, action);
      if (explicit !== null) return explicit;

      return roleCan(role, action, resource);
    },
    [allowed, role, teamMember?.permissions],
  );

  const canAccessResource = useCallback(
    (resource: AdminResource) => {
      if (!allowed) return false;
      if (role === 'owner' || role === 'admin') return roleCanAccessResource(role, resource);
      const explicitView = explicitPermission(teamMember?.permissions, resource, 'view');
      if (explicitView !== null) return explicitView;
      return roleCanAccessResource(role, resource);
    },
    [allowed, role, teamMember?.permissions],
  );

  const value = useMemo<AdminAccessContextValue>(() => ({
    loading,
    allowed,
    role,
    client,
    teamMember,
    email,
    refresh,
    canAccess,
    canAccessResource,
  }), [allowed, canAccess, canAccessResource, client, email, loading, refresh, role, teamMember]);

  return (
    <AdminAccessContext.Provider value={value}>
      {children}
    </AdminAccessContext.Provider>
  );
}

export function useAdminAccess() {
  return useContext(AdminAccessContext);
}
