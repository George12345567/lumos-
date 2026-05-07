import { supabase } from '@/lib/supabaseClient';

export interface PortalMessage {
  id: string;
  client_id: string;
  message: string;
  sender: 'client' | 'team' | string;
  created_at: string;
}

export interface PortalAsset {
  id: string;
  name?: string;
  asset_url?: string;
  asset_type?: string;
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
    return { success: !error };
  } catch {
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
    if (error || !data) return [];
    return data as PortalMessage[];
  } catch {
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
        .order('created_at', { ascending: false }),
    ]);

    return {
      messages: (messagesResult.data ?? []) as PortalMessage[],
      assets: (assetsResult.data ?? []) as PortalAsset[],
    };
  } catch {
    return { messages: [], assets: [] };
  }
}

export const clientPortalService = { sendMessage, getMessages, fetchClientPortalSnapshot };