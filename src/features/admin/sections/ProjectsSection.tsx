import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  Download,
  FileIcon,
  FolderOpen,
  MessageSquare,
  PackageCheck,
  Palette,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Client, TeamMember } from '@/types/dashboard';
import {
  getProjectAssetSignedUrl,
  markProjectDeliverableDelivered,
  projectService,
  publishProjectDeliverableToIdentity,
  type Project,
  type ProjectDeliverable,
  type ProjectService,
  type ProjectServiceStatus,
} from '@/services/projectService';
import { IDENTITY_ASSET_CATEGORIES } from '@/services/clientIdentityService';
import {
  EmptyState,
  SectionHeader,
  SoftBadge,
  SoftButton,
  SoftCard,
} from '../components/primitives';
import { AdminDrawer } from '../components/AdminDrawer';
import { useAdminPermission } from '../hooks/useAdminPermission';

interface ProjectsSectionProps {
  projects: Project[];
  clients: Client[];
  teamMembers: TeamMember[];
  loading: boolean;
  onRefresh: () => void | Promise<void>;
  onOpenMessages?: (clientId: string) => void;
}

const PROJECT_STATUS: Record<Project['status'], { en: string; ar: string; tone: 'emerald' | 'amber' | 'slate' | 'rose' }> = {
  active: { en: 'Active', ar: 'نشط', tone: 'emerald' },
  paused: { en: 'Paused', ar: 'متوقف', tone: 'amber' },
  completed: { en: 'Completed', ar: 'مكتمل', tone: 'emerald' },
  cancelled: { en: 'Cancelled', ar: 'ملغي', tone: 'rose' },
};

const PAYMENT_STATUS: Record<Project['payment_status'], { en: string; ar: string; tone: 'emerald' | 'amber' | 'slate' | 'rose' }> = {
  unpaid: { en: 'Unpaid', ar: 'غير مدفوع', tone: 'amber' },
  partial: { en: 'Partial', ar: 'جزئي', tone: 'slate' },
  paid: { en: 'Paid', ar: 'مدفوع', tone: 'emerald' },
  refunded: { en: 'Refunded', ar: 'مسترد', tone: 'rose' },
};

const SERVICE_STATUS: Record<ProjectServiceStatus, { en: string; ar: string; tone: 'emerald' | 'amber' | 'slate' | 'sky' | 'violet' | 'rose' }> = {
  not_started: { en: 'Not started', ar: 'لم يبدأ', tone: 'slate' },
  in_progress: { en: 'In progress', ar: 'قيد التنفيذ', tone: 'sky' },
  review: { en: 'Under review', ar: 'قيد المراجعة', tone: 'violet' },
  changes_requested: { en: 'Changes requested', ar: 'تعديلات مطلوبة', tone: 'amber' },
  completed: { en: 'Completed', ar: 'مكتمل', tone: 'emerald' },
  delivered: { en: 'Delivered', ar: 'مسلّم', tone: 'emerald' },
};

const SERVICE_ACTIONS: Array<{ status: ProjectServiceStatus; en: string; ar: string }> = [
  { status: 'in_progress', en: 'Mark In Progress', ar: 'بدء التنفيذ' },
  { status: 'review', en: 'Send to Review', ar: 'إرسال للمراجعة' },
  { status: 'completed', en: 'Mark Completed', ar: 'تحديد كمكتمل' },
  { status: 'delivered', en: 'Deliver to Client', ar: 'تسليم للعميل' },
];

const IDENTITY_KEYWORDS = ['logo', 'brand', 'identity', 'colors', 'typography', 'social', 'guide', 'kit'];
type ProjectStatusFilter = 'all' | Project['status'];

function label(isAr: boolean, item: { en: string; ar: string }) {
  return isAr ? item.ar : item.en;
}

function formatDate(value?: string | null, isAr = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(isAr ? 'ar' : 'en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function initials(value?: string | null) {
  return (value || 'L').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'L';
}

function currentService(project: Project) {
  return project.services.find((service) => ['in_progress', 'review', 'changes_requested'].includes(service.status))
    ?? project.services.find((service) => !['completed', 'delivered'].includes(service.status))
    ?? project.services[0]
    ?? null;
}

function projectClientName(project: Project, client?: Client | null) {
  return client?.company_name || client?.full_contact_name || client?.username || project.project_name || 'Unlinked client';
}

function clampProgress(value?: number | null) {
  return Math.max(0, Math.min(100, Number(value ?? 0)));
}

function isIdentityRelated(service: ProjectService) {
  const haystack = `${service.service_name} ${service.description || ''}`.toLowerCase();
  return IDENTITY_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export function ProjectsSection({
  projects,
  clients,
  teamMembers,
  loading,
  onRefresh,
  onOpenMessages,
}: ProjectsSectionProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const canEdit = useAdminPermission('projects', 'edit');
  const canDelete = useAdminPermission('projects', 'delete');
  const canAssign = useAdminPermission('projects', 'assign');
  const canUploadProjects = useAdminPermission('projects', 'upload');
  const canUploadFiles = useAdminPermission('files', 'upload');
  const canUpload = canUploadProjects || canUploadFiles;

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const memberById = useMemo(() => new Map(teamMembers.map((member) => [member.id, member])), [teamMembers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter !== 'all' && project.status !== statusFilter) return false;
      if (!term) return true;
      const client = project.client_id ? clientById.get(project.client_id) : null;
      const haystack = [
        project.project_name,
        project.package_name,
        project.invoice_number,
        client?.company_name,
        client?.full_contact_name,
        client?.email,
        ...project.services.map((service) => service.service_name),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [clientById, projects, search, statusFilter]);

  const stats = useMemo(() => {
    const active = projects.filter((project) => project.status === 'active').length;
    const delivered = projects.filter((project) => project.status === 'completed').length;
    const needsReview = projects.filter((project) => project.services.some((service) => service.status === 'review')).length;
    const duplicateGroups = new Map<string, number>();
    projects.forEach((project) => {
      if (!project.pricing_request_id) return;
      duplicateGroups.set(project.pricing_request_id, (duplicateGroups.get(project.pricing_request_id) ?? 0) + 1);
    });
    const duplicates = Array.from(duplicateGroups.values()).filter((count) => count > 1).length;

    return [
      { label: isAr ? 'كل المشاريع' : 'Total projects', value: projects.length, tone: 'emerald' as const },
      { label: isAr ? 'نشطة' : 'Active', value: active, tone: 'sky' as const },
      { label: isAr ? 'في المراجعة' : 'In review', value: needsReview, tone: 'violet' as const },
      { label: isAr ? 'مكتملة' : 'Completed', value: delivered, tone: 'emerald' as const },
      { label: isAr ? 'تكرارات' : 'Duplicates', value: duplicates, tone: duplicates > 0 ? 'rose' as const : 'slate' as const },
    ];
  }, [isAr, projects]);

  const selected = selectedId ? projects.find((project) => project.id === selectedId) ?? null : null;
  const filters: Array<{ id: ProjectStatusFilter; label: string }> = [
    { id: 'all', label: t('الكل', 'All') },
    { id: 'active', label: label(isAr, PROJECT_STATUS.active) },
    { id: 'paused', label: label(isAr, PROJECT_STATUS.paused) },
    { id: 'completed', label: label(isAr, PROJECT_STATUS.completed) },
    { id: 'cancelled', label: label(isAr, PROJECT_STATUS.cancelled) },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t('مساحة تنفيذ المشاريع', 'Project Workroom')}
        subtitle={t(
          'تابع كل مشروع وخدماته وملفاته القابلة للتسليم من مصدر بيانات حقيقي.',
          'Track each project, selected service, and deliverable from real project data.',
        )}
        actions={
          <SoftButton variant="outline" size="md" onClick={() => void onRefresh()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('تحديث', 'Refresh')}
          </SoftButton>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => (
          <SoftCard key={item.label} className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold text-foreground tabular-nums">{item.value}</p>
              <SoftBadge tone={item.tone}>{item.value === 1 ? t('عنصر', 'item') : t('عناصر', 'items')}</SoftBadge>
            </div>
          </SoftCard>
        ))}
      </div>

      <SoftCard className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id)}
                className={`h-9 rounded-full px-3 text-xs font-semibold transition ${
                  statusFilter === item.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('بحث بالعميل أو الفاتورة أو الخدمة…', 'Search client, invoice, or service…')}
              className="h-10 w-full rounded-full border border-slate-200/60 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-white/10 dark:bg-slate-900"
            />
          </div>
        </div>
      </SoftCard>

      {loading ? (
        <SoftCard className="overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid gap-3 border-b border-emerald-900/5 p-4 last:border-b-0 lg:grid-cols-[minmax(220px,1.3fr)_120px_120px_150px_120px_150px]">
              <div className="h-10 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </SoftCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={projects.length === 0 ? t('لا توجد مشاريع حقيقية بعد', 'No real projects yet') : t('لا توجد نتائج', 'No matching projects')}
          description={projects.length === 0
            ? t(
                'أنشئ مشروعاً من طلب تسعير معتمد ليظهر هنا مع الخدمات المختارة.',
                'Create a project from an approved pricing request to see its selected services here.',
              )
            : t('غيّر البحث أو الفلتر لعرض مشاريع أخرى.', 'Adjust search or filters to see other projects.')}
        />
      ) : (
        <SoftCard className="overflow-hidden">
          <div className="hidden border-b border-emerald-900/5 bg-slate-50/80 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900/70 lg:grid lg:grid-cols-[minmax(220px,1.3fr)_120px_130px_150px_130px_170px]">
            <span>{t('المشروع / العميل', 'Project / Client')}</span>
            <span>{t('الفاتورة', 'Invoice')}</span>
            <span>{t('الحالة', 'Status')}</span>
            <span>{t('الخدمة الحالية', 'Current service')}</span>
            <span>{t('المسؤول', 'Assigned')}</span>
            <span className="text-right">{t('الإجراءات', 'Actions')}</span>
          </div>
          {filtered.map((project) => {
            const client = project.client_id ? clientById.get(project.client_id) : null;
            const assigned = project.assigned_to ? memberById.get(project.assigned_to) : null;
            const activeService = currentService(project);
            const status = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.active;
            const progress = clampProgress(project.progress);
            return (
              <article
                key={project.id}
                className="grid gap-3 border-b border-emerald-900/5 p-4 last:border-b-0 lg:grid-cols-[minmax(220px,1.3fr)_120px_130px_150px_130px_170px] lg:items-center"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white">
                    {initials(projectClientName(project, client))}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {project.project_name || project.package_name || t('مشروع لوموس', 'Lumos project')}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {projectClientName(project, client)}
                    </p>
                    <div className="mt-2 flex items-center gap-2 lg:hidden">
                      <SoftBadge tone={status.tone}>{label(isAr, status)}</SoftBadge>
                      <span className="text-[11px] font-mono font-semibold text-emerald-700">{project.invoice_number || '—'}</span>
                    </div>
                  </div>
                </div>

                <span className="hidden text-xs font-mono font-semibold text-emerald-700 lg:block">
                  {project.invoice_number || '—'}
                </span>

                <div className="space-y-2">
                  <SoftBadge tone={status.tone}>{label(isAr, status)}</SoftBadge>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-emerald-50">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600">{progress}%</span>
                  </div>
                </div>

                <div className="min-w-0 text-xs">
                  <p className="truncate font-semibold text-foreground">{activeService?.service_name || t('لا يوجد', 'None')}</p>
                  <p className="mt-1 text-slate-500">{project.services.length} {t('خدمة', 'services')}</p>
                </div>

                <div className="min-w-0 text-xs">
                  <p className="truncate font-semibold text-foreground">{assigned?.name || t('غير معين', 'Unassigned')}</p>
                  <p className="mt-1 text-slate-500">{formatDate(project.expected_delivery_at, isAr)}</p>
                </div>

                <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                  <SoftButton variant="primary" size="sm" onClick={() => setSelectedId(project.id)}>
                    <FolderOpen className="h-3.5 w-3.5" />
                    {t('فتح', 'Open')}
                  </SoftButton>
                  {project.client_id && onOpenMessages ? (
                    <SoftButton variant="outline" size="sm" onClick={() => onOpenMessages(project.client_id!)}>
                      <MessageSquare className="h-3.5 w-3.5" />
                      {t('رسالة', 'Message')}
                    </SoftButton>
                  ) : null}
                  <SoftButton
                    variant="danger"
                    size="sm"
                    disabled={!canDelete}
                    onClick={() => setDeleteTarget(project)}
                    title={canDelete ? t('حذف نهائي', 'Delete permanently') : t('لا تملك صلاحية الحذف', 'You do not have delete permission')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </SoftButton>
                </div>
              </article>
            );
          })}
        </SoftCard>
      )}

      <ProjectDrawer
        project={selected}
        clients={clients}
        teamMembers={teamMembers}
        canEdit={canEdit}
        canAssign={canAssign}
        canUpload={canUpload}
        onClose={() => setSelectedId(null)}
        onRefresh={onRefresh}
        onOpenMessages={onOpenMessages}
      />
      <DeleteProjectDialog
        project={deleteTarget}
        clientName={deleteTarget?.client_id ? projectClientName(deleteTarget, clientById.get(deleteTarget.client_id)) : undefined}
        onClose={() => setDeleteTarget(null)}
        onDeleted={async (projectId) => {
          if (selectedId === projectId) setSelectedId(null);
          setDeleteTarget(null);
          await onRefresh();
        }}
      />
    </div>
  );
}

function DeleteProjectDialog({
  project,
  clientName,
  onClose,
  onDeleted,
}: {
  project: Project | null;
  clientName?: string;
  onClose: () => void;
  onDeleted: (projectId: string) => void | Promise<void>;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const invoice = project?.invoice_number || '';
  const canSubmit = Boolean(project && invoice && confirmation.trim() === invoice);

  const close = () => {
    if (deleting) return;
    setConfirmation('');
    onClose();
  };

  const remove = async () => {
    if (!project || !canSubmit) return;
    setDeleting(true);
    try {
      const result = await projectService.deleteProjectPermanently(project.id, confirmation);
      if (!result.success) {
        toast.error(result.error || t('تعذر حذف المشروع', 'Could not delete project'));
        return;
      }
      toast.success(t('تم حذف المشروع نهائياً', 'Project permanently deleted'));
      await onDeleted(project.id);
      setConfirmation('');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={!!project} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
            {t('حذف المشروع نهائياً', 'Delete Project Permanently')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'هذا الإجراء يحذف صف المشروع وخدماته من قاعدة البيانات بعد تأكيد Supabase.',
              'This deletes the project row and its service workroom rows only after Supabase confirms success.',
            )}
          </DialogDescription>
        </DialogHeader>

        {project ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-sm text-rose-900">
              <p className="font-semibold">{project.project_name || project.package_name || t('مشروع لوموس', 'Lumos project')}</p>
              <p className="mt-1 text-xs">{clientName || t('عميل غير محدد', 'Unlinked client')}</p>
              <p className="mt-2 font-mono text-xs font-bold">{invoice || t('لا يوجد رقم فاتورة', 'No invoice number')}</p>
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 p-4 text-xs leading-6 text-muted-foreground">
              <p>
                {t(
                  'سيتم حذف خدمات المشروع تلقائياً. التسليمات الموجودة في client_assets أو التخزين الخاص لا تُنشر للعامة ولا تُحذف من التخزين هنا؛ روابط المشروع تُفصل بواسطة قيود قاعدة البيانات.',
                  'Project services are deleted by cascade. Existing client_assets/private storage deliverables are not made public and are not storage-deleted here; project links are detached by database constraints.',
                )}
              </p>
              <p className="mt-2">
                {t(
                  'اكتب رقم الفاتورة بالضبط لتأكيد الحذف.',
                  'Type the invoice number exactly to confirm deletion.',
                )}
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {t('تأكيد رقم الفاتورة', 'Invoice confirmation')}
              </span>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={invoice}
                disabled={deleting || !invoice}
                className={inputCls}
              />
            </label>
          </div>
        ) : null}

        <DialogFooter>
          <SoftButton variant="ghost" size="sm" onClick={close} disabled={deleting}>
            {t('إلغاء', 'Cancel')}
          </SoftButton>
          <SoftButton variant="danger" size="sm" onClick={() => void remove()} disabled={!canSubmit || deleting}>
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? t('جارٍ الحذف…', 'Deleting…') : t('حذف نهائي', 'Delete permanently')}
          </SoftButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DrawerTab = 'summary' | 'services' | 'files' | 'messages' | 'client' | 'timeline' | 'notes';

function ProjectDrawer({
  project,
  clients,
  teamMembers,
  canEdit,
  canAssign,
  canUpload,
  onClose,
  onRefresh,
  onOpenMessages,
}: {
  project: Project | null;
  clients: Client[];
  teamMembers: TeamMember[];
  canEdit: boolean;
  canAssign: boolean;
  canUpload: boolean;
  onClose: () => void;
  onRefresh: () => void | Promise<void>;
  onOpenMessages?: (clientId: string) => void;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [tab, setTab] = useState<DrawerTab>('summary');
  const [saving, setSaving] = useState(false);

  if (!project) return null;

  const client = project.client_id ? clients.find((item) => item.id === project.client_id) : null;
  const assigned = project.assigned_to ? teamMembers.find((member) => member.id === project.assigned_to) : null;
  const activeService = currentService(project);
  const status = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.active;
  const payment = PAYMENT_STATUS[project.payment_status] ?? PAYMENT_STATUS.unpaid;

  const updateProjectField = async (updates: Parameters<typeof projectService.updateProject>[1]) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const result = await projectService.updateProject(project.id, updates);
      if (!result.success) {
        toast.error(result.error || t('تعذر تحديث المشروع', 'Could not update project'));
        return;
      }
      toast.success(t('تم تحديث المشروع', 'Project updated'));
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ id: DrawerTab; en: string; ar: string }> = [
    { id: 'summary', en: 'Summary', ar: 'الملخص' },
    { id: 'services', en: 'Services', ar: 'الخدمات' },
    { id: 'files', en: 'Files', ar: 'الملفات' },
    { id: 'messages', en: 'Messages', ar: 'الرسائل' },
    { id: 'client', en: 'Client', ar: 'العميل' },
    { id: 'timeline', en: 'Timeline', ar: 'الخط الزمني' },
    { id: 'notes', en: 'Admin Notes', ar: 'ملاحظات الإدارة' },
  ];

  return (
    <AdminDrawer
      open={!!project}
      onOpenChange={(open) => !open && onClose()}
      title={project.project_name || project.package_name || t('مشروع', 'Project')}
      subtitle={project.invoice_number || client?.email || ''}
      width="xl"
      badge={<SoftBadge tone={status.tone}>{label(isAr, status)}</SoftBadge>}
    >
      <div className="space-y-5">
        <SoftCard className="p-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {client?.company_name || client?.full_contact_name || t('عميل غير محدد', 'Unlinked client')}
              </p>
              <h3 className="mt-1 text-xl font-bold text-foreground truncate">
                {project.project_name || project.package_name || t('مشروع لوموس', 'Lumos project')}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {activeService
                  ? t(`الخدمة الحالية: ${activeService.service_name}`, `Current service: ${activeService.service_name}`)
                  : t('لا توجد خدمات مضافة بعد.', 'No services have been added yet.')}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <SoftBadge tone={payment.tone}>{label(isAr, payment)}</SoftBadge>
              <p className="mt-2 text-2xl font-bold text-foreground">{project.progress || 0}%</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-emerald-50 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, project.progress || 0))}%` }} />
          </div>
        </SoftCard>

        <div className="flex flex-wrap gap-1.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 h-8 rounded-full text-xs font-semibold ${
                tab === item.id ? 'bg-slate-900 text-white' : 'bg-white ring-1 ring-slate-200 text-slate-600 hover:ring-slate-300'
              }`}
            >
              {isAr ? item.ar : item.en}
            </button>
          ))}
        </div>

        {tab === 'summary' && (
          <SoftCard className="p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('الباقة', 'Package')}>{project.package_name}</Field>
              <Field label={t('رقم الفاتورة', 'Invoice')}>{project.invoice_number}</Field>
              <Field label={t('بدأ في', 'Started')}>{formatDate(project.started_at || project.created_at, isAr)}</Field>
              <Field label={t('التسليم المتوقع', 'Expected delivery')}>{formatDate(project.expected_delivery_at, isAr)}</Field>
              <Field label={t('المسؤول', 'Assigned')}>{assigned?.name || t('غير معين', 'Unassigned')}</Field>
              <Field label={t('المبلغ', 'Amount')}>
                {project.total_amount ? `${new Intl.NumberFormat(isAr ? 'ar' : 'en').format(project.total_amount)} ${project.currency || 'EGP'}` : '—'}
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField
                label={t('حالة المشروع', 'Project status')}
                value={project.status}
                disabled={!canEdit || saving}
                onChange={(value) => void updateProjectField({ status: value as Project['status'] })}
                options={Object.entries(PROJECT_STATUS).map(([value, config]) => ({ value, label: label(isAr, config) }))}
              />
              <SelectField
                label={t('حالة الدفع', 'Payment status')}
                value={project.payment_status}
                disabled={!canEdit || saving}
                onChange={(value) => void updateProjectField({ payment_status: value as Project['payment_status'] })}
                options={Object.entries(PAYMENT_STATUS).map(([value, config]) => ({ value, label: label(isAr, config) }))}
              />
              <SelectField
                label={t('تعيين', 'Assign')}
                value={project.assigned_to || ''}
                disabled={!canAssign || saving}
                onChange={(value) => void updateProjectField({ assigned_to: value || null })}
                options={[
                  { value: '', label: t('غير معين', 'Unassigned') },
                  ...teamMembers.filter((member) => member.is_active).map((member) => ({ value: member.id, label: `${member.name} · ${member.role}` })),
                ]}
              />
            </div>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
                {t('التسليم المتوقع', 'Expected delivery')}
              </span>
              <input
                type="date"
                disabled={!canEdit || saving}
                value={project.expected_delivery_at ? project.expected_delivery_at.slice(0, 10) : ''}
                onChange={(event) => void updateProjectField({ expected_delivery_at: event.target.value ? new Date(event.target.value).toISOString() : null })}
                className={inputCls}
              />
            </label>
          </SoftCard>
        )}

        {tab === 'services' && (
          <div className="space-y-3">
            {project.services.length === 0 ? (
              <EmptyState
                icon={PackageCheck}
                title={t('لا توجد خدمات', 'No services')}
                description={t('هذا المشروع لا يحتوي على خدمات مختارة بعد.', 'This project has no selected services yet.')}
              />
            ) : (
              project.services.map((service) => (
                <ServiceWorkroom
                  key={service.id}
                  service={service}
                  project={project}
                  teamMembers={teamMembers}
                  canEdit={canEdit}
                  canAssign={canAssign}
                  canUpload={canUpload}
                  isAr={isAr}
                  onRefresh={onRefresh}
                />
              ))
            )}
          </div>
        )}

        {tab === 'files' && (
          <FilesPanel
            files={project.deliverables}
            isAr={isAr}
            canEdit={canEdit}
            onRefresh={onRefresh}
          />
        )}

        {tab === 'messages' && (
          <SoftCard className="p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {t('تواصل مع العميل عن هذا المشروع', 'Message the client about this project')}
            </p>
            <p className="text-sm text-slate-500">
              {t('المحادثات الحقيقية تبقى في قسم الرسائل حتى لا نكرر نظام رسائل جديد هنا.', 'Real conversations stay in Messages so project updates use the existing message system.')}
            </p>
            {project.client_id && onOpenMessages ? (
              <SoftButton variant="primary" size="sm" onClick={() => onOpenMessages(project.client_id!)}>
                <Send className="w-3.5 h-3.5" />
                {t('فتح رسائل العميل', 'Open client messages')}
              </SoftButton>
            ) : null}
          </SoftCard>
        )}

        {tab === 'client' && (
          <SoftCard className="p-5 grid gap-3 sm:grid-cols-2">
            <Field label={t('الشركة', 'Company')}>{client?.company_name}</Field>
            <Field label={t('الاسم', 'Name')}>{client?.full_contact_name || client?.username}</Field>
            <Field label={t('البريد', 'Email')}>{client?.email}</Field>
            <Field label={t('الهاتف', 'Phone')}>{client?.phone || client?.phone_number}</Field>
            <Field label={t('المجال', 'Industry')}>{client?.industry}</Field>
            <Field label={t('الهوية', 'Identity')}>{client?.brand_feel}</Field>
          </SoftCard>
        )}

        {tab === 'timeline' && (
          <SoftCard className="p-5">
            <ol className="relative border-l border-emerald-900/10 pl-5 space-y-4">
              {[
                { label: t('تم استلام الطلب', 'Request received'), done: true, date: project.created_at },
                { label: t('بدأ المشروع', 'Project started'), done: Boolean(project.started_at), date: project.started_at },
                { label: activeService ? activeService.service_name : t('تنفيذ الخدمات', 'Service execution'), done: Boolean(activeService), date: activeService?.updated_at },
                { label: t('المراجعة', 'Review'), done: project.services.some((service) => service.status === 'review' || service.status === 'completed' || service.status === 'delivered') },
                { label: t('التسليم', 'Delivery'), done: project.services.every((service) => service.status === 'delivered') && project.services.length > 0, date: project.completed_at },
              ].map((item, index) => (
                <li key={index} className="relative">
                  <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ring-2 ring-white ${item.done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.date ? formatDate(item.date, isAr) : t('بانتظار', 'Pending')}</p>
                </li>
              ))}
            </ol>
          </SoftCard>
        )}

        {tab === 'notes' && (
          <NotesPanel
            project={project}
            canEdit={canEdit}
            isAr={isAr}
            onSave={updateProjectField}
          />
        )}
      </div>
    </AdminDrawer>
  );
}

function ServiceWorkroom({
  service,
  project,
  teamMembers,
  canEdit,
  canAssign,
  canUpload,
  isAr,
  onRefresh,
}: {
  service: ProjectService;
  project: Project;
  teamMembers: TeamMember[];
  canEdit: boolean;
  canAssign: boolean;
  canUpload: boolean;
  isAr: boolean;
  onRefresh: () => void | Promise<void>;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [adminNotes, setAdminNotes] = useState(service.admin_notes || '');
  const [clientNotes, setClientNotes] = useState(service.client_visible_notes || '');
  const [saving, setSaving] = useState(false);
  const cfg = SERVICE_STATUS[service.status] ?? SERVICE_STATUS.not_started;
  const identitySuggested = isIdentityRelated(service);

  const update = async (updates: Parameters<typeof projectService.updateProjectService>[1]) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const result = await projectService.updateProjectService(service.id, updates);
      if (!result.success) {
        toast.error(result.error || t('تعذر تحديث الخدمة', 'Could not update service'));
        return;
      }
      toast.success(t('تم تحديث الخدمة', 'Service updated'));
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SoftCard className="p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-bold text-foreground truncate">{service.service_name}</h4>
            <SoftBadge tone={cfg.tone}>{label(isAr, cfg)}</SoftBadge>
            {identitySuggested ? <SoftBadge tone="violet" icon={Palette}>{t('هوية', 'Identity')}</SoftBadge> : null}
          </div>
          {service.description ? <p className="mt-1 text-xs text-slate-500">{service.description}</p> : null}
        </div>
        <span className="text-2xl font-bold text-emerald-700">{service.progress || 0}%</span>
      </div>

      <div className="h-2 rounded-full bg-emerald-50 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, service.progress || 0))}%` }} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField
          label={t('الحالة', 'Status')}
          value={service.status}
          disabled={!canEdit || saving}
          onChange={(value) => void update({ status: value as ProjectServiceStatus })}
          options={Object.entries(SERVICE_STATUS).map(([value, config]) => ({ value, label: label(isAr, config) }))}
        />
        <SelectField
          label={t('الموظف المسؤول', 'Assigned employee')}
          value={service.assigned_to || ''}
          disabled={!canAssign || saving}
          onChange={(value) => void update({ assigned_to: value || null })}
          options={[
            { value: '', label: t('غير معين', 'Unassigned') },
            ...teamMembers.filter((member) => member.is_active).map((member) => ({ value: member.id, label: `${member.name} · ${member.role}` })),
          ]}
        />
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
            {t('التقدم', 'Progress')}
          </span>
          <input
            type="number"
            min={0}
            max={100}
            disabled={!canEdit || saving}
            defaultValue={service.progress || 0}
            onBlur={(event) => void update({ progress: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })}
            className={inputCls}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {SERVICE_ACTIONS.map((action) => (
          <SoftButton
            key={action.status}
            variant={action.status === 'delivered' ? 'primary' : 'soft'}
            size="sm"
            disabled={!canEdit || saving || service.status === action.status}
            onClick={() => void update({ status: action.status })}
          >
            {action.status === 'delivered' ? <PackageCheck className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {label(isAr, action)}
          </SoftButton>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
            {t('ملاحظات إدارية', 'Admin notes')}
          </span>
          <textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} disabled={!canEdit} rows={3} className={`${inputCls} h-auto py-2`} />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
            {t('ملاحظات للعميل', 'Client-visible notes')}
          </span>
          <textarea value={clientNotes} onChange={(event) => setClientNotes(event.target.value)} disabled={!canEdit} rows={3} className={`${inputCls} h-auto py-2`} />
        </label>
      </div>
      <SoftButton
        variant="outline"
        size="sm"
        disabled={!canEdit || saving}
        onClick={() => void update({ admin_notes: adminNotes, client_visible_notes: clientNotes })}
      >
        <BadgeCheck className="w-3.5 h-3.5" />
        {t('حفظ الملاحظات', 'Save notes')}
      </SoftButton>

      <ServiceFiles
        service={service}
        project={project}
        identitySuggested={identitySuggested}
        isAr={isAr}
        canUpload={canUpload}
        canEdit={canEdit}
        onRefresh={onRefresh}
      />
    </SoftCard>
  );
}

function ServiceFiles({
  service,
  project,
  identitySuggested,
  isAr,
  canUpload,
  canEdit,
  onRefresh,
}: {
  service: ProjectService;
  project: Project;
  identitySuggested: boolean;
  isAr: boolean;
  canUpload: boolean;
  canEdit: boolean;
  onRefresh: () => void | Promise<void>;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [visibility, setVisibility] = useState<'client' | 'admin_only'>('client');
  const [publishMode, setPublishMode] = useState<'project' | 'identity' | 'identity_on_delivery' | 'admin_only'>('project');
  const [identityCategory, setIdentityCategory] = useState('logo_primary');
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!file || !project.client_id) return;
    setUploading(true);
    try {
      const result = await projectService.uploadProjectDeliverable({
        projectId: project.id,
        projectServiceId: service.id,
        clientId: project.client_id,
        file,
        note: note || undefined,
        clientVisible: visibility === 'client' && publishMode !== 'admin_only',
        deliverableStatus: service.status === 'delivered' ? 'delivered' : 'ready_for_review',
        publishToIdentity: publishMode === 'identity',
        publishToIdentityOnDelivery: publishMode === 'identity_on_delivery',
        identityCategory: publishMode === 'identity' || publishMode === 'identity_on_delivery' ? identityCategory : null,
      });
      if (!result.success) {
        toast.error(result.error || t('تعذر رفع الملف', 'Could not upload file'));
        return;
      }
      toast.success(t('تم رفع الملف', 'Deliverable uploaded'));
      setFile(null);
      setNote('');
      await onRefresh();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pt-4 border-t border-emerald-900/5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
          {t('الملفات والتسليمات', 'Files & Deliverables')}
        </p>
        <SoftBadge tone="slate">{service.deliverables?.length || 0}</SoftBadge>
      </div>

      {identitySuggested ? (
        <p className="rounded-2xl bg-violet-50 text-violet-800 ring-1 ring-violet-100 px-3 py-2 text-xs">
          {t(
            'يبدو أن هذه خدمة هوية. يمكنك نشر الملف أيضاً في قسم Identity للعميل.',
            'This looks like a brand identity deliverable. You can also publish it to the client Identity section.',
          )}
        </p>
      ) : null}

      {service.deliverables?.length ? (
        <div className="grid gap-2">
          {service.deliverables.map((asset) => (
            <DeliverableRow key={asset.id} asset={asset} isAr={isAr} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          {t('لم يتم رفع تسليمات لهذه الخدمة بعد.', 'No deliverables have been uploaded for this service yet.')}
        </p>
      )}

      <div className="grid gap-2 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-white/10 p-3 sm:grid-cols-2">
        <input
          type="file"
          disabled={!canUpload || uploading}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
        />
        <select
          value={publishMode}
          disabled={!canUpload || uploading}
          onChange={(event) => {
            const next = event.target.value as typeof publishMode;
            setPublishMode(next);
            if (next === 'admin_only') setVisibility('admin_only');
            if (next === 'identity' || next === 'identity_on_delivery') setVisibility('client');
          }}
          className={inputCls}
        >
          <option value="project">{t('إرفاق بالمشروع فقط', 'Attach to project only')}</option>
          <option value="identity">{t('نشر أيضاً في Identity', 'Also publish to Identity')}</option>
          <option value="identity_on_delivery">{t('نشر في Identity عند التسليم', 'Publish to Identity when delivered')}</option>
          <option value="admin_only">{t('إدارة فقط', 'Admin only')}</option>
        </select>
        {publishMode === 'identity' || publishMode === 'identity_on_delivery' ? (
          <select value={identityCategory} onChange={(event) => setIdentityCategory(event.target.value)} className={inputCls}>
            {IDENTITY_ASSET_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>{isAr ? category.labelAr : category.label}</option>
            ))}
          </select>
        ) : (
          <select value={visibility} disabled={publishMode === 'admin_only'} onChange={(event) => setVisibility(event.target.value as typeof visibility)} className={inputCls}>
            <option value="client">{t('مرئي للعميل', 'Client visible')}</option>
            <option value="admin_only">{t('داخلي فقط', 'Internal only')}</option>
          </select>
        )}
        <input
          value={note}
          disabled={!canUpload || uploading}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('ملاحظة للملف...', 'File note...')}
          className={inputCls}
        />
        <div className="sm:col-span-2">
          <SoftButton variant="primary" size="sm" disabled={!canUpload || !file || uploading || !project.client_id} onClick={() => void upload()}>
            <Upload className="w-3.5 h-3.5" />
            {uploading ? t('جارٍ الرفع…', 'Uploading…') : t('رفع تسليم', 'Upload deliverable')}
          </SoftButton>
        </div>
      </div>
    </div>
  );
}

function FilesPanel({
  files,
  isAr,
  canEdit,
  onRefresh,
}: {
  files: ProjectDeliverable[];
  isAr: boolean;
  canEdit: boolean;
  onRefresh: () => void | Promise<void>;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  return (
    <SoftCard className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">{t('مركز التحميل', 'Download Center')}</p>
        <SoftBadge tone="slate">{files.length}</SoftBadge>
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-slate-500">
          {t('ستظهر التسليمات هنا بعد رفعها من الخدمات.', 'Deliverables will appear here once uploaded from services.')}
        </p>
      ) : (
        <div className="grid gap-2">
          {files.map((file) => (
            <DeliverableRow key={file.id} asset={file} isAr={isAr} canEdit={canEdit} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </SoftCard>
  );
}

function DeliverableRow({
  asset,
  isAr,
  canEdit,
  onRefresh,
}: {
  asset: ProjectDeliverable;
  isAr: boolean;
  canEdit: boolean;
  onRefresh: () => void | Promise<void>;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [identityCategory, setIdentityCategory] = useState(asset.identity_category || 'logo_primary');
  const [busy, setBusy] = useState(false);

  const open = async () => {
    const url = await getProjectAssetSignedUrl(asset);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const publish = async () => {
    setBusy(true);
    try {
      const result = await publishProjectDeliverableToIdentity(asset.id, identityCategory);
      if (!result.success) {
        toast.error(result.error || t('تعذر النشر في الهوية', 'Could not publish to Identity'));
        return;
      }
      toast.success(t('تم النشر في الهوية', 'Published to Identity'));
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const deliver = async () => {
    setBusy(true);
    try {
      const result = await markProjectDeliverableDelivered(asset.id);
      if (!result.success) {
        toast.error(result.error || t('تعذر تسليم الملف', 'Could not deliver file'));
        return;
      }
      toast.success(t('تم تسليم الملف للعميل', 'File delivered to client'));
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-white/10 p-3 sm:flex-row sm:items-center">
      <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
        <FileIcon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{asset.file_name}</p>
        <p className="text-[11px] text-slate-500">
          {asset.deliverable_status || 'draft'} · {asset.client_visible ? t('مرئي للعميل', 'Client visible') : t('داخلي', 'Internal')}
          {asset.published_to_identity ? ` · ${t('في الهوية', 'In Identity')}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <SoftButton variant="soft" size="sm" onClick={() => void open()}>
          <Download className="w-3.5 h-3.5" />
          {t('فتح', 'Open')}
        </SoftButton>
        {canEdit ? (
          <>
            <SoftButton variant="outline" size="sm" disabled={busy} onClick={() => void deliver()}>
              <Clock className="w-3.5 h-3.5" />
              {t('تسليم', 'Deliver')}
            </SoftButton>
            {!asset.published_to_identity ? (
              <span className="inline-flex items-center gap-1">
                <select value={identityCategory} onChange={(event) => setIdentityCategory(event.target.value)} className="h-8 rounded-full text-[11px] border border-slate-200 px-2 bg-white">
                  {IDENTITY_ASSET_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>{isAr ? category.labelAr : category.label}</option>
                  ))}
                </select>
                <SoftButton variant="outline" size="sm" disabled={busy} onClick={() => void publish()}>
                  <Palette className="w-3.5 h-3.5" />
                  {t('نشر للهوية', 'Publish Identity')}
                </SoftButton>
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function NotesPanel({
  project,
  canEdit,
  isAr,
  onSave,
}: {
  project: Project;
  canEdit: boolean;
  isAr: boolean;
  onSave: (updates: Parameters<typeof projectService.updateProject>[1]) => Promise<void>;
}) {
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [adminNotes, setAdminNotes] = useState(project.admin_notes || '');
  const [clientNotes, setClientNotes] = useState(project.client_notes || '');

  return (
    <SoftCard className="p-5 space-y-4">
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
          {t('ملاحظات إدارية داخلية', 'Internal admin notes')}
        </span>
        <textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} disabled={!canEdit} rows={5} className={`${inputCls} h-auto py-2`} />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">
          {t('ملاحظات مرئية للعميل', 'Client-visible notes')}
        </span>
        <textarea value={clientNotes} onChange={(event) => setClientNotes(event.target.value)} disabled={!canEdit} rows={4} className={`${inputCls} h-auto py-2`} />
      </label>
      <SoftButton variant="primary" size="sm" disabled={!canEdit} onClick={() => void onSave({ admin_notes: adminNotes, client_notes: clientNotes })}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t('حفظ الملاحظات', 'Save notes')}
      </SoftButton>
    </SoftCard>
  );
}

function SelectField({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1 block">{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={inputCls}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function Field({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="text-sm text-foreground mt-0.5">{children || <span className="text-slate-400">—</span>}</div>
    </div>
  );
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50';
