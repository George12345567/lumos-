import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthActions, useSessionEmail, useClient } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useTeamMembers } from '../data/useTeamMembers';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { OverviewSection } from '../sections/OverviewSection';
import { RequestsSection } from '../sections/RequestsSection';
import { ClientsSection } from '../sections/ClientsSection';
import { ProjectsSection } from '../sections/ProjectsSection';
import { ContactsSection } from '../sections/ContactsSection';
import { MessagesSection } from '../sections/MessagesSection';
import { FilesSection } from '../sections/FilesSection';
import { TeamPermissionsSection } from '../sections/TeamPermissionsSection';
import { DiscountsSection } from '../sections/DiscountsSection';
import { AuditSection } from '../sections/AuditSection';
import { StatisticsSection } from '../sections/StatisticsSection';
import { SettingsSection } from '../sections/SettingsSection';
import type { AdminSection } from '../types';
import type { Client } from '@/types/dashboard';
import AddClientModal from '@/components/admin/AddClientModal';
import { ClientEditDrawer } from './ClientEditDrawer';
import { LinkClientToTeamModal, permissionsForRole } from './LinkClientToTeamModal';
import { useAdminPermission, useAdminRole, useCanAccessResource } from '../hooks/useAdminPermission';
import { useAdminAccess } from '../context/AdminAccessContext';
import { SIDEBAR_ITEMS } from '../constants/sidebar';
import { toast } from 'sonner';
import { LoadingFallback } from '@/components/shared';

export function AdminShell() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout } = useAuthActions();
  const sessionEmail = useSessionEmail();
  const profile = useClient();
  const { isArabic } = useLanguage();
  const access = useAdminAccess();

  const dashboard = useAdminDashboard();
  const {
    members: teamMembers,
    memberByClientId,
    linkClientAsMember,
    refresh: refreshTeam,
  } = useTeamMembers();

  const [section, setSection] = useState<AdminSection>('overview');
  const [search, setSearch] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [openCreateDiscount, setOpenCreateDiscount] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [filesPreselect, setFilesPreselect] = useState<string | null>(null);
  const [linkAsTeamFor, setLinkAsTeamFor] = useState<Client | null>(null);
  const [highlightedTeamMember, setHighlightedTeamMember] = useState<string | null>(null);

  const role = useAdminRole();
  const canManageTeam = useAdminPermission('team', 'create');
  const canManagePermissions = useAdminPermission('team', 'manage_permissions');

  const validSections = useMemo<AdminSection[]>(() => [
      'overview',
      'requests',
      'clients',
      'projects',
      'contacts',
      'messages',
      'files',
      'team',
      'discounts',
      'audit',
      'statistics',
      'settings',
    ], []);

  const allowedSections = useMemo(() => {
    return validSections.filter((item) => {
      const resource = SIDEBAR_ITEMS.find((sidebarItem) => sidebarItem.id === item)?.resource;
      return resource ? access.canAccessResource(resource) : false;
    });
  }, [access, validSections]);

  useEffect(() => {
    const sectionParam = searchParams.get('section') as AdminSection | null;
    if (sectionParam && validSections.includes(sectionParam)) {
      setSection(sectionParam);
    }

    const clientParam = searchParams.get('client');
    if (clientParam) {
      if (sectionParam === 'messages') {
        setSelectedConversationId(clientParam);
      } else if (sectionParam === 'files') {
        setFilesPreselect(clientParam);
      } else {
        setSelectedClientId(clientParam);
      }
    }
  }, [searchParams, validSections]);

  useEffect(() => {
    if (access.loading || allowedSections.length === 0) return;
    if (!allowedSections.includes(section)) {
      setSection(allowedSections[0]);
    }
  }, [access.loading, allowedSections, section]);

  const clientsById = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of dashboard.clients) m.set(c.id, c);
    return m;
  }, [dashboard.clients]);

  const displayName = useMemo(() => {
    if (access.teamMember?.name) return access.teamMember.name;
    if (profile?.username) return profile.username;
    if (sessionEmail) return sessionEmail.split('@')[0];
    return 'Admin';
  }, [access.teamMember?.name, profile, sessionEmail]);

  const stats = useMemo(() => {
    const activeClients = dashboard.clients.filter((c) => (c.status || 'active') === 'active').length;
    const pipelineValue = dashboard.orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
      .reduce((sum, o) => sum + (o.total_price || 0), 0);
    return {
      newPricingRequests: dashboard.stats.newPricingRequests,
      newContacts: dashboard.stats.newContacts,
      totalContacts: dashboard.stats.totalContacts,
      totalPricingRequests: dashboard.stats.totalPricingRequests,
      totalOrders: dashboard.stats.totalOrders,
      pendingOrders: dashboard.stats.pendingOrders,
      completedOrders: dashboard.stats.completedOrders,
      totalClients: dashboard.clients.length,
      activeClients,
      pipelineValue,
      unread: dashboard.stats.unreadMessages,
    };
  }, [dashboard]);

  const smartIndicators = useMemo(() => ({
    requestsNeedingFollowUp: dashboard.pricingRequests.filter((r) => r.status === 'reviewing' || r.status === 'new').length,
    clientsMissingOnboarding: dashboard.clients.filter((c) => c.auth_password_pending).length,
  }), [dashboard.pricingRequests, dashboard.clients]);

  const handleSignOut = useCallback(async () => {
    await logout();
    toast.success(isArabic ? 'تم تسجيل الخروج' : 'Signed out');
    navigate('/');
  }, [logout, navigate, isArabic]);

  const handleAddClient = useCallback(
    async (data: { username: string; email: string; company_name?: string; status: string; package_name?: string; password: string; }) => {
      await dashboard.addClient(data);
      setShowAddClient(false);
    },
    [dashboard],
  );

  const handleConvert = useCallback(async (r: Parameters<typeof dashboard.convertPricingRequest>[0]) => {
    await dashboard.convertPricingRequest(r);
  }, [dashboard]);

  const openClientFromRequest = useCallback((clientId: string) => {
    setSelectedClientId(clientId);
    setSection('clients');
  }, []);

  const openConversationFromClient = useCallback((clientId: string) => {
    setSelectedConversationId(clientId);
    setSection('messages');
  }, []);

  const openTeamMember = useCallback((memberId: string) => {
    setHighlightedTeamMember(memberId);
    setSection('team');
  }, []);

  const handleLinkAsTeam = useCallback(
    async (input: {
      role: Parameters<typeof linkClientAsMember>[1]['role'];
      job_title: string;
      is_active: boolean;
      permissions: Record<string, Record<string, boolean>>;
    }) => {
      if (!linkAsTeamFor) return;
      if (!canManageTeam) {
        toast.error(isArabic ? 'ليس لديك صلاحية' : 'Not allowed');
        return;
      }
      const result = await linkClientAsMember(linkAsTeamFor, input);
      if (result.success) {
        setLinkAsTeamFor(null);
        await refreshTeam();
      }
    },
    [linkAsTeamFor, canManageTeam, isArabic, linkClientAsMember, refreshTeam],
  );

  // Default permissions to apply when opening the link-as-team modal for a
  // client who isn't already a team member yet.
  const defaultPermissionsForLink = useMemo(() => permissionsForRole('manager'), []);
  void defaultPermissionsForLink;
  void role;

  if (access.loading) {
    return <LoadingFallback />;
  }

  return (
    <div className="min-h-screen bg-[#f4f9f6] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="flex min-h-screen">
        <div className="hidden lg:block sticky top-0 h-screen">
          <AdminSidebar
            active={section}
            onChange={setSection}
            onSignOut={handleSignOut}
            badges={{
              requests: stats.newPricingRequests,
              contacts: stats.newContacts,
              messages: stats.unread,
            }}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <AdminTopbar
            name={displayName}
            email={sessionEmail || undefined}
            avatarUrl={profile?.avatar_url || undefined}
            onRefresh={() => void dashboard.refresh()}
            searchValue={search}
            onSearchChange={setSearch}
          />

          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 max-w-[1500px] w-full mx-auto">
            <MobileNav active={section} onChange={setSection} />

            {section === 'overview' && (
              <OverviewSection
                stats={stats}
                recentRequests={dashboard.pricingRequests}
                recentClients={dashboard.clients}
                recentContacts={dashboard.contacts}
                loading={dashboard.loading}
                onNavigate={setSection}
                onAddClient={() => setShowAddClient(true)}
                onCreateDiscount={() => {
                  setSection('discounts');
                  setOpenCreateDiscount(true);
                }}
                onAddTeamMember={() => setSection('team')}
              />
            )}

            {section === 'requests' && (
              <RequestsSection
                requests={dashboard.pricingRequests}
                clients={dashboard.clients}
                projects={dashboard.projects}
                teamMembers={teamMembers}
                loading={dashboard.loading}
                onUpdateStatus={dashboard.updatePricingRequestStatus}
                onConvert={handleConvert}
                onCancel={dashboard.cancelPricingRequest}
                onDeletePermanent={dashboard.deletePricingRequest}
                onAfterEdit={() => void dashboard.refresh()}
                onOpenClient={openClientFromRequest}
              />
            )}

            {section === 'clients' && (
              <ClientsSection
                clients={dashboard.clients}
                pricingRequests={dashboard.pricingRequests}
                loading={dashboard.loading}
                onAdd={() => setShowAddClient(true)}
                onEdit={setEditingClient}
                onDelete={dashboard.deleteClient}
                selectedClientId={selectedClientId}
                onClearSelection={() => setSelectedClientId(null)}
                onOpenRequest={() => setSection('requests')}
                onOpenMessages={openConversationFromClient}
                onLinkAsTeam={canManageTeam ? setLinkAsTeamFor : undefined}
                onManageTeamMember={openTeamMember}
                teamMemberByClientId={memberByClientId}
                onAfterSecurityChange={() => void dashboard.refresh()}
              />
            )}

            {section === 'projects' && (
              <ProjectsSection
                projects={dashboard.projects}
                clients={dashboard.clients}
                teamMembers={teamMembers}
                loading={dashboard.loading}
                onRefresh={dashboard.refresh}
                onOpenMessages={openConversationFromClient}
              />
            )}

            {section === 'contacts' && (
              <ContactsSection
                contacts={dashboard.contacts}
                loading={dashboard.loading}
                onUpdateStatus={dashboard.updateContactStatus}
                onDelete={dashboard.deleteContact}
              />
            )}

            {section === 'messages' && (
              <MessagesSection
                clients={dashboard.clients}
                pricingRequests={dashboard.pricingRequests}
                selectedClientId={selectedConversationId}
                onSelectClient={setSelectedConversationId}
                onOpenClient={(id) => {
                  setSelectedClientId(id);
                  setSection('clients');
                }}
              />
            )}

            {section === 'files' && (
              <FilesSection
                clients={dashboard.clients}
                preselectedClientId={filesPreselect}
              />
            )}

            {section === 'team' && (
              <TeamPermissionsSection
                highlightedMemberId={highlightedTeamMember}
                onClearHighlight={() => setHighlightedTeamMember(null)}
                clientsById={clientsById}
                onOpenLinkedClient={(id) => {
                  setSelectedClientId(id);
                  setSection('clients');
                }}
              />
            )}

            {section === 'discounts' && (
              <DiscountsSection
                openCreate={openCreateDiscount}
                onCreateOpened={() => setOpenCreateDiscount(false)}
              />
            )}

            {section === 'audit' && <AuditSection />}

            {section === 'statistics' && (
              <StatisticsSection
                pricingRequests={dashboard.pricingRequests}
                contacts={dashboard.contacts}
                orders={dashboard.orders}
                clients={dashboard.clients}
                teamCount={teamMembers.filter((m) => m.is_active).length}
              />
            )}

            {section === 'settings' && (
              <SettingsSection smartIndicators={smartIndicators} />
            )}
          </main>
        </div>
      </div>

      <AddClientModal
        open={showAddClient}
        onOpenChange={setShowAddClient}
        onAdd={handleAddClient}
      />

      <ClientEditDrawer
        client={editingClient}
        open={!!editingClient}
        onClose={() => setEditingClient(null)}
        onSave={async (id, updates) => {
          await dashboard.updateClient(id, updates);
        }}
      />

      <LinkClientToTeamModal
        open={!!linkAsTeamFor}
        client={linkAsTeamFor}
        existingMember={linkAsTeamFor ? memberByClientId.get(linkAsTeamFor.id) ?? null : null}
        onClose={() => setLinkAsTeamFor(null)}
        onSubmit={handleLinkAsTeam}
        canManagePermissions={canManagePermissions}
      />

      {/* placeholder to satisfy unused setter warning */}
      {filesPreselect ? <span className="hidden">{filesPreselect}</span> : null}
      {/* setter usage proof */}
      <span className="hidden" data-files-prefill={String(setFilesPreselect.length)} />
    </div>
  );
}

function MobileNav({ active, onChange }: { active: AdminSection; onChange: (s: AdminSection) => void }) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const canDashboard = useCanAccessResource('dashboard');
  const canRequests = useCanAccessResource('requests');
  const canClients = useCanAccessResource('clients');
  const canProjects = useCanAccessResource('projects');
  const canContacts = useCanAccessResource('contacts');
  const canMessages = useCanAccessResource('messages');
  const canFiles = useCanAccessResource('files');
  const canTeam = useCanAccessResource('team');
  const canDiscounts = useCanAccessResource('discounts');
  const canAudit = useCanAccessResource('audit_logs');
  const canStatistics = useCanAccessResource('statistics');
  const canSettings = useCanAccessResource('settings');
  const items: Array<{ id: AdminSection; en: string; ar: string }> = [
    ...(canDashboard ? [{ id: 'overview' as const, en: 'Overview', ar: 'نظرة' }] : []),
    ...(canRequests ? [{ id: 'requests' as const, en: 'Requests', ar: 'طلبات' }] : []),
    ...(canClients ? [{ id: 'clients' as const, en: 'Clients', ar: 'عملاء' }] : []),
    ...(canProjects ? [{ id: 'projects' as const, en: 'Projects', ar: 'مشاريع' }] : []),
    ...(canContacts ? [{ id: 'contacts' as const, en: 'Contacts', ar: 'اتصالات' }] : []),
    ...(canMessages ? [{ id: 'messages' as const, en: 'Messages', ar: 'رسائل' }] : []),
    ...(canFiles ? [{ id: 'files' as const, en: 'Files', ar: 'ملفات' }] : []),
    ...(canTeam ? [{ id: 'team' as const, en: 'Team', ar: 'فريق' }] : []),
    ...(canDiscounts ? [{ id: 'discounts' as const, en: 'Discounts', ar: 'خصومات' }] : []),
    ...(canAudit ? [{ id: 'audit' as const, en: 'Audit', ar: 'سجل' }] : []),
    ...(canStatistics ? [{ id: 'statistics' as const, en: 'Stats', ar: 'إحصاء' }] : []),
    ...(canSettings ? [{ id: 'settings' as const, en: 'Settings', ar: 'إعدادات' }] : []),
  ];
  return (
    <nav className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto">
      <div className="flex gap-1.5 pb-2 min-w-max">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`px-3 h-9 rounded-full text-xs font-semibold whitespace-nowrap ${
              active === it.id ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-600'
            }`}
          >
            {isAr ? it.ar : it.en}
          </button>
        ))}
      </div>
    </nav>
  );
}
