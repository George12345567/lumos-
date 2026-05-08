import { useEffect, useMemo, useState } from 'react';
import { Check, Info, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { Client, TeamMember } from '@/types/dashboard';
import { AdminDrawer } from './AdminDrawer';
import { SoftBadge, SoftButton, SoftCard } from './primitives';
import {
  ROLE_LABELS,
  RESOURCE_LABELS,
  ACTION_LABELS,
  ROLE_PERMISSIONS,
} from '../permissions';
import type { AdminAction, AdminResource, AdminRole } from '../types';

const TEAM_ROLES: TeamMember['role'][] = ['admin', 'manager', 'sales', 'designer'];
const PRESET_ROLES: AdminRole[] = ['owner', 'admin', 'manager', 'sales', 'designer', 'support', 'viewer'];
const MATRIX_RESOURCES: AdminResource[] = [
  'requests', 'clients', 'projects', 'contacts', 'messages', 'files',
  'team', 'discounts', 'audit_logs', 'statistics', 'settings',
];
const MATRIX_ACTIONS: AdminAction[] = ['view', 'create', 'edit', 'assign', 'delete', 'manage_permissions'];

type PermissionMap = Record<string, Record<string, boolean>>;

export function permissionsForRole(role: AdminRole): PermissionMap {
  const out: PermissionMap = {};
  const map = ROLE_PERMISSIONS[role] || {};
  for (const r of MATRIX_RESOURCES) {
    out[r] = {};
    const perms = map[r] || {};
    for (const a of MATRIX_ACTIONS) {
      out[r][a] = perms[a] === true;
    }
  }
  return out;
}

interface LinkClientToTeamModalProps {
  open: boolean;
  client: Client | null;
  existingMember: TeamMember | null;
  onClose: () => void;
  onSubmit: (input: {
    role: TeamMember['role'];
    job_title: string;
    is_active: boolean;
    permissions: PermissionMap;
  }) => Promise<void> | void;
  canManagePermissions: boolean;
}

export function LinkClientToTeamModal({
  open,
  client,
  existingMember,
  onClose,
  onSubmit,
  canManagePermissions,
}: LinkClientToTeamModalProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [role, setRole] = useState<TeamMember['role']>(existingMember?.role || 'manager');
  const [jobTitle, setJobTitle] = useState(existingMember?.job_title || '');
  const [isActive, setIsActive] = useState(existingMember?.is_active ?? true);
  const [permissions, setPermissions] = useState<PermissionMap>(
    (existingMember?.permissions as PermissionMap) || permissionsForRole(role as AdminRole),
  );
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'role' | 'permissions'>('role');

  // Re-sync from props each time the modal opens / target changes.
  useEffect(() => {
    if (!open) return;
    const nextRole = existingMember?.role || 'manager';
    setRole(nextRole);
    setJobTitle(existingMember?.job_title || '');
    setIsActive(existingMember?.is_active ?? true);
    setPermissions(
      (existingMember?.permissions as PermissionMap) || permissionsForRole(nextRole as AdminRole),
    );
    setTab('role');
  }, [open, existingMember?.id, existingMember?.role, existingMember?.job_title, existingMember?.is_active, existingMember?.permissions]);

  const totalGranted = useMemo(
    () => Object.values(permissions).reduce((s, r) => s + Object.values(r).filter(Boolean).length, 0),
    [permissions],
  );

  const togglePerm = (resource: string, action: string) => {
    setPermissions((p) => ({
      ...p,
      [resource]: { ...(p[resource] || {}), [action]: !p[resource]?.[action] },
    }));
  };

  const applyPreset = (presetRole: AdminRole) => {
    setPermissions(permissionsForRole(presetRole));
  };

  const handleSubmit = async () => {
    setBusy(true);
    try {
      await onSubmit({
        role,
        job_title: jobTitle.trim(),
        is_active: isActive,
        permissions,
      });
    } finally {
      setBusy(false);
    }
  };

  if (!client) return null;
  const initial = (client.company_name || client.username || client.email || '?').slice(0, 1).toUpperCase();
  const alreadyLinked = !!existingMember;

  return (
    <AdminDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={alreadyLinked ? t('إدارة وصول الموظف', 'Manage employee access') : t('إضافة كعضو فريق', 'Add as team member')}
      subtitle={client.email || client.company_name || undefined}
      width="xl"
      footer={
        <>
          <SoftButton variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            {t('إلغاء', 'Cancel')}
          </SoftButton>
          <SoftButton variant="primary" size="sm" onClick={handleSubmit} disabled={busy}>
            {busy
              ? t('جارٍ الحفظ…', 'Saving…')
              : alreadyLinked
                ? t('تحديث الوصول', 'Update access')
                : t('إضافة', 'Add member')}
          </SoftButton>
        </>
      }
    >
      <div className="space-y-5">
        <SoftCard className="p-4 flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold flex items-center justify-center shrink-0">
            {client.avatar_url ? (
              <img src={client.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : initial}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{client.company_name || client.username || client.email}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {client.full_contact_name || client.email}
            </p>
          </div>
          {alreadyLinked ? (
            <SoftBadge tone="emerald" icon={ShieldCheck}>
              {t('عضو بالفعل', 'Already a member')}
            </SoftBadge>
          ) : null}
        </SoftCard>

        {alreadyLinked ? (
          <SoftCard className="p-3 ring-1 ring-emerald-100 bg-emerald-50/40">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-900">
                {t(
                  'هذا العميل مرتبط بحساب فريق موجود. التغييرات هنا ستحدّث ذلك الحساب بدلاً من إنشاء حساب مكرر.',
                  'This client is already linked to a team member. Changes here update that record instead of creating a duplicate.',
                )}
              </p>
            </div>
          </SoftCard>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {(['role', 'permissions'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 h-8 rounded-full text-xs font-semibold ${
                tab === id ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300'
              }`}
            >
              {id === 'role' ? t('الدور والوظيفة', 'Role & job') : t('الصلاحيات', 'Permissions')}
            </button>
          ))}
        </div>

        {tab === 'role' && (
          <SoftCard className="p-5 space-y-3">
            <FormRow label={t('المسمى الوظيفي', 'Job title')}>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t('مثلاً: مدير حسابات', 'e.g. Account manager')}
                className={inputCls}
              />
            </FormRow>
            <FormRow label={t('الدور', 'Role')}>
              <select
                value={role}
                onChange={(e) => {
                  const nextRole = e.target.value as TeamMember['role'];
                  setRole(nextRole);
                  setPermissions(permissionsForRole(nextRole as AdminRole));
                }}
                className={inputCls}
              >
                {TEAM_ROLES.map((r) => (
                  <option key={r} value={r}>{isAr ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}</option>
                ))}
              </select>
            </FormRow>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 pt-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {t('نشط', 'Active')}
            </label>
          </SoftCard>
        )}

        {tab === 'permissions' && (
          <SoftCard className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-bold text-foreground inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {t(`${totalGranted} صلاحية مفعّلة`, `${totalGranted} permissions granted`)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {t(
                    'تحكم في الواجهة. التطبيق الحقيقي يحدث في Supabase RLS.',
                    'Controls the admin UI. Real enforcement happens in Supabase RLS.',
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] text-slate-500 self-center mr-2">
                  {t('قوالب جاهزة:', 'Presets:')}
                </span>
                {PRESET_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={!canManagePermissions}
                    onClick={() => applyPreset(r)}
                    className="px-2.5 h-7 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {isAr ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}
                  </button>
                ))}
              </div>
            </div>

            {!canManagePermissions ? (
              <p className="text-[11px] text-amber-700 bg-amber-50 ring-1 ring-amber-100 rounded-2xl px-3 py-2">
                {t('ليس لديك صلاحية إدارة الصلاحيات.', 'You do not have permission to manage permissions.')}
              </p>
            ) : null}

            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-500 sticky left-0 bg-white dark:bg-slate-900">
                      {t('المورد', 'Resource')}
                    </th>
                    {MATRIX_ACTIONS.map((a) => (
                      <th key={a} className="p-2 font-semibold text-slate-500 text-center">
                        {isAr ? ACTION_LABELS[a].ar : ACTION_LABELS[a].en}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX_RESOURCES.map((r) => (
                    <tr key={r} className="border-b border-emerald-900/5">
                      <td className="p-2 font-semibold text-slate-700 sticky left-0 bg-white dark:bg-slate-900">
                        {isAr ? RESOURCE_LABELS[r].ar : RESOURCE_LABELS[r].en}
                      </td>
                      {MATRIX_ACTIONS.map((a) => {
                        const v = !!permissions[r]?.[a];
                        return (
                          <td key={a} className="p-2 text-center">
                            <button
                              type="button"
                              disabled={!canManagePermissions}
                              onClick={() => togglePerm(r, a)}
                              className={`w-7 h-7 rounded-xl inline-flex items-center justify-center transition disabled:opacity-50 ${
                                v ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {v ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SoftCard>
        )}
      </div>
    </AdminDrawer>
  );
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200';

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
