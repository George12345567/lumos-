import { supabase } from '@/lib/supabaseClient';
import type { PricingRequest, PricingRequestItem } from '@/types/dashboard';

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type ProjectPaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';
export type ProjectServiceStatus =
  | 'not_started'
  | 'in_progress'
  | 'review'
  | 'changes_requested'
  | 'completed'
  | 'delivered';

export interface ProjectService {
  id: string;
  project_id: string;
  client_id?: string | null;
  service_name: string;
  service_key?: string | null;
  description?: string | null;
  status: ProjectServiceStatus;
  progress: number;
  assigned_to?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  sort_order?: number | null;
  admin_notes?: string | null;
  client_visible_notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  deliverables?: ProjectDeliverable[];
}

export interface ProjectDeliverable {
  id: string;
  client_id: string;
  file_name: string;
  file_url?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  category?: string | null;
  note?: string | null;
  storage_path?: string | null;
  uploaded_by?: string | null;
  uploaded_by_type?: 'admin' | 'team' | 'client' | string | null;
  asset_type?: string | null;
  identity_category?: string | null;
  is_identity_asset?: boolean | null;
  sort_order?: number | null;
  is_downloadable?: boolean | null;
  visibility?: 'client' | 'admin_only' | string | null;
  project_id?: string | null;
  project_service_id?: string | null;
  is_deliverable?: boolean | null;
  deliverable_status?: 'draft' | 'ready_for_review' | 'approved' | 'delivered' | string | null;
  published_to_identity?: boolean | null;
  published_to_identity_at?: string | null;
  identity_publish_on_delivery?: boolean | null;
  client_visible?: boolean | null;
  uploaded_at?: string | null;
  created_at?: string | null;
}

export interface Project {
  id: string;
  client_id?: string | null;
  pricing_request_id?: string | null;
  invoice_number?: string | null;
  project_name?: string | null;
  package_name?: string | null;
  status: ProjectStatus;
  payment_status: ProjectPaymentStatus;
  progress: number;
  total_amount?: number | null;
  currency?: string | null;
  started_at?: string | null;
  expected_delivery_at?: string | null;
  completed_at?: string | null;
  assigned_to?: string | null;
  admin_notes?: string | null;
  client_notes?: string | null;
  status_history?: Array<Record<string, unknown>>;
  created_at: string;
  updated_at?: string | null;
  services: ProjectService[];
  deliverables: ProjectDeliverable[];
}

export interface UploadProjectDeliverableInput {
  projectId: string;
  projectServiceId?: string | null;
  clientId: string;
  file: File;
  note?: string;
  clientVisible?: boolean;
  deliverableStatus?: 'draft' | 'ready_for_review' | 'approved' | 'delivered';
  publishToIdentity?: boolean;
  publishToIdentityOnDelivery?: boolean;
  identityCategory?: string | null;
}

export interface DeleteProjectResult {
  success: boolean;
  deletedProjectId?: string;
  detachedAssets?: number;
  error?: string;
}

const BUCKET = 'client-assets';

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const SERVICE_STATUS_PROGRESS: Record<ProjectServiceStatus, number> = {
  not_started: 0,
  in_progress: 35,
  review: 70,
  changes_requested: 60,
  completed: 90,
  delivered: 100,
};

function safeName(name: string): string {
  return name
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'deliverable';
}

function normalizeStoragePath(path?: string | null): string | null {
  const trimmed = (path ?? '').trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/^\/+/, '').replace(/^client-assets\//, '');
}

function getSupabaseError(error: unknown): SupabaseLikeError {
  if (error && typeof error === 'object') {
    return error as SupabaseLikeError;
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: String(error ?? 'Unknown Supabase error') };
}

function supabaseErrorMessage(error: unknown, fallback = 'Supabase request failed'): string {
  const parsed = getSupabaseError(error);
  return [parsed.code, parsed.message].filter(Boolean).join(': ') || fallback;
}

function logSupabaseError(
  scope: string,
  error: unknown,
  meta: Record<string, unknown> = {},
) {
  const parsed = getSupabaseError(error);
  console.error(`[${scope}] Supabase error`, {
    code: parsed.code,
    message: parsed.message,
    details: parsed.details,
    hint: parsed.hint,
    ...meta,
  });
}

function withServicesAndAssets(
  projects: Project[],
  services: ProjectService[],
  assets: ProjectDeliverable[],
) {
  const servicesByProject = new Map<string, ProjectService[]>();
  const assetsByProject = new Map<string, ProjectDeliverable[]>();
  const assetsByService = new Map<string, ProjectDeliverable[]>();

  for (const asset of assets) {
    if (asset.project_id) {
      const current = assetsByProject.get(asset.project_id) ?? [];
      current.push(asset);
      assetsByProject.set(asset.project_id, current);
    }
    if (asset.project_service_id) {
      const current = assetsByService.get(asset.project_service_id) ?? [];
      current.push(asset);
      assetsByService.set(asset.project_service_id, current);
    }
  }

  for (const service of services) {
    const current = servicesByProject.get(service.project_id) ?? [];
    current.push({
      ...service,
      deliverables: assetsByService.get(service.id) ?? [],
    });
    servicesByProject.set(service.project_id, current);
  }

  return projects.map((project) => ({
    ...project,
    services: (servicesByProject.get(project.id) ?? []).sort(
      (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
    ),
    deliverables: assetsByProject.get(project.id) ?? [],
  }));
}

export function serviceStatusProgress(status: ProjectServiceStatus) {
  return SERVICE_STATUS_PROGRESS[status] ?? 0;
}

function hasPostgrestMissingRow(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'PGRST116',
  );
}

function normalizeServices(services?: PricingRequestItem[] | null): PricingRequestItem[] {
  return Array.isArray(services) ? services.filter((service) => Boolean(service?.id || service?.name)) : [];
}

async function fetchPricingRequestById(requestId: string): Promise<PricingRequest | null> {
  const { data, error } = await supabase
    .from('pricing_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) {
    logSupabaseError('projectService.fetchPricingRequestById', error, {
      table: 'pricing_requests',
      query: 'pricing_requests by id',
      requestId,
      pricingRequestId: requestId,
    });
    throw error;
  }
  return (data as PricingRequest) ?? null;
}

async function fetchProjectById(projectId?: string | null): Promise<Project | null> {
  if (!projectId) return null;
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error && !hasPostgrestMissingRow(error)) {
    logSupabaseError('projectService.fetchProjectById', error, {
      table: 'projects',
      query: 'projects by id',
      projectId,
    });
    throw error;
  }
  return data ? { ...(data as Project), services: [], deliverables: [] } : null;
}

async function fetchProjectByRequestId(requestId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('pricing_request_id', requestId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && !hasPostgrestMissingRow(error)) {
    logSupabaseError('projectService.fetchProjectByRequestId', error, {
      table: 'projects',
      query: 'projects by pricing_request_id',
      requestId,
      pricingRequestId: requestId,
    });
    throw error;
  }
  return data ? { ...(data as Project), services: [], deliverables: [] } : null;
}

async function ensureProjectServices(projectId: string, request: PricingRequest): Promise<void> {
  const selectedServices = normalizeServices(request.selected_services);
  if (selectedServices.length === 0) return;

  const { data: existing, error: existingError } = await supabase
    .from('project_services')
    .select('id, service_key')
    .eq('project_id', projectId);

  if (existingError) {
    logSupabaseError('projectService.ensureProjectServices.select', existingError, {
      table: 'project_services',
      query: 'project_services by project_id',
      projectId,
      requestId: request.id,
      pricingRequestId: request.id,
      invoiceNumber: request.invoice_number,
    });
    throw existingError;
  }

  const existingKeys = new Set(((existing as Array<{ service_key?: string | null }>) ?? []).map((row) => row.service_key).filter(Boolean));
  const missingServices = selectedServices.filter((service) => !existingKeys.has(service.id));
  if (missingServices.length === 0) return;

  const rows = missingServices.map((service, index) => ({
    project_id: projectId,
    client_id: request.client_id ?? null,
    service_name: service.name || service.nameAr || service.id,
    service_key: service.id,
    description: service.category ? `Client-selected ${service.category} service.` : 'Client-selected service.',
    status: 'not_started',
    progress: 0,
    sort_order: index + existingKeys.size,
  }));

  const { error: insertError } = await supabase
    .from('project_services')
    .insert(rows);

  if (insertError) {
    logSupabaseError('projectService.ensureProjectServices.insert', insertError, {
      table: 'project_services',
      query: 'insert missing project_services',
      projectId,
      requestId: request.id,
      pricingRequestId: request.id,
      invoiceNumber: request.invoice_number,
      serviceCount: rows.length,
    });
    throw insertError;
  }
}

async function markRequestConverted(requestId: string, projectId: string): Promise<void> {
  const { error } = await supabase
    .from('pricing_requests')
    .update({
      converted_project_id: projectId,
      status: 'converted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    logSupabaseError('projectService.markRequestConverted', error, {
      table: 'pricing_requests',
      query: 'update converted_project_id/status',
      requestId,
      pricingRequestId: requestId,
      projectId,
    });
    throw error;
  }
}

export async function fetchAdminProjects(): Promise<Project[]> {
  try {
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);

    if (projectsError) {
      logSupabaseError('projectService.fetchAdminProjects', projectsError, {
        table: 'projects',
        query: 'admin projects list',
      });
      throw projectsError;
    }
    const projects = ((projectsData as Project[]) ?? []).map((project) => ({
      ...project,
      services: [],
      deliverables: [],
    }));
    const projectIds = projects.map((project) => project.id);
    if (projectIds.length === 0) return projects;

    const [servicesResult, assetsResult] = await Promise.all([
      supabase
        .from('project_services')
        .select('*')
        .in('project_id', projectIds)
        .order('sort_order', { ascending: true }),
      supabase
        .from('client_assets')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false }),
    ]);

    if (servicesResult.error) {
      logSupabaseError('projectService.fetchAdminProjects.services', servicesResult.error, {
        table: 'project_services',
        query: 'project_services by project IDs',
        projectIds,
      });
      throw servicesResult.error;
    }
    if (assetsResult.error) {
      logSupabaseError('projectService.fetchAdminProjects.assets', assetsResult.error, {
        table: 'client_assets',
        query: 'client_assets by project IDs',
        projectIds,
      });
      throw assetsResult.error;
    }

    return withServicesAndAssets(
      projects,
      (servicesResult.data as ProjectService[]) ?? [],
      (assetsResult.data as ProjectDeliverable[]) ?? [],
    );
  } catch (error) {
    logSupabaseError('projectService.fetchAdminProjects.catch', error, {
      query: 'admin project fetch',
    });
    return [];
  }
}

export async function fetchClientProjects(clientId: string): Promise<Project[]> {
  try {
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select([
        'id',
        'client_id',
        'pricing_request_id',
        'invoice_number',
        'project_name',
        'package_name',
        'status',
        'progress',
        'started_at',
        'expected_delivery_at',
        'completed_at',
        'client_notes',
        'created_at',
        'updated_at',
      ].join(','))
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false });

    if (projectsError) {
      logSupabaseError('projectService.fetchClientProjects', projectsError, {
        table: 'projects',
        query: 'client projects by client_id',
        clientId,
      });
      throw projectsError;
    }
    const projects = ((projectsData as Project[]) ?? []).map((project) => ({
      ...project,
      payment_status: project.payment_status ?? 'unpaid',
      services: [],
      deliverables: [],
    }));
    const projectIds = projects.map((project) => project.id);
    if (projectIds.length === 0) return projects;

    const [servicesResult, assetsResult] = await Promise.all([
      supabase
        .from('project_services')
        .select([
          'id',
          'project_id',
          'client_id',
          'service_name',
          'service_key',
          'description',
          'status',
          'progress',
          'started_at',
          'completed_at',
          'sort_order',
          'client_visible_notes',
          'created_at',
          'updated_at',
        ].join(','))
        .in('project_id', projectIds)
        .order('sort_order', { ascending: true }),
      supabase
        .from('client_assets')
        .select([
          'id',
          'client_id',
          'file_name',
          'file_url',
          'file_type',
          'file_size',
          'category',
          'note',
          'storage_path',
          'asset_type',
          'identity_category',
          'is_identity_asset',
          'sort_order',
          'is_downloadable',
          'visibility',
          'project_id',
          'project_service_id',
          'is_deliverable',
          'deliverable_status',
          'published_to_identity',
          'published_to_identity_at',
          'identity_publish_on_delivery',
          'client_visible',
          'uploaded_at',
          'created_at',
        ].join(','))
        .eq('client_id', clientId)
        .eq('client_visible', true)
        .eq('visibility', 'client')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false }),
    ]);

    if (servicesResult.error) {
      logSupabaseError('projectService.fetchClientProjects.services', servicesResult.error, {
        table: 'project_services',
        query: 'client-visible project services by project IDs',
        clientId,
        projectIds,
      });
      throw servicesResult.error;
    }
    if (assetsResult.error) {
      logSupabaseError('projectService.fetchClientProjects.assets', assetsResult.error, {
        table: 'client_assets',
        query: 'client-visible project assets by project IDs',
        clientId,
        projectIds,
      });
      throw assetsResult.error;
    }

    return withServicesAndAssets(
      projects,
      (servicesResult.data as ProjectService[]) ?? [],
      (assetsResult.data as ProjectDeliverable[]) ?? [],
    );
  } catch (error) {
    logSupabaseError('projectService.fetchClientProjects.catch', error, {
      query: 'client project fetch',
      clientId,
    });
    return [];
  }
}

export async function createProjectFromPricingRequest(
  requestOrId: PricingRequest | string,
): Promise<{ success: boolean; projectId?: string; project?: Project; error?: string }> {
  try {
    const requestId = typeof requestOrId === 'string' ? requestOrId : requestOrId.id;
    const request = typeof requestOrId === 'string'
      ? await fetchPricingRequestById(requestId)
      : requestOrId;

    if (!request?.id) {
      return { success: false, error: 'pricing_request_not_found' };
    }

    const requestMeta = {
      requestId: request.id,
      pricingRequestId: request.id,
      invoiceNumber: request.invoice_number,
      convertedProjectId: request.converted_project_id,
    };

    const linkedProject = await fetchProjectById(request.converted_project_id);
    if (request.converted_project_id && linkedProject) {
      await ensureProjectServices(linkedProject.id, request);
      return { success: true, projectId: linkedProject.id, project: linkedProject };
    }

    const existingByRequest = await fetchProjectByRequestId(request.id);
    if (existingByRequest) {
      await ensureProjectServices(existingByRequest.id, request);
      await markRequestConverted(request.id, existingByRequest.id);
      return { success: true, projectId: existingByRequest.id, project: existingByRequest };
    }

    const { data, error } = await supabase.rpc('create_project_from_pricing_request', {
      p_request_id: request.id,
    });
    if (error) {
      logSupabaseError('projectService.createProjectFromPricingRequest.rpc', error, {
        rpc: 'create_project_from_pricing_request',
        ...requestMeta,
      });
      throw error;
    }

    const projectId = typeof data === 'string' ? data : data?.id;
    const createdProject = (await fetchProjectById(projectId)) || (await fetchProjectByRequestId(request.id));
    if (!createdProject) {
      return { success: false, error: 'project_creation_not_confirmed' };
    }

    await ensureProjectServices(createdProject.id, request);
    await markRequestConverted(request.id, createdProject.id);
    return { success: true, projectId: createdProject.id, project: createdProject };
  } catch (error) {
    logSupabaseError('projectService.createProjectFromPricingRequest.catch', error, {
      query: 'pricing request to project conversion',
      requestId: typeof requestOrId === 'string' ? requestOrId : requestOrId.id,
      pricingRequestId: typeof requestOrId === 'string' ? requestOrId : requestOrId.id,
      invoiceNumber: typeof requestOrId === 'string' ? undefined : requestOrId.invoice_number,
      convertedProjectId: typeof requestOrId === 'string' ? undefined : requestOrId.converted_project_id,
    });
    const message = supabaseErrorMessage(error, 'project_creation_failed');
    return { success: false, error: message };
  }
}

export async function updateProject(
  projectId: string,
  updates: Partial<Pick<Project,
    | 'project_name'
    | 'status'
    | 'payment_status'
    | 'expected_delivery_at'
    | 'assigned_to'
    | 'admin_notes'
    | 'client_notes'
  >>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );
    const { error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', projectId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'project_update_failed' };
  }
}

export async function updateProjectService(
  serviceId: string,
  updates: Partial<Pick<ProjectService,
    | 'status'
    | 'progress'
    | 'assigned_to'
    | 'admin_notes'
    | 'client_visible_notes'
    | 'description'
  >>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Record<string, unknown> = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );
    if (updates.status && updates.progress === undefined) {
      payload.progress = serviceStatusProgress(updates.status);
    }

    const { error } = await supabase
      .from('project_services')
      .update(payload)
      .eq('id', serviceId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'project_service_update_failed' };
  }
}

export async function uploadProjectDeliverable(
  input: UploadProjectDeliverableInput,
): Promise<{ success: boolean; asset?: ProjectDeliverable; error?: string }> {
  const status = input.deliverableStatus ?? 'ready_for_review';
  const clientVisible = input.clientVisible ?? true;
  const path = `${input.clientId}/projects/${input.projectId}/${input.projectServiceId || 'project'}/${Date.now()}-${safeName(input.file.name)}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, input.file, {
        cacheControl: '3600',
        contentType: input.file.type || undefined,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: sessionData } = await supabase.auth.getSession();
    const uploaderId = sessionData?.session?.user?.id ?? null;
    const publishToIdentity = Boolean(input.publishToIdentity && input.identityCategory);
    const publishToIdentityOnDelivery = Boolean(
      !publishToIdentity && input.publishToIdentityOnDelivery && input.identityCategory,
    );

    const insertPayload: Record<string, unknown> = {
      client_id: input.clientId,
      file_name: input.file.name,
      file_url: path,
      file_size: input.file.size,
      file_type: input.file.type || null,
      category: publishToIdentity ? 'identity' : 'project_deliverable',
      note: input.note || null,
      storage_path: path,
      uploaded_by: uploaderId,
      uploaded_by_type: 'admin',
      asset_type: input.file.type || null,
      project_id: input.projectId,
      project_service_id: input.projectServiceId || null,
      is_deliverable: true,
      deliverable_status: status,
      client_visible: clientVisible,
      visibility: clientVisible ? 'client' : 'admin_only',
      is_downloadable: clientVisible,
      is_identity_asset: publishToIdentity,
      identity_category: publishToIdentity || publishToIdentityOnDelivery ? input.identityCategory : null,
      published_to_identity: publishToIdentity,
      published_to_identity_at: publishToIdentity ? new Date().toISOString() : null,
      identity_publish_on_delivery: publishToIdentityOnDelivery,
    };

    const { data, error: insertError } = await supabase
      .from('client_assets')
      .insert([insertPayload])
      .select('*')
      .single();

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw insertError;
    }

    return { success: true, asset: data as ProjectDeliverable };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'deliverable_upload_failed' };
  }
}

export async function publishProjectDeliverableToIdentity(
  assetId: string,
  identityCategory: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('client_assets')
      .update({
        category: 'identity',
        identity_category: identityCategory,
        is_identity_asset: true,
        visibility: 'client',
        client_visible: true,
        is_downloadable: true,
        published_to_identity: true,
        published_to_identity_at: new Date().toISOString(),
        identity_publish_on_delivery: false,
      })
      .eq('id', assetId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'identity_publish_failed' };
  }
}

export async function markProjectDeliverableDelivered(assetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('client_assets')
      .update({
        deliverable_status: 'delivered',
        client_visible: true,
        visibility: 'client',
        is_downloadable: true,
      })
      .eq('id', assetId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'deliverable_update_failed' };
  }
}

export async function deleteProjectPermanently(
  projectId: string,
  invoiceConfirmation: string,
): Promise<DeleteProjectResult> {
  try {
    const { data, error } = await supabase.rpc('delete_project_permanently', {
      p_project_id: projectId,
      p_invoice_confirmation: invoiceConfirmation,
    });

    if (error) {
      logSupabaseError('projectService.deleteProjectPermanently.rpc', error, {
        rpc: 'delete_project_permanently',
        projectId,
      });
      throw error;
    }

    const payload = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    if (!payload || payload.success !== true) {
      return {
        success: false,
        error: typeof payload?.error === 'string' ? payload.error : 'project_delete_failed',
      };
    }

    return {
      success: true,
      deletedProjectId: typeof payload.deleted_project_id === 'string' ? payload.deleted_project_id : projectId,
      detachedAssets: Number(payload.detached_assets ?? 0),
    };
  } catch (error) {
    logSupabaseError('projectService.deleteProjectPermanently.catch', error, {
      query: 'delete project permanently',
      projectId,
    });
    return { success: false, error: supabaseErrorMessage(error, 'project_delete_failed') };
  }
}

export async function getProjectAssetSignedUrl(
  assetOrPath: ProjectDeliverable | string,
  expiresIn = 60 * 10,
): Promise<string | null> {
  const path = typeof assetOrPath === 'string'
    ? normalizeStoragePath(assetOrPath)
    : normalizeStoragePath(assetOrPath.storage_path) || normalizeStoragePath(assetOrPath.file_url);

  if (!path) return null;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export const projectService = {
  fetchAdminProjects,
  fetchClientProjects,
  createProjectFromPricingRequest,
  updateProject,
  updateProjectService,
  uploadProjectDeliverable,
  publishProjectDeliverableToIdentity,
  markProjectDeliverableDelivered,
  deleteProjectPermanently,
  getProjectAssetSignedUrl,
  serviceStatusProgress,
};

export default projectService;
