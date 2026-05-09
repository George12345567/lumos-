import { supabase } from '@/lib/supabaseClient';
import { logSupabaseError } from '@/services/supabaseErrorLogger';

export interface PortalMessage {
  id: string;
  client_id: string;
  message: string;
  sender: 'client' | 'team' | string;
  sender_id?: string | null;
  sender_name?: string | null;
  is_read?: boolean | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  created_at: string;
}

export interface PortalAsset {
  id: string;
  client_id?: string;
  name?: string;
  asset_url?: string;
  file_url?: string | null;
  file_name?: string | null;
  uploaded_by?: string | null;
  uploaded_by_type?: string | null;
  category?: string | null;
  note?: string | null;
  file_size?: number | null;
  storage_path?: string | null;
  file_type?: string | null;
  asset_type?: string | null;
  identity_category?: string | null;
  is_identity_asset?: boolean | null;
  sort_order?: number | null;
  is_downloadable?: boolean | null;
  visibility?: string | null;
  project_id?: string | null;
  project_service_id?: string | null;
  is_deliverable?: boolean | null;
  deliverable_status?: string | null;
  published_to_identity?: boolean | null;
  published_to_identity_at?: string | null;
  identity_publish_on_delivery?: boolean | null;
  client_visible?: boolean | null;
  placement_project_hub?: boolean | null;
  placement_action_center?: boolean | null;
  placement_files_library?: boolean | null;
  placement_brand_kit?: boolean | null;
  uploaded_at?: string | null;
  created_at?: string;
}

export interface PortalSnapshot {
  messages: PortalMessage[];
  assets: PortalAsset[];
}

export async function sendMessage(clientId: string, message: string): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('client_messages')
      .insert({ client_id: clientId, message, sender: 'client' });
    if (error) {
      logSupabaseError('clientPortalService.sendMessage', error, {
        clientId,
        payload: { client_id: clientId, message, sender: 'client' },
      });
    }
    return { success: !error };
  } catch (error) {
    logSupabaseError('clientPortalService.sendMessage.catch', error, {
      clientId,
      payload: { client_id: clientId, message, sender: 'client' },
    });
    return { success: false };
  }
}

export async function getMessages(clientId: string): Promise<PortalMessage[]> {
  try {
    const { data, error } = await supabase
      .from('client_messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    if (error) {
      logSupabaseError('clientPortalService.getMessages', error, {
        clientId,
        query: 'client_messages by client_id',
      });
      return [];
    }
    if (!data) return [];
    return data as PortalMessage[];
  } catch (error) {
    logSupabaseError('clientPortalService.getMessages.catch', error, {
      clientId,
      query: 'client_messages by client_id',
    });
    return [];
  }
}

export async function fetchClientPortalSnapshot(clientId: string): Promise<PortalSnapshot> {
  try {
    const [messagesResult, assetsResult] = await Promise.all([
      supabase
        .from('client_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true }),
      supabase
        .from('client_assets')
        .select('*')
        .eq('client_id', clientId)
        .eq('client_visible', true)
        .eq('visibility', 'client')
        .eq('is_downloadable', true)
        .order('created_at', { ascending: false }),
    ]);

    if (messagesResult.error) {
      logSupabaseError('clientPortalService.fetchClientPortalSnapshot.messages', messagesResult.error, {
        clientId,
        query: 'client portal messages',
      });
    }
    if (assetsResult.error) {
      logSupabaseError('clientPortalService.fetchClientPortalSnapshot.assets', assetsResult.error, {
        clientId,
        query: 'client portal assets',
      });
    }

    return {
      messages: (messagesResult.data ?? []) as PortalMessage[],
      assets: (assetsResult.data ?? []) as PortalAsset[],
    };
  } catch (error) {
    logSupabaseError('clientPortalService.fetchClientPortalSnapshot.catch', error, {
      clientId,
      query: 'client portal snapshot',
    });
    return { messages: [], assets: [] };
  }
}

function normalizeStoragePath(path?: string | null): string | null {
  const trimmed = (path ?? '').trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return null;

  return trimmed
    .replace(/^\/+/, '')
    .replace(/^client-assets\//, '');
}

export function getAssetStoragePath(asset: PortalAsset): string | null {
  return (
    normalizeStoragePath(asset.storage_path) ||
    normalizeStoragePath(asset.file_url) ||
    normalizeStoragePath(asset.asset_url)
  );
}

export async function getAssetDownloadUrl(asset: PortalAsset): Promise<string | null> {
  const path = getAssetStoragePath(asset);
  if (!path) return null;

  try {
    const { data, error } = await supabase.storage
      .from('client-assets')
      .createSignedUrl(path, 60 * 10);

    if (error) {
      logSupabaseError('clientPortalService.getAssetDownloadUrl', error, {
        path,
        assetId: asset.id,
      });
      return null;
    }
    if (!data?.signedUrl) return null;
    return data.signedUrl;
  } catch (error) {
    logSupabaseError('clientPortalService.getAssetDownloadUrl.catch', error, {
      path,
      assetId: asset.id,
    });
    return null;
  }
}

export const clientPortalService = {
  sendMessage,
  getMessages,
  fetchClientPortalSnapshot,
  getAssetStoragePath,
  getAssetDownloadUrl,
};
