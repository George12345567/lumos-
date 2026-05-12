import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileIcon,
  Hash,
  Image as ImageIcon,
  KeyRound,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { Client, PricingRequest, TeamMember } from '@/types/dashboard';
import { profileService } from '@/services/profileService';
import VerifiedClientBadge from '@/components/shared/VerifiedClientBadge';
import { useAdminPermission } from '../hooks/useAdminPermission';
import {
  EmptyState,
  SectionHeader,
  SoftBadge,
  SoftButton,
  SoftCard,
} from '../components/primitives';
import { AdminDrawer } from '../components/AdminDrawer';
import { ClientIdentityPanel } from '../components/ClientIdentityPanel';
import { fileTimestamp, isImageFile, useClientFiles, type AdminClientFile } from '../data/useClientFiles';
import {
  useClientConversations,
  type AdminClientMessage,
} from '../data/useClientConversations';
import { ROLE_LABELS } from '../permissions';
import { adminSetClientTemporaryPassword } from '@/services/adminPasswordService';

interface ClientsSectionProps {
  clients: Client[];
  pricingRequests: PricingRequest[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void | Promise<void>;
  onOpenRequest?: (id: string) => void;
  onUpdateClient?: (id: string, updates: Partial<Client>) => Promise<void>;
  onOpenMessages?: (clientId: string) => void;
  onLinkAsTeam?: (client: Client) => void;
  onManageTeamMember?: (memberId: string) => void;
  teamMemberByClientId?: Map<string, TeamMember>;
  onAfterSecurityChange?: () => void | Promise<void>;
  selectedClientId?: string | null;
  onClearSelection?: () => void;
}

type ClientFilter = 'all' | 'active' | 'pending' | 'invited' | 'archived';
const ROOT_OWNER_EMAIL = 'georgehelal87@gmail.com';
const normalizeEmail = (email?: string | null) => String(email ?? '').trim().toLowerCase();

export function ClientsSection({
  clients,
  pricingRequests,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onUpdateClient,
  onOpenRequest,
  onOpenMessages,
  onLinkAsTeam,
  onManageTeamMember,
  teamMemberByClientId,
  onAfterSecurityChange,
  selectedClientId,
  onClearSelection,
}: ClientsSectionProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [filter, setFilter] = useState<ClientFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canCreate = useAdminPermission('clients', 'create');
  const canEdit = useAdminPermission('clients', 'edit');
  const canDelete = useAdminPermission('clients', 'delete');

  // Honor external selection signal (e.g. opening a client from Requests).
  useEffect(() => {
    if (selectedClientId) setSelectedId(selectedClientId);
  }, [selectedClientId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (normalizeEmail(c.email) === ROOT_OWNER_EMAIL) return false;
      if (filter !== 'all') {
        const status = (c.status || 'active').toLowerCase();
        if (filter === 'active' && status !== 'active') return false;
        if (filter === 'pending' && status !== 'pending') return false;
        if (filter === 'invited' && !c.auth_password_pending) return false;
        if (filter === 'archived' && status !== 'archived') return false;
      }
      if (!term) return true;
      const haystack = [c.username, c.email, c.company_name, c.phone, c.industry].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, filter, search]);

  const selected = selectedId ? clients.find((c) => c.id === selectedId) || null : null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('العملاء', 'Clients')}
        subtitle={t(
          'كل عميل، حالته، باقته، وطلباته في مكان واحد.',
          'Every client with their status, package, and requests, all in one place.',
        )}
        actions={
          <SoftButton variant="primary" size="md" onClick={onAdd} disabled={!canCreate}>
            <Plus className="w-4 h-4" /> {t('إضافة عميل', 'Add client')}
          </SoftButton>
        }
      />

      <SoftCard className="p-3 flex flex-wrap items-center gap-2">
        {(['all', 'active', 'pending', 'invited', 'archived'] as ClientFilter[]).map((f) => (
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
              pending: t('بانتظار', 'Pending'),
              invited: t('مدعو', 'Invited'),
              archived: t('مؤرشف', 'Archived'),
            }[f]}
          </button>
        ))}
        <div className="flex-1 flex justify-end">
          <div className="relative w-full sm:w-72 max-w-full">
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

      {loading ? (
        <SoftCard className="p-10 text-center text-sm text-slate-500">{t('جارٍ التحميل…', 'Loading…')}</SoftCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('لا يوجد عملاء', 'No clients yet')}
          description={t(
            'يظهر العملاء هنا بعد التسجيل أو بعد إضافتهم يدوياً.',
            'Clients show up here after they sign up or once you add them manually.',
          )}
          action={canCreate ? (
            <SoftButton variant="primary" size="md" onClick={onAdd}>
              <Plus className="w-4 h-4" /> {t('إضافة عميل', 'Add client')}
            </SoftButton>
          ) : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <ClientCard key={c.id} client={c} isAr={isAr} requestCount={pricingRequests.filter((r) => r.client_id === c.id).length} onOpen={() => setSelectedId(c.id)} />
          ))}
        </div>
      )}

      <ClientDetailDrawer
        client={selected}
        pricingRequests={pricingRequests}
        teamMember={selected ? teamMemberByClientId?.get(selected.id) ?? null : null}
        onClose={() => {
          setSelectedId(null);
          onClearSelection?.();
        }}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(client) => {
          setSelectedId(null);
          onClearSelection?.();
          onEdit(client);
        }}
        onDelete={async (id) => {
          await onDelete(id);
          setSelectedId(null);
          onClearSelection?.();
        }}
        onOpenRequest={onOpenRequest}
        onOpenMessages={onOpenMessages}
        onLinkAsTeam={onLinkAsTeam}
        onManageTeamMember={onManageTeamMember}
        onAfterSecurityChange={onAfterSecurityChange}
        onUpdateClient={onUpdateClient}
      />
    </div>
  );
}

/**
 * Resolves a private storage path to a fresh signed URL and renders the avatar.
 * Falls back to colored initials if the path is absent, invalid, or the signed
 * URL cannot be generated (e.g. RLS blocks access). Never renders a broken image.
 */
function ClientAvatar({
  path,
  initial,
  textSize = 'text-lg',
}: {
  path?: string | null;
  initial: string;
  textSize?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setImgError(false);
    void profileService.getAvatarUrl(path).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!src || imgError) {
    return (
      <span
        className={`w-full h-full rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold ${textSize} flex items-center justify-center`}
      >
        {initial}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className="w-full h-full rounded-xl object-cover"
      onError={() => setImgError(true)}
    />
  );
}

function ClientCard({
  client, isAr, requestCount, onOpen,
}: { client: Client; isAr: boolean; requestCount: number; onOpen: () => void }) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const initial = (client.company_name || client.username || '?').slice(0, 1).toUpperCase();
  const status = (client.status || 'active').toLowerCase();
  const tone = status === 'active' ? 'emerald' : status === 'pending' ? 'amber' : status === 'archived' ? 'slate' : 'sky';
  const cover = client.cover_gradient || 'linear-gradient(135deg, #34d399, #14b8a6)';
  return (
    <SoftCard className="p-0 overflow-hidden cursor-pointer hover:shadow-md transition" as="article">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="h-16 w-full" style={{ background: cover }} />
        <div className="px-5 pb-5 -mt-8">
          <div className="flex items-end justify-between gap-3">
            <span className="w-14 h-14 rounded-2xl bg-white p-1 shadow-sm">
              <ClientAvatar path={client.avatar_url} initial={initial} />
            </span>
            <SoftBadge tone={tone as 'emerald' | 'amber' | 'slate' | 'sky'}>
              {{
                active: t('نشط', 'Active'),
                pending: t('بانتظار', 'Pending'),
                archived: t('مؤرشف', 'Archived'),
                invited: t('مدعو', 'Invited'),
              }[status] || status}
            </SoftBadge>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="min-w-0 truncate text-[15px] font-bold text-foreground">
                {client.company_name || client.username || t('عميل', 'Client')}
              </p>
              {client.is_verified && (
                <VerifiedClientBadge compact label={client.verified_label || 'Verified Lumos Client'} />
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {client.full_contact_name || client.username || ''}
              {client.package_name ? ` · ${client.package_name}` : ''}
            </p>
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
              {client.email ? <span className="inline-flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{client.email}</span> : null}
              {client.phone ? <span className="inline-flex items-center gap-1 truncate"><Phone className="w-3 h-3" />{client.phone}</span> : null}
            </div>
            {typeof client.progress === 'number' ? (
              <div className="pt-2">
                <div className="h-1.5 rounded-full bg-emerald-50 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, client.progress))}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{t('التقدم', 'Progress')}: {client.progress}%</p>
              </div>
            ) : null}
            {requestCount > 0 ? (
              <p className="text-[11px] text-emerald-700 inline-flex items-center gap-1 pt-1">
                <Hash className="w-3 h-3" /> {t(`${requestCount} طلب`, `${requestCount} requests`)}
              </p>
            ) : null}
          </div>
        </div>
      </button>
    </SoftCard>
  );
}

function ClientDetailDrawer({
  client, pricingRequests, teamMember, onClose, canEdit, canDelete, onEdit, onDelete, onOpenRequest, onOpenMessages, onLinkAsTeam, onManageTeamMember, onAfterSecurityChange, onUpdateClient,
}: {
  client: Client | null;
  pricingRequests: PricingRequest[];
  teamMember: TeamMember | null;
  onClose: () => void;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (c: Client) => void;
  onDelete: (id: string) => void | Promise<void>;
  onOpenRequest?: (id: string) => void;
  onOpenMessages?: (clientId: string) => void;
  onLinkAsTeam?: (c: Client) => void;
  onManageTeamMember?: (memberId: string) => void;
  onAfterSecurityChange?: () => void | Promise<void>;
  onUpdateClient?: (id: string, updates: Partial<Client>) => Promise<void>;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  type ClientDetailTab =
    | 'profile'
    | 'business'
    | 'identity'
    | 'project'
    | 'requests'
    | 'messages'
    | 'files'
    | 'team'
    | 'security'
    | 'admin';
  const [tab, setTab] = useState<ClientDetailTab>('profile');
  const { byClient, getSignedUrl, refresh: refreshFiles, loading: filesLoading } = useClientFiles();
  const { messages: allMessages, refresh: refreshMessages, loading: messagesLoading } = useClientConversations();
  const canManageTeam = useAdminPermission('team', 'create');

  if (!client) return null;

  const relatedRequests = pricingRequests
    .filter((r) => r.client_id === client.id || (!r.client_id && client.email && r.guest_email && r.guest_email.toLowerCase() === client.email.toLowerCase()))
    .map((r) => ({
      ...r,
      _matchedByEmail: !r.client_id,
    }));

  const clientFiles = (byClient.get(client.id) || []).filter((file) => !file.is_identity_asset);
  const clientMessages = allMessages.filter((m) => m.client_id === client.id).slice(-5).reverse();

  const tabs: Array<{ id: ClientDetailTab; en: string; ar: string; badge?: number }> = [
    { id: 'profile', en: 'Profile', ar: 'الملف' },
    { id: 'business', en: 'Business', ar: 'الأعمال' },
    { id: 'identity', en: 'Identity', ar: 'الهوية' },
    { id: 'project', en: 'Project', ar: 'المشروع' },
    { id: 'requests', en: 'Requests', ar: 'الطلبات', badge: relatedRequests.length },
    { id: 'messages', en: 'Messages', ar: 'الرسائل', badge: clientMessages.length },
    { id: 'files', en: 'Files', ar: 'الملفات', badge: clientFiles.length },
    { id: 'team', en: 'Team access', ar: 'الفريق', badge: teamMember ? 1 : 0 },
    { id: 'security', en: 'Security', ar: 'الأمان' },
    { id: 'admin', en: 'Admin', ar: 'إدارة' },
  ];

  return (
    <AdminDrawer
      open={!!client}
      onOpenChange={(o) => !o && onClose()}
      title={client.company_name || client.username || t('عميل', 'Client')}
      subtitle={client.email || ''}
      width="xl"
      footer={
        <>
          <SoftButton
            variant="danger"
            size="sm"
            onClick={() => {
              if (window.confirm(t('متأكد؟', 'Are you sure?'))) void onDelete(client.id);
            }}
            disabled={!canDelete}
          >
            <Trash2 className="w-3.5 h-3.5" /> {t('حذف', 'Delete')}
          </SoftButton>
          <SoftButton variant="primary" size="sm" onClick={() => onEdit(client)} disabled={!canEdit}>
            {t('تحرير', 'Edit')}
          </SoftButton>
        </>
      }
    >
      {/* Hero with cover + avatar */}
      <div className="rounded-3xl overflow-hidden ring-1 ring-emerald-900/5 mb-5">
        <div className="h-24 w-full" style={{ background: client.cover_gradient || 'linear-gradient(135deg, #34d399, #14b8a6)' }} />
        <div className="px-5 pb-5 -mt-10 flex items-end gap-4">
          <span className="w-20 h-20 rounded-2xl bg-white p-1 shadow-sm">
            <ClientAvatar
              path={client.avatar_url}
              initial={(client.company_name || client.username || '?').slice(0, 1).toUpperCase()}
              textSize="text-2xl"
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-bold text-foreground truncate">
                {client.full_contact_name || client.username}
              </p>
              {client.is_verified ? (
                <VerifiedClientBadge label={client.verified_label || 'Verified Lumos Client'} />
              ) : null}
              {teamMember ? (
                <SoftBadge tone="violet" icon={ShieldCheck}>
                  {t('عضو فريق', 'Team member')}
                </SoftBadge>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 truncate">{client.business_tagline || client.email}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={`px-3 h-8 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
              tab === x.id ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300'
            }`}
          >
            {isAr ? x.ar : x.en}
            {x.badge ? (
              <span className={`text-[10px] px-1.5 h-4 inline-flex items-center rounded-full ${tab === x.id ? 'bg-white/20' : 'bg-emerald-50 text-emerald-700'}`}>
                {x.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <SoftCard className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Info label={t('اسم المستخدم', 'Username')} value={client.username} />
          <Info label={t('الاسم الكامل', 'Full name')} value={client.full_contact_name} />
          <Info label={t('البريد', 'Email')} value={client.email} />
          <Info label={t('الهاتف', 'Phone')} value={client.phone || client.phone_number} />
          <Info label={t('الموقع', 'Website')} value={client.website ? <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline inline-flex items-center gap-1">{client.website}<ExternalLink className="w-3 h-3" /></a> : null} />
          <Info label={t('المصدر', 'Signup source')} value={client.signup_source} />
          <Info label={t('الحالة', 'Status')} value={client.status} />
          <Info label={t('الباقة', 'Package')} value={client.package_name} />
          <Info label={t('التقدم', 'Progress')} value={`${client.progress ?? 0}%`} />
          <Info label={t('الشعار', 'Tagline')} value={client.business_tagline} />
        </SoftCard>
      )}

      {tab === 'business' && (
        <SoftCard className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Info
            label={t('الشركة', 'Company')}
            value={<span className="inline-flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" />{client.company_name}</span>}
          />
          <Info label={t('الصناعة', 'Industry')} value={client.industry} />
          <Info label={t('الميزانية', 'Budget')} value={client.budget_range} />
          <Info label={t('الجدول الزمني', 'Timeline')} value={client.timeline} />
          <Info label={t('الخدمات المطلوبة', 'Services needed')} value={(client.services_needed || []).join(', ')} />
          <Info label={t('الإحساس', 'Brand feel')} value={client.brand_feel} />
          <div className="sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">{t('الألوان', 'Brand colors')}</p>
            <div className="flex flex-wrap gap-2">
              {(client.brand_colors || []).map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full ring-1 ring-slate-200 bg-white text-[11px]">
                  <span className="w-3 h-3 rounded-full" style={{ background: c }} />
                  {c}
                </span>
              ))}
              {(!client.brand_colors || client.brand_colors.length === 0) && <span className="text-xs text-slate-500">—</span>}
            </div>
          </div>
        </SoftCard>
      )}

      {tab === 'identity' && (
        <ClientIdentityPanel
          client={client}
          canEdit={canEdit}
          isAr={isAr}
          onChanged={onAfterSecurityChange}
        />
      )}

      {tab === 'project' && (
        <SoftCard className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Info label={t('الباقة', 'Package')} value={client.package_name} />
          <Info label={t('الحالة', 'Status')} value={client.status} />
          <Info label={t('التقدم', 'Progress')} value={`${client.progress ?? 0}%`} />
          <Info label={t('ملخص المشروع', 'Project summary')} value={client.project_summary} />
          <Info label={t('الخطوة التالية', 'Next steps')} value={client.next_steps} />
          <Info label={t('العرض النشط', 'Active offer')} value={client.active_offer} />
        </SoftCard>
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          {relatedRequests.length === 0 ? (
            <SoftCard className="p-6 text-center text-sm text-slate-500">
              {t('لا توجد طلبات مرتبطة بهذا العميل.', 'No related requests for this client.')}
            </SoftCard>
          ) : (
            relatedRequests.map((r) => (
              <SoftCard key={r.id} className="p-4 flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 h-7 inline-flex items-center rounded-full">
                  {r.invoice_number || r.id.slice(0, 8)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {r.package_name || r.request_type}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {r.status} · {new Date(r.created_at).toLocaleDateString(isAr ? 'ar' : 'en')}
                    {r._matchedByEmail ? ` · ${t('مطابقة عبر البريد', 'matched by email')}` : ''}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {new Intl.NumberFormat(isAr ? 'ar' : 'en').format(r.estimated_total || 0)} {r.price_currency || 'EGP'}
                </span>
                {onOpenRequest ? (
                  <SoftButton variant="ghost" size="sm" onClick={() => onOpenRequest(r.id)}>
                    {t('فتح', 'Open')}
                  </SoftButton>
                ) : null}
              </SoftCard>
            ))
          )}
        </div>
      )}

      {tab === 'messages' && (
        <SoftCard className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              {t('آخر الرسائل', 'Recent messages')}
            </p>
            <SoftButton variant="ghost" size="sm" onClick={() => void refreshMessages()} disabled={messagesLoading}>
              <RefreshCw className={`w-3.5 h-3.5 ${messagesLoading ? 'animate-spin' : ''}`} />
              {t('تحديث', 'Refresh')}
            </SoftButton>
          </div>
          {clientMessages.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              {t('لا توجد رسائل بعد.', 'No messages yet.')}
            </p>
          ) : (
            <ul className="space-y-2">
              {clientMessages.map((m: AdminClientMessage) => {
                const fromTeam = m.sender === 'team' || m.sender === 'admin';
                return (
                  <li key={m.id} className={`p-3 rounded-2xl text-sm ${fromTeam ? 'bg-slate-100 text-slate-900' : 'bg-emerald-50 text-emerald-900'}`}>
                    <p className="text-[11px] uppercase font-semibold mb-1 opacity-60">
                      {fromTeam
                        ? (m.sender_name || t('فريق Lumos', 'Lumos team'))
                        : (m.sender_name || t('العميل', 'Client'))}
                      {' · '}
                      {new Date(m.created_at).toLocaleString(isAr ? 'ar' : 'en')}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  </li>
                );
              })}
            </ul>
          )}
          {onOpenMessages ? (
            <SoftButton variant="primary" size="sm" onClick={() => onOpenMessages(client.id)}>
              <MessageSquare className="w-3.5 h-3.5" />
              {t('فتح المحادثة الكاملة', 'Open full conversation')}
            </SoftButton>
          ) : null}
        </SoftCard>
      )}

      {tab === 'files' && (
        <div className="space-y-3">
          <SoftCard className="p-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              {t('الملفات المشاركة', 'Shared files')}
            </p>
            <SoftButton variant="ghost" size="sm" onClick={() => void refreshFiles()} disabled={filesLoading}>
              <RefreshCw className={`w-3.5 h-3.5 ${filesLoading ? 'animate-spin' : ''}`} />
              {t('تحديث', 'Refresh')}
            </SoftButton>
          </SoftCard>
          {clientFiles.length === 0 ? (
            <SoftCard className="p-6 text-center text-sm text-slate-500">
              {t('لا توجد ملفات لهذا العميل.', 'No files for this client.')}
            </SoftCard>
          ) : (
            <SoftCard className="p-3 space-y-2">
              {clientFiles.map((f: AdminClientFile) => {
                const ts = fileTimestamp(f);
                return (
                  <div key={f.id} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-emerald-50/40">
                    <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      {isImageFile(f) ? <ImageIcon className="w-4 h-4" /> : <FileIcon className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{f.file_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {f.category || 'general'} · {ts ? new Date(ts).toLocaleDateString(isAr ? 'ar' : 'en') : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (f.storage_path) {
                          const url = await getSignedUrl(f.storage_path);
                          if (url) window.open(url, '_blank');
                        } else if (f.file_url) {
                          window.open(f.file_url, '_blank');
                        }
                      }}
                      className="px-3 h-8 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> {t('فتح', 'Open')}
                    </button>
                  </div>
                );
              })}
            </SoftCard>
          )}
          <p className="text-xs text-slate-500">
            {t('استخدم قسم الملفات لرفع ملف جديد لهذا العميل.', 'Use the Files section to upload a new file for this client.')}
          </p>
        </div>
      )}

      {tab === 'team' && (
        <SoftCard className="p-5 space-y-4">
          {teamMember ? (
            <>
              <div className="flex items-start gap-3">
                <span className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {t('هذا العميل عضو في الفريق', 'This client is on the team')}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t(
                      'التغييرات في الدور والصلاحيات تطبَّق هنا أو في قسم الفريق.',
                      'Role and permission changes happen here or in Team & Permissions.',
                    )}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-900/5">
                <Info label={t('الاسم', 'Name')} value={teamMember.name} />
                <Info label={t('الدور', 'Role')} value={isAr ? ROLE_LABELS[teamMember.role].ar : ROLE_LABELS[teamMember.role].en} />
                <Info label={t('المسمى الوظيفي', 'Job title')} value={teamMember.job_title} />
                <Info
                  label={t('الحالة', 'Status')}
                  value={teamMember.is_active
                    ? <SoftBadge tone="emerald">{t('نشط', 'Active')}</SoftBadge>
                    : <SoftBadge tone="slate">{t('غير نشط', 'Inactive')}</SoftBadge>}
                />
                <Info label={t('البريد', 'Email')} value={teamMember.email} />
                <Info label={t('الهاتف', 'Phone')} value={teamMember.phone} />
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-900/5">
                {onLinkAsTeam ? (
                  <SoftButton variant="soft" size="sm" onClick={() => onLinkAsTeam(client)} disabled={!canManageTeam}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t('إدارة وصول الموظف', 'Manage employee access')}
                  </SoftButton>
                ) : null}
                {onManageTeamMember ? (
                  <SoftButton variant="ghost" size="sm" onClick={() => onManageTeamMember(teamMember.id)}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t('فتح في الفريق والصلاحيات', 'Open in Team & Permissions')}
                  </SoftButton>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {t('ليس عضواً في الفريق بعد', 'Not a team member yet')}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t(
                      'يمكنك تحويل هذا العميل إلى موظف بدور وصلاحيات محدّدة.',
                      'You can promote this client into an employee with a specific role and permissions.',
                    )}
                  </p>
                </div>
              </div>
              <SoftButton
                variant="primary"
                size="sm"
                onClick={() => onLinkAsTeam?.(client)}
                disabled={!canManageTeam || !onLinkAsTeam}
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t('إضافة كعضو فريق', 'Add as team member')}
              </SoftButton>
              {!canManageTeam ? (
                <p className="text-[11px] text-amber-700 bg-amber-50 ring-1 ring-amber-100 rounded-2xl px-3 py-2">
                  {t(
                    'ليس لديك صلاحية إضافة أعضاء للفريق.',
                    'You do not have permission to add team members.',
                  )}
                </p>
              ) : null}
            </>
          )}
        </SoftCard>
      )}

      {tab === 'security' && (
        <SecurityAccessPanel
          client={client}
          isAr={isAr}
          onAfterSecurityChange={onAfterSecurityChange}
        />
      )}

      {tab === 'admin' && (
        <SoftCard className="p-5 space-y-4">
          {client.is_verified ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-3">
              <VerifiedClientBadge label={client.verified_label || 'Verified Lumos Client'} />
              <p className="text-xs text-muted-foreground">{t('موثّق بواسطة لوموس ويظهر في ملف العميل.', 'Verified by Lumos and visible on the client profile.')}</p>
            </div>
          ) : null}
          <Info label={t('ملاحظات الإدارة', 'Admin notes')} value={client.admin_notes} />
          <Info label={t('العرض النشط', 'Active offer')} value={client.active_offer} />
          <Info label={t('رابط العرض', 'Offer link')} value={client.active_offer_link} />
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{t('عميل موثّق', 'Verified client')}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('وضع علامة التحقق المميزة على ملف العميل.', 'Mark this client with a premium verified badge on their profile.')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={Boolean(client.is_verified)}
                  onChange={async (e) => {
                    if (!onUpdateClient) return;
                    const verified = e.target.checked;
                    await onUpdateClient(client.id, {
                      is_verified: verified,
                      verified_label: verified ? (client.verified_label || 'Verified Lumos Client') : null,
                      verified_by: undefined,
                    });
                  }}
                  disabled={!onUpdateClient}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[color:var(--profile-accent)] rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:bg-[color:var(--profile-accent)] after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>
            {client.is_verified && (
              <div className="mt-3">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('تسمية التحقق', 'Verified label')}
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[color:var(--profile-accent)]"
                  placeholder="Verified Lumos Client"
                  value={client.verified_label || 'Verified Lumos Client'}
                  onChange={async (e) => {
                    if (!onUpdateClient) return;
                    await onUpdateClient(client.id, { verified_label: e.target.value || null });
                  }}
                  disabled={!onUpdateClient}
                />
              </div>
            )}
          </div>
        </SoftCard>
      )}
    </AdminDrawer>
  );
}

function Info({ label, value }: { label: string; value?: React.ReactNode | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm text-foreground mt-0.5">
        {value || <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

function SecurityAccessPanel({
  client,
  isAr,
  onAfterSecurityChange,
}: {
  client: Client;
  isAr: boolean;
  onAfterSecurityChange?: () => void | Promise<void>;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <SoftCard className="p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              {t('وصول الأمان', 'Security Access')}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {t(
                'إعداد كلمة مرور مؤقتة يتم عبر Edge Function آمن فقط.',
                'Temporary passwords are set only through a secure Edge Function.',
              )}
            </p>
          </div>
          <SoftButton variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            <KeyRound className="w-3.5 h-3.5" />
            {t('تعيين كلمة مرور مؤقتة', 'Set Temporary Password')}
          </SoftButton>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SecurityStatus
            label={t('إعداد كلمة المرور', 'Auth password pending')}
            active={Boolean(client.auth_password_pending)}
            activeText={t('بانتظار', 'Pending')}
            inactiveText={t('مكتمل', 'Complete')}
          />
          <SecurityStatus
            label={t('يجب تغييرها', 'Password must change')}
            active={Boolean(client.password_must_change)}
            activeText={t('نعم', 'Yes')}
            inactiveText={t('لا', 'No')}
          />
          <div className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-white/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t('آخر تحديث', 'Last admin update')}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {client.password_updated_by_admin_at
                ? new Date(client.password_updated_by_admin_at).toLocaleString(isAr ? 'ar' : 'en')
                : '—'}
            </p>
          </div>
        </div>
      </SoftCard>

      <SoftCard className="p-5 space-y-3">
        <Info label={t('سؤال الأمان', 'Security question')} value={client.security_question} />
        <p className="text-xs text-slate-500">
          {t('الإجابة الأمنية لا تُعرض هنا ولا يتم التحقق منها داخل المتصفح.', 'The security answer is not shown here and is not verified in the browser.')}
        </p>
        <Info label={t('تاريخ التسجيل', 'Signed up at')} value={client.signup_completed_at ? new Date(client.signup_completed_at).toLocaleString(isAr ? 'ar' : 'en') : null} />
      </SoftCard>

      <TemporaryPasswordModal
        open={modalOpen}
        client={client}
        isAr={isAr}
        onClose={() => setModalOpen(false)}
        onAfterSuccess={onAfterSecurityChange}
      />
    </div>
  );
}

function SecurityStatus({
  label,
  active,
  activeText,
  inactiveText,
}: {
  label: string;
  active: boolean;
  activeText: string;
  inactiveText: string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-white/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2">
        <SoftBadge tone={active ? 'amber' : 'emerald'}>
          {active ? activeText : inactiveText}
        </SoftBadge>
      </div>
    </div>
  );
}

function TemporaryPasswordModal({
  open,
  client,
  isAr,
  onClose,
  onAfterSuccess,
}: {
  open: boolean;
  client: Client;
  isAr: boolean;
  onClose: () => void;
  onAfterSuccess?: () => void | Promise<void>;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successPassword, setSuccessPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword('');
      setShowPassword(false);
      setSubmitting(false);
      setError(null);
      setSuccessPassword('');
      setCopied(false);
    }
  }, [open]);

  if (!open) return null;

  const generatePassword = () => {
    setPassword(generateStrongPassword());
    setShowPassword(false);
    setError(null);
    setCopied(false);
  };

  const copyPassword = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setError(t('تعذّر النسخ. انسخها يدوياً.', 'Copy failed. Copy it manually.'));
    }
  };

  const submit = async () => {
    if (submitting) return;
    setError(null);
    setCopied(false);

    if (!isStrongAdminPassword(password)) {
      setError(t('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتتضمن أحرفاً كبيرة وصغيرة ورقماً.', 'Password must be at least 8 characters and include uppercase, lowercase, and a number.'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await adminSetClientTemporaryPassword(client.id, password);
      if (!result.success) {
        setError(mapPasswordError(result.error, isAr));
        return;
      }

      setSuccessPassword(password);
      setPassword('');
      await onAfterSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-950 p-5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">
              {t('تعيين كلمة مرور مؤقتة', 'Set Temporary Password')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {client.company_name || client.username} · {client.email || t('بدون بريد', 'No email')}
            </p>
          </div>
        </div>

        {successPassword ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                {t('تم تحديث كلمة المرور المؤقتة.', 'Temporary password updated.')}
              </div>
              <p className="mt-2 text-xs leading-5">
                {t(
                  'هذه هي المرة الوحيدة التي ستظهر فيها كلمة المرور. انسخها الآن وأرسلها للعميل عبر قناة آمنة.',
                  'This is the only time this password will be shown. Copy it now and send it through a secure channel.',
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {t('كلمة المرور المؤقتة', 'Temporary password')}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 rounded-xl bg-slate-100 dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-foreground break-all">
                  {successPassword}
                </code>
                <button
                  type="button"
                  onClick={() => void copyPassword(successPassword)}
                  className="h-10 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? t('تم النسخ', 'Copied') : t('نسخ', 'Copy')}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <SoftButton variant="primary" size="sm" onClick={onClose}>
                {t('إغلاق', 'Close')}
              </SoftButton>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-amber-50 text-amber-900 ring-1 ring-amber-100 p-4 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs leading-5">
                {t(
                  'ستظهر كلمة المرور مرة واحدة فقط. يجب على العميل تغييرها بعد تسجيل الدخول.',
                  'This password will be shown once. The client must change it after login.',
                )}
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('كلمة المرور المؤقتة', 'Temporary password')}
              </span>
              <span className="relative block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full h-11 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <SoftButton variant="soft" size="sm" onClick={generatePassword}>
                <KeyRound className="w-3.5 h-3.5" />
                {t('توليد كلمة قوية', 'Generate Password')}
              </SoftButton>
              <SoftButton variant="ghost" size="sm" onClick={() => void copyPassword(password)} disabled={!password}>
                <Copy className="w-3.5 h-3.5" />
                {copied ? t('تم النسخ', 'Copied') : t('نسخ', 'Copy')}
              </SoftButton>
            </div>

            {error ? (
              <p className="rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100 px-3 py-2 text-xs">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <SoftButton variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                {t('إلغاء', 'Cancel')}
              </SoftButton>
              <SoftButton variant="primary" size="sm" onClick={() => void submit()} disabled={submitting}>
                {submitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                {t('تأكيد التعيين', 'Confirm')}
              </SoftButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function isStrongAdminPassword(value: string): boolean {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

function generateStrongPassword(): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%*?';
  const all = `${lower}${upper}${digits}${symbols}`;
  const required = [
    pickSecure(lower),
    pickSecure(upper),
    pickSecure(digits),
    pickSecure(symbols),
  ];

  while (required.length < 18) {
    required.push(pickSecure(all));
  }

  return shuffleSecure(required).join('');
}

function pickSecure(chars: string): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return chars[bytes[0] % chars.length];
}

function shuffleSecure(values: string[]): string[] {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    const j = bytes[0] % (i + 1);
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function mapPasswordError(error: string | undefined, isAr: boolean): string {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const map: Record<string, string> = {
    missing_admin_session: t('جلسة الأدمن غير موجودة.', 'Missing admin session.'),
    not_admin: t('ليس لديك صلاحية تنفيذ هذا الإجراء.', 'You are not allowed to perform this action.'),
    weak_password: t('كلمة المرور ضعيفة.', 'Password is too weak.'),
    client_not_found: t('لم يتم العثور على العميل.', 'Client was not found.'),
    auth_user_not_found: t('لم يتم العثور على مستخدم المصادقة لهذا العميل.', 'Auth user for this client was not found.'),
    auth_password_update_failed: t('فشل تحديث كلمة المرور في Supabase Auth.', 'Failed to update password in Supabase Auth.'),
    client_profile_update_failed: t('تم تحديث كلمة المرور لكن فشل تحديث حالة ملف العميل. راجع Supabase.', 'Password changed but client status update failed. Check Supabase.'),
  };
  return map[error || ''] || t('تعذّر تعيين كلمة المرور المؤقتة.', 'Could not set the temporary password.');
}

void Upload;
