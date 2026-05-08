import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAdminPermission } from '../hooks/useAdminPermission';
import type { AdminAction, AdminResource } from '../types';

/**
 * Hides children unless the current admin has the requested permission.
 * Frontend gate only — real protection is Supabase RLS.
 */
export function PermissionGate({
  resource,
  action = 'view',
  children,
  fallback,
}: {
  resource: AdminResource;
  action?: AdminAction;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const allowed = useAdminPermission(resource, action);
  if (!allowed) return <>{fallback ?? null}</>;
  return <>{children}</>;
}

export function NoPermissionPlaceholder({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 dark:border-white/10 p-10 flex flex-col items-center text-center gap-2">
      <span className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
        <Lock className="w-5 h-5" />
      </span>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Restricted</p>
      <p className="text-xs text-slate-500 max-w-xs">{message}</p>
    </div>
  );
}
