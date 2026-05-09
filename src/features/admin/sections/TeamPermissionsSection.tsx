import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Info, Link as LinkIcon, Mail, Phone, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import SafeAvatarImage from '@/components/shared/SafeAvatarImage';
import type { Client, TeamMember } from '@/types/dashboard';
import { useTeamMembers } from '../data/useTeamMembers';
import {
  EmptyState,
  SectionHeader,
  SoftBadge,
  SoftButton,
  SoftCard,
} from '../components/primitives';
import { AdminDrawer } from '../components/AdminDrawer';
import { useAdminPermission } from '../hooks/useAdminPermission';
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

function permissionsForRole(role: AdminRole): PermissionMap {
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

type RoleFilter = 'all' | 'active' | 'inactive' | TeamMember['role'];

export interface TeamPermissionsSectionProps {
  /** Optional: pre-select a member (e.g. when admin clicks "Manage permissions" from the client drawer). */
  highlightedMemberId?: string | null;
  onClearHighlight?: () => void;
  /** Map of clientId → client so we can render the linked-client badge with name/avatar. */
  clientsById?: Map<string, Client>;
  onOpenLinkedClient?: (clientId: string) => void;
}

export function TeamPermissionsSection({
  highlightedMemberId,
  onClearHighlight,
  clientsById,
  onOpenLinkedClient,
}: TeamPermissionsSectionProps = {}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { members, loading, refresh, createMember, updateMember, deleteMember } = useTeamMembers();
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');

  const canCreate = useAdminPermission('team', 'create');
  const canEdit = useAdminPermission('team', 'edit');
  const canDelete = useAdminPermission('team', 'delete');
  const canManage = useAdminPermission('team', 'manage_permissions');

  // Honor an external "highlighted member" signal — auto-open the editor.
  useEffect(() => {
    if (!highlightedMemberId) return;
    const m = members.find((x) => x.id === highlightedMemberId);
    if (m) {
      setEditing(m);
      onClearHighlight?.();
    }
  }, [highlightedMemberId, members, onClearHighlight]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((m) => {
      if (filter === 'active' && !m.is_active) return false;
      if (filter === 'inactive' && m.is_active) return false;
      if (filter !== 'all' && filter !== 'active' && filter !== 'inactive' && m.role !== filter) return false;
      if (!term) return true;
      const haystack = [m.name, m.email, m.phone, m.job_title].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [members, filter, search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('الفريق والصلاحيات', 'Team & Permissions')}
        subtitle={t(
          'إدارة أعضاء الفريق وصلاحياتهم. يمكنك تخصيص صلاحيات كل موظف.',
          'Manage your team and customize each employee\'s permissions.',
        )}
        actions={
          <div className="flex flex-wrap gap-2">
            <SoftButton variant="outline" size="md" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('تحديث', 'Refresh')}
            </SoftButton>
            <SoftButton variant="outline" size="md" onClick={() => setShowMatrix(true)}>
              <ShieldCheck className="w-4 h-4" />
              {t('مصفوفة الصلاحيات', 'Permission matrix')}
            </SoftButton>
            <SoftButton variant="primary" size="md" onClick={() => setShowAdd(true)} disabled={!canCreate}>
              <Plus className="w-4 h-4" />
              {t('إضافة عضو', 'Add member')}
            </SoftButton>
          </div>
        }
      />

      <SoftCard className="p-3 flex flex-wrap items-center gap-2">
        {(['all', 'active', 'inactive', 'admin', 'manager', 'sales', 'designer'] as RoleFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 h-9 rounded-full text-xs font-semibold ${
              filter === f ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300'
            }`}
          >
            {{
              all: t('الكل', 'All'),
              active: t('نشط', 'Active'),
              inactive: t('غير نشط', 'Inactive'),
            }[f as 'all' | 'active' | 'inactive'] || (isAr ? ROLE_LABELS[f as AdminRole].ar : ROLE_LABELS[f as AdminRole].en)}
          </button>
        ))}
        <div className="flex-1 flex justify-end">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('بحث…', 'Search…')}
              className="w-full h-9 pl-9 pr-3 rounded-full text-sm bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/10 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>
      </SoftCard>

      <SoftCard className="p-4 ring-1 ring-emerald-100 bg-emerald-50/40">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-900">
              {t('الصلاحيات مُطبَّقة على مستوى قاعدة البيانات.', 'Permissions are enforced by database policies and dashboard controls.')}
            </p>
            <p className="text-xs text-emerald-800 mt-1">
              {t(
                'دالة has_admin_permission() تُطبّق صلاحيات أعضاء الفريق على مستوى RLS في كل جداول المشاريع والعملاء والملفات والرسائل.',
                'The has_admin_permission() DB function enforces team member permissions at RLS level across projects, clients, files, messages, and more.',
              )}
            </p>
          </div>
        </div>
      </SoftCard>

      {loading ? (
        <SoftCard className="p-10 text-center text-sm text-slate-500">{t('جارٍ التحميل…', 'Loading…')}</SoftCard>
      ) : members.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={t('لا يوجد أعضاء بعد', 'No team members yet')}
          description={t('أضف أول عضو في الفريق للبدء.', 'Add your first teammate to get started.')}
          action={canCreate ? (
            <SoftButton variant="primary" size="md" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> {t('إضافة عضو', 'Add member')}
            </SoftButton>
          ) : null}
        />
      ) : filtered.length === 0 ? (
        <SoftCard className="p-10 text-center text-sm text-slate-500">
          {t('لا يوجد أعضاء يطابقون هذا الفلتر.', 'No team members match this filter.')}
        </SoftCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <TeamMemberCard
              key={m.id}
              member={m}
              linkedClient={m.client_id ? clientsById?.get(m.client_id) ?? null : null}
              onClick={() => canEdit && setEditing(m)}
              onOpenLinkedClient={onOpenLinkedClient}
              isAr={isAr}
            />
          ))}
        </div>
      )}

      <TeamMemberFormDrawer
        open={showAdd || !!editing}
        existing={editing}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        onCreate={async (input) => {
          const r = await createMember(input);
          if (r.success) { setShowAdd(false); setEditing(null); }
        }}
        onUpdate={async (id, input) => {
          const r = await updateMember(id, input);
          if (r.success) setEditing(null);
        }}
        onDelete={canDelete && editing ? async () => {
          if (window.confirm(t('متأكد من الحذف؟', 'Confirm delete?'))) {
            const r = await deleteMember(editing.id);
            if (r.success) setEditing(null);
          }
        } : undefined}
        canManagePermissions={canManage}
      />

      <PermissionMatrixDrawer open={showMatrix} onClose={() => setShowMatrix(false)} />
    </div>
  );
}

function TeamMemberCard({
  member, linkedClient, isAr, onClick, onOpenLinkedClient,
}: {
  member: TeamMember;
  linkedClient: Client | null;
  isAr: boolean;
  onClick: () => void;
  onOpenLinkedClient?: (clientId: string) => void;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const initial = (member.name || '?').slice(0, 1).toUpperCase();
  const tone = member.role === 'admin' ? 'violet' : member.role === 'manager' ? 'sky' : member.role === 'sales' ? 'emerald' : 'amber';
  const customCount = member.permissions
    ? Object.values(member.permissions).reduce((sum, r) => sum + Object.values(r).filter(Boolean).length, 0)
    : 0;
  return (
    <SoftCard className="p-5" as="article">
      <button type="button" onClick={onClick} className="w-full text-left flex items-start gap-4">
        <span className={`w-12 h-12 rounded-2xl text-white font-bold text-base flex items-center justify-center shrink-0 ${
          member.is_active ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-slate-300'
        }`}>
          <SafeAvatarImage
            src={member.avatar_url}
            className="w-full h-full rounded-2xl object-cover"
            fallback={initial}
          />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-bold text-foreground truncate">{member.name}</p>
            <SoftBadge tone={tone as 'violet' | 'sky' | 'emerald' | 'amber'}>
              {isAr ? ROLE_LABELS[member.role].ar : ROLE_LABELS[member.role].en}
            </SoftBadge>
            {!member.is_active ? <SoftBadge tone="slate">{t('غير نشط', 'Inactive')}</SoftBadge> : null}
            {member.client_id ? (
              <SoftBadge tone="violet" icon={LinkIcon}>
                {t('مرتبط بعميل', 'Linked client')}
              </SoftBadge>
            ) : null}
          </div>
          {member.job_title ? (
            <p className="text-[11px] text-slate-500 truncate">{member.job_title}</p>
          ) : null}
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-300">
            {member.email ? <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{member.email}</span> : null}
            {member.phone ? <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{member.phone}</span> : null}
          </div>
          {customCount > 0 ? (
            <p className="text-[11px] text-emerald-700 mt-1 inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {t(`${customCount} صلاحية مخصصة`, `${customCount} custom perms`)}
            </p>
          ) : null}
        </div>
      </button>
      {linkedClient ? (
        <div className="mt-3 pt-3 border-t border-emerald-900/5 flex items-center justify-between gap-2">
          <div className="min-w-0 inline-flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
              <LinkIcon className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-700 truncate">
                {linkedClient.company_name || linkedClient.username || linkedClient.email}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {t('عميل مرتبط', 'Linked client')}
              </p>
            </div>
          </div>
          {onOpenLinkedClient ? (
            <button
              type="button"
              onClick={() => onOpenLinkedClient(linkedClient.id)}
              className="px-2 h-7 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100 text-[10px] font-semibold inline-flex items-center gap-1 shrink-0"
            >
              <ExternalLink className="w-3 h-3" /> {t('فتح', 'View')}
            </button>
          ) : null}
        </div>
      ) : null}
    </SoftCard>
  );
}

interface TeamFormState {
  name: string;
  email: string;
  phone: string;
  role: TeamMember['role'];
  avatar_url: string;
  is_active: boolean;
  permissions: PermissionMap;
}

function buildInitialForm(member: TeamMember | null): TeamFormState {
  const role = member?.role || 'sales';
  return {
    name: member?.name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    role,
    avatar_url: member?.avatar_url || '',
    is_active: member?.is_active ?? true,
    permissions: (member?.permissions as PermissionMap) || permissionsForRole(role as AdminRole),
  };
}

function TeamMemberFormDrawer({
  open, existing, onClose, onCreate, onUpdate, onDelete, canManagePermissions,
}: {
  open: boolean;
  existing: TeamMember | null;
  onClose: () => void;
  onCreate: (input: Partial<TeamMember>) => void | Promise<void>;
  onUpdate: (id: string, input: Partial<TeamMember>) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  canManagePermissions: boolean;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [form, setForm] = useState<TeamFormState>(buildInitialForm(existing));
  const [tab, setTab] = useState<'profile' | 'permissions'>('profile');

  useEffect(() => {
    setForm(buildInitialForm(existing));
    setTab('profile');
  }, [existing?.id, open]);

  const togglePerm = (resource: string, action: string) => {
    setForm((f) => ({
      ...f,
      permissions: {
        ...f.permissions,
        [resource]: { ...(f.permissions[resource] || {}), [action]: !f.permissions[resource]?.[action] },
      },
    }));
  };

  const applyPreset = (role: AdminRole) => {
    setForm((f) => ({ ...f, permissions: permissionsForRole(role) }));
  };

  const totalGranted = useMemo(() => {
    return Object.values(form.permissions).reduce((s, r) => s + Object.values(r).filter(Boolean).length, 0);
  }, [form.permissions]);

  return (
    <AdminDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={existing ? t('تعديل عضو الفريق', 'Edit team member') : t('إضافة عضو فريق', 'Add team member')}
      subtitle={existing?.email}
      width="xl"
      footer={
        <>
          {onDelete ? (
            <SoftButton variant="danger" size="sm" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" /> {t('حذف', 'Delete')}
            </SoftButton>
          ) : null}
          <SoftButton variant="ghost" size="sm" onClick={onClose}>{t('إلغاء', 'Cancel')}</SoftButton>
          <SoftButton
            variant="primary"
            size="sm"
            onClick={() => {
              if (!form.name) return;
              const payload: Partial<TeamMember> = {
                name: form.name,
                email: form.email,
                phone: form.phone,
                role: form.role,
                avatar_url: form.avatar_url,
                is_active: form.is_active,
                permissions: canManagePermissions ? form.permissions : (existing?.permissions ?? {}),
              };
              if (existing) void onUpdate(existing.id, payload);
              else void onCreate(payload);
            }}
          >
            {existing ? t('حفظ', 'Save') : t('إضافة', 'Add')}
          </SoftButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {(['profile', 'permissions'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 h-8 rounded-full text-xs font-semibold ${
                tab === id ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300'
              }`}
            >
              {id === 'profile' ? t('الملف الشخصي', 'Profile') : t('الصلاحيات', 'Permissions')}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <SoftCard className="p-5 space-y-3">
            <FormRow label={t('الاسم', 'Name')}>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
            </FormRow>
            <FormRow label={t('البريد', 'Email')}>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
            </FormRow>
            <FormRow label={t('الهاتف', 'Phone')}>
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
            </FormRow>
            <FormRow label={t('الدور', 'Role')}>
              <select
                value={form.role}
                onChange={(e) => {
                  const r = e.target.value as TeamMember['role'];
                  setForm((f) => ({ ...f, role: r, permissions: permissionsForRole(r as AdminRole) }));
                }}
                className={inputCls}
              >
                {TEAM_ROLES.map((r) => (
                  <option key={r} value={r}>{isAr ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label={t('رابط الصورة', 'Avatar URL')}>
              <input type="url" value={form.avatar_url} onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))} className={inputCls} placeholder="https://…" />
            </FormRow>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
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
                  {t('صلاحيات مخصصة', 'Custom permissions')}
                </p>
                <p className="text-xs text-slate-500">
                  {t(`${totalGranted} صلاحية مفعّلة`, `${totalGranted} permissions granted`)}
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
                        const v = !!form.permissions[r]?.[a];
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

function PermissionMatrixDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  return (
    <AdminDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('مصفوفة الصلاحيات الافتراضية', 'Default permission matrix')}
      subtitle={t('الصلاحيات الافتراضية لكل دور.', 'Default permissions per role.')}
      width="xl"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left p-2 font-semibold text-slate-500 sticky left-0 bg-[#f7faf7] dark:bg-slate-950">
                {t('المورد / الإجراء', 'Resource / Action')}
              </th>
              {PRESET_ROLES.map((r) => (
                <th key={r} className="p-2 font-semibold text-slate-500 text-center">
                  {isAr ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_RESOURCES.flatMap((res) => [
              <tr key={`${res}-h`} className="bg-emerald-50/40">
                <td colSpan={PRESET_ROLES.length + 1} className="p-2 font-bold text-emerald-800">
                  {isAr ? RESOURCE_LABELS[res].ar : RESOURCE_LABELS[res].en}
                </td>
              </tr>,
              ...MATRIX_ACTIONS.map((act) => (
                <tr key={`${res}-${act}`} className="border-b border-emerald-900/5">
                  <td className="p-2 text-slate-600 sticky left-0 bg-[#f7faf7]">
                    {isAr ? ACTION_LABELS[act].ar : ACTION_LABELS[act].en}
                  </td>
                  {PRESET_ROLES.map((r) => {
                    const allowed = ROLE_PERMISSIONS[r]?.[res]?.[act] === true;
                    return (
                      <td key={r} className="p-2 text-center">
                        {allowed ? <Check className="w-4 h-4 text-emerald-600 inline" /> : <X className="w-3 h-3 text-slate-300 inline" />}
                      </td>
                    );
                  })}
                </tr>
              )),
            ])}
          </tbody>
        </table>
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
