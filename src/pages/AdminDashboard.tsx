import { AdminShell } from '@/features/admin/components/AdminShell';
import { AdminAccessProvider } from '@/features/admin/context/AdminAccessContext';

/**
 * /lumos-admin entrypoint.
 *
 * The dashboard implementation lives under `src/features/admin/`. This page
 * file stays small on purpose — it is the route component referenced by
 * <AdminRoute> in App.tsx, and AdminRoute already enforces auth + master
 * admin gating. Real authorisation belongs to Supabase RLS, not this UI.
 */
export default function AdminDashboard() {
  return (
    <AdminAccessProvider>
      <AdminShell />
    </AdminAccessProvider>
  );
}
