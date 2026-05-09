export type ClientAssetPlacementSource = {
  client_visible?: boolean | null;
  visibility?: string | null;
  is_downloadable?: boolean | null;
  project_id?: string | null;
  project_service_id?: string | null;
  deliverable_status?: string | null;
  category?: string | null;
  asset_type?: string | null;
  file_type?: string | null;
  is_identity_asset?: boolean | null;
  published_to_identity?: boolean | null;
  identity_category?: string | null;
  placement_project_hub?: boolean | null;
  placement_action_center?: boolean | null;
  placement_files_library?: boolean | null;
  placement_brand_kit?: boolean | null;
};

export type ClientAssetPlacements = {
  appearsInProjectHub: boolean;
  appearsInActions: boolean;
  appearsInBrandKit: boolean;
  appearsInFilesLibrary: boolean;
  identityCategory: string | null;
  clientVisible: boolean;
};

function explicitBoolean(value: boolean | null | undefined): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function normalized(value?: string | null) {
  return String(value ?? '').trim().toLowerCase();
}

export function isClientVisibleAsset(asset: ClientAssetPlacementSource) {
  return asset.client_visible !== false
    && normalized(asset.visibility) !== 'admin_only'
    && asset.is_downloadable !== false;
}

export function isReviewAsset(asset: ClientAssetPlacementSource) {
  const status = normalized(asset.deliverable_status);
  return ['review', 'ready_for_review', 'needs_review', 'waiting_approval', 'pending_approval'].includes(status);
}

export function isInvoiceAsset(asset: ClientAssetPlacementSource) {
  const haystack = [
    asset.category,
    asset.asset_type,
    asset.file_type,
  ].map(normalized).join(' ');

  return /\binvoice\b|\breceipt\b|payment/.test(haystack);
}

export function getClientAssetPlacements(asset: ClientAssetPlacementSource): ClientAssetPlacements {
  const clientVisible = isClientVisibleAsset(asset);
  const identityCategory = normalized(asset.identity_category) || null;
  const projectLinked = Boolean(asset.project_id || asset.project_service_id);
  const invoice = isInvoiceAsset(asset);

  const brandKitExplicit = explicitBoolean(asset.placement_brand_kit);
  const filesLibraryExplicit = explicitBoolean(asset.placement_files_library);
  const projectHubExplicit = explicitBoolean(asset.placement_project_hub);
  const actionExplicit = explicitBoolean(asset.placement_action_center);

  const defaultBrandKit = Boolean(
    asset.is_identity_asset
      && asset.published_to_identity
      && identityCategory,
  );

  return {
    clientVisible,
    identityCategory,
    appearsInBrandKit: clientVisible && (brandKitExplicit ?? defaultBrandKit),
    appearsInFilesLibrary: clientVisible && (filesLibraryExplicit ?? true),
    appearsInProjectHub: clientVisible && !invoice && (projectHubExplicit ?? projectLinked),
    appearsInActions: clientVisible && (actionExplicit ?? isReviewAsset(asset)),
  };
}

export function clientAssetStatusLabel(status?: string | null) {
  const value = normalized(status);
  if (!value) return 'File';
  if (value === 'ready_for_review' || value === 'needs_review') return 'Needs Review';
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function clientAssetPlacementLabels(asset: ClientAssetPlacementSource) {
  const placements = getClientAssetPlacements(asset);
  const labels: string[] = [];

  if (placements.appearsInProjectHub) labels.push('Project Hub');
  if (placements.appearsInActions) labels.push('Client Actions');
  if (placements.appearsInBrandKit) labels.push('Brand Kit');
  if (placements.appearsInFilesLibrary) labels.push('Files Library');
  if (!placements.clientVisible) labels.push('Admin only');

  return labels;
}
