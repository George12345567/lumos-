import { supabase } from '@/lib/supabaseClient';
import type { Client, PricingRequest } from '@/types/dashboard';
import { sanitizePricingRequestUpdate } from './adminDashboardService';

const ADMIN_EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-client-update`;

type Snapshot = Record<string, unknown>;
type ServiceResult<T = unknown> = { success: boolean; data?: T; error?: string };

async function getSessionToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? '';
}

async function safeQuery<T>(query: PromiseLike<{ data: T | null; error: { message?: string } | null }>, fallback: T): Promise<T> {
  try {
    const { data, error } = await query;
    if (error) return fallback;
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

async function updateClientViaEdge(clientId: string, payload: Partial<Client>): Promise<ServiceResult<Client>> {
  try {
    const token = await getSessionToken();
    if (!token) throw new Error('Missing admin session token');

    const response = await fetch(ADMIN_EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'update',
        clientId,
        payload,
      }),
    });

    const body = await response.json().catch(() => ({
      success: false,
      error: 'invalid_response',
      details: 'admin-client-update returned non-JSON.',
    }));

    if (!response.ok || !body.success) {
      throw new Error(body.details || body.error || 'Failed to update client');
    }

    return { success: true, data: body.client as Client | undefined };
  } catch (error) {
    console.error('[adminClientModalService.updateClient]', {
      error,
      payload: {
        clientId,
        fields: Object.keys(payload),
      },
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update client',
    };
  }
}

export async function fetchAdminClientModalSnapshot(clientId: string): Promise<Snapshot> {
  const [
    client,
    messages,
    projects,
    pricingRequests,
    updates,
    assets,
    orders,
  ] = await Promise.all([
    safeQuery(supabase.from('clients').select('*').eq('id', clientId).maybeSingle(), null),
    safeQuery(supabase.from('client_messages').select('*').eq('client_id', clientId).order('created_at', { ascending: true }), []),
    safeQuery(supabase.from('saved_designs').select('*').eq('client_id', clientId).order('created_at', { ascending: false }), []),
    safeQuery(supabase.from('pricing_requests').select('*').eq('client_id', clientId).order('created_at', { ascending: false }), []),
    safeQuery(supabase.from('client_updates').select('*').eq('client_id', clientId).order('update_date', { ascending: false }), []),
    safeQuery(supabase.from('client_assets').select('*').eq('client_id', clientId).order('uploaded_at', { ascending: false }), []),
    safeQuery(supabase.from('orders').select('*').eq('client_id', clientId).order('created_at', { ascending: false }), []),
  ]);

  return {
    client,
    profile: client,
    subscription: client,
    messages,
    projects,
    pricingRequests,
    updates,
    assets,
    orders,
    packages: [],
  };
}

export async function fetchAdminClientSheetSnapshot(clientId: string): Promise<Snapshot> {
  return fetchAdminClientModalSnapshot(clientId);
}

export async function adminUpdateClient(clientId: string, payload: Partial<Client>): Promise<Client | null> {
  const result = await updateClientViaEdge(clientId, payload);
  if (!result.success) throw new Error(result.error || 'Failed to update client');
  return result.data ?? null;
}

export async function adminInsertClientUpdate(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('client_updates')
    .insert(payload)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminRecordAsset(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('client_assets')
    .insert(payload)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminSendMessage(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('client_messages')
    .insert(payload)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminUpdatePricingRequest(requestId: string, updates: Partial<PricingRequest> | Record<string, unknown>) {
  const { data, error } = await supabase
    .from('pricing_requests')
    .update({
      ...sanitizePricingRequestUpdate(updates as Partial<PricingRequest>),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminMarkClientMessagesRead(clientId: string) {
  const { error } = await supabase
    .from('client_messages')
    .update({ is_read: true })
    .eq('client_id', clientId)
    .eq('sender', 'client');
  if (error) throw error;
}

export const adminClientModalService = {
  getClients: async () => safeQuery(supabase.from('clients').select('*').order('created_at', { ascending: false }), [] as Client[]),
  updateClient: updateClientViaEdge,
};
