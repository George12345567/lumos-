import { supabase } from '@/lib/supabaseClient';

export type IdentityAssetCategory =
  | 'logo_primary'
  | 'logo_secondary'
  | 'logo_icon'
  | 'logo_monochrome'
  | 'logo_light'
  | 'logo_dark'
  | 'brand_guide'
  | 'color_palette'
  | 'typography'
  | 'social_media_kit'
  | 'social_avatar'
  | 'social_cover'
  | 'icon'
  | 'pattern'
  | 'template'
  | 'other';

export type IdentityAssetVisibility = 'client' | 'admin_only';

export interface IdentityColor {
  label?: string;
  hex: string;
  usage?: string;
}

export interface IdentityTypography {
  primary?: string;
  secondary?: string;
  heading?: string;
  body?: string;
  usage_notes?: string;
  [key: string]: unknown;
}

export interface ClientIdentity {
  id: string;
  client_id: string;
  brand_name?: string | null;
  tagline?: string | null;
  industry?: string | null;
  brand_description?: string | null;
  brand_voice?: string | null;
  brand_feel?: string | null;
  target_audience?: string | null;
  typography: IdentityTypography;
  color_palette: IdentityColor[];
  social_links: Record<string, string>;
  usage_notes?: string | null;
  public_notes?: string | null;
  internal_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ClientIdentityAsset {
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
  uploaded_by_type?: string | null;
  asset_type?: string | null;
  identity_category?: IdentityAssetCategory | string | null;
  is_identity_asset?: boolean | null;
  sort_order?: number | null;
  is_downloadable?: boolean | null;
  visibility?: IdentityAssetVisibility | string | null;
  project_id?: string | null;
  project_service_id?: string | null;
  is_deliverable?: boolean | null;
  deliverable_status?: string | null;
  published_to_identity?: boolean | null;
  published_to_identity_at?: string | null;
  identity_publish_on_delivery?: boolean | null;
  client_visible?: boolean | null;
  created_at?: string | null;
  uploaded_at?: string | null;
}

export interface ClientIdentitySnapshot {
  identity: ClientIdentity | null;
  assets: ClientIdentityAsset[];
}

export const IDENTITY_ASSET_CATEGORIES: Array<{ value: IdentityAssetCategory; label: string; labelAr: string }> = [
  { value: 'logo_primary', label: 'Primary Logo', labelAr: 'الشعار الأساسي' },
  { value: 'logo_secondary', label: 'Secondary Logo', labelAr: 'الشعار الثانوي' },
  { value: 'logo_icon', label: 'Icon / Favicon', labelAr: 'الأيقونة' },
  { value: 'logo_monochrome', label: 'Monochrome Logo', labelAr: 'شعار أحادي' },
  { value: 'logo_light', label: 'Light Background Logo', labelAr: 'شعار للخلفية الفاتحة' },
  { value: 'logo_dark', label: 'Dark Background Logo', labelAr: 'شعار للخلفية الداكنة' },
  { value: 'brand_guide', label: 'Brand Guide', labelAr: 'دليل الهوية' },
  { value: 'color_palette', label: 'Color Palette', labelAr: 'لوحة الألوان' },
  { value: 'typography', label: 'Typography', labelAr: 'الخطوط' },
  { value: 'social_media_kit', label: 'Social Media Kit', labelAr: 'حزمة السوشيال ميديا' },
  { value: 'social_avatar', label: 'Social Avatar', labelAr: 'صورة اجتماعية' },
  { value: 'social_cover', label: 'Social Cover', labelAr: 'غلاف اجتماعي' },
  { value: 'icon', label: 'Icon', labelAr: 'أيقونة' },
  { value: 'pattern', label: 'Pattern', labelAr: 'نمط' },
  { value: 'template', label: 'Template', labelAr: 'قالب' },
  { value: 'other', label: 'Other', labelAr: 'أخرى' },
];

const BUCKET = 'client-assets';

function safeName(name: string): string {
  return name
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'identity-asset';
}

function normalizeStoragePath(path?: string | null): string | null {
  const trimmed = (path ?? '').trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/^\/+/, '').replace(/^client-assets\//, '');
}

function stripUndefined<T extends Record<string, unknown>>(payload: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function sortAssets(assets: ClientIdentityAsset[]) {
  return assets.slice().sort((a, b) => {
    const order = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    if (order !== 0) return order;
    const ad = a.created_at || a.uploaded_at || '';
    const bd = b.created_at || b.uploaded_at || '';
    return bd.localeCompare(ad);
  });
}

export function identityCategoryLabel(category?: string | null, isArabic = false) {
  const match = IDENTITY_ASSET_CATEGORIES.find((item) => item.value === category);
  return match ? (isArabic ? match.labelAr : match.label) : category || (isArabic ? 'أخرى' : 'Other');
}

export function identityAssetTimestamp(asset: Pick<ClientIdentityAsset, 'created_at' | 'uploaded_at'>) {
  return asset.created_at || asset.uploaded_at || null;
}

export function identityFileType(asset: Pick<ClientIdentityAsset, 'file_type' | 'file_name' | 'file_url'>) {
  if (asset.file_type) return asset.file_type;
  const source = (asset.file_name || asset.file_url || '').toLowerCase();
  const ext = source.split('?')[0].split('#')[0].split('.').pop() || '';
  return ext && ext.length <= 5 ? ext : '';
}

export function isIdentityImage(asset: Pick<ClientIdentityAsset, 'file_type' | 'file_name' | 'file_url'>) {
  const type = identityFileType(asset).toLowerCase();
  return asset.file_type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(type);
}

export function getIdentityAssetStoragePath(asset: ClientIdentityAsset): string | null {
  return normalizeStoragePath(asset.storage_path) || normalizeStoragePath(asset.file_url);
}

export async function fetchClientIdentitySnapshot(
  clientId: string,
  options: { includeAdminOnly?: boolean } = {},
): Promise<ClientIdentitySnapshot> {
  try {
    const [identityResult, assetsResult] = await Promise.all([
      supabase
        .from('client_identity')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle(),
      (() => {
        let query = supabase
          .from('client_assets')
          .select('*')
          .eq('client_id', clientId)
          .eq('is_identity_asset', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (!options.includeAdminOnly) {
          query = query.eq('visibility', 'client').eq('is_downloadable', true);
        }

        return query;
      })(),
    ]);

    if (identityResult.error) throw identityResult.error;
    if (assetsResult.error) throw assetsResult.error;

    return {
      identity: (identityResult.data as ClientIdentity | null) ?? null,
      assets: sortAssets((assetsResult.data as ClientIdentityAsset[]) ?? []),
    };
  } catch (error) {
    console.error('fetchClientIdentitySnapshot failed:', error);
    return { identity: null, assets: [] };
  }
}

export async function upsertClientIdentity(
  clientId: string,
  data: Partial<Omit<ClientIdentity, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
): Promise<{ success: boolean; identity?: ClientIdentity; error?: string }> {
  try {
    const payload = stripUndefined({
      client_id: clientId,
      ...data,
      updated_at: new Date().toISOString(),
    });

    const { data: identity, error } = await supabase
      .from('client_identity')
      .upsert(payload, { onConflict: 'client_id' })
      .select('*')
      .single();

    if (error) throw error;
    return { success: true, identity: identity as ClientIdentity };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'identity_save_failed' };
  }
}

export async function getIdentityAssetSignedUrl(
  assetOrPath: ClientIdentityAsset | string,
  expiresIn = 60 * 10,
): Promise<string | null> {
  const path = typeof assetOrPath === 'string'
    ? normalizeStoragePath(assetOrPath)
    : getIdentityAssetStoragePath(assetOrPath);

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

export async function uploadIdentityAsset(input: {
  clientId: string;
  file: File;
  category: IdentityAssetCategory;
  visibility: IdentityAssetVisibility;
  note?: string;
  sortOrder?: number;
}): Promise<{ success: boolean; asset?: ClientIdentityAsset; signedUrl?: string; error?: string }> {
  const path = `${input.clientId}/identity/${input.category}/${Date.now()}-${safeName(input.file.name)}`;

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

    const insertPayload: Record<string, unknown> = {
      client_id: input.clientId,
      file_name: input.file.name,
      file_url: path,
      file_size: input.file.size,
      file_type: input.file.type || null,
      category: 'identity',
      note: input.note || null,
      storage_path: path,
      uploaded_by: uploaderId,
      uploaded_by_type: 'admin',
      asset_type: input.file.type || identityFileType({ file_name: input.file.name, file_type: null, file_url: path }) || null,
      identity_category: input.category,
      is_identity_asset: true,
      sort_order: input.sortOrder ?? 0,
      is_downloadable: true,
      visibility: input.visibility,
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

    const signedUrl = await getIdentityAssetSignedUrl(path);
    return { success: true, asset: data as ClientIdentityAsset, signedUrl: signedUrl ?? undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'identity_upload_failed' };
  }
}

export async function deleteIdentityAsset(asset: ClientIdentityAsset): Promise<{ success: boolean; error?: string }> {
  try {
    const path = getIdentityAssetStoragePath(asset);
    if (path) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([path]);
      if (storageError) throw storageError;
    }

    const { error } = await supabase
      .from('client_assets')
      .delete()
      .eq('id', asset.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'identity_delete_failed' };
  }
}

export const clientIdentityService = {
  fetchClientIdentitySnapshot,
  upsertClientIdentity,
  uploadIdentityAsset,
  deleteIdentityAsset,
  getIdentityAssetSignedUrl,
};
