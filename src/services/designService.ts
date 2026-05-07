import { supabase } from '@/lib/supabaseClient';
import type { SavedDesign } from '@/types/dashboard';

export type SaveDesignPayload = Partial<SavedDesign>;

export async function loadDesign(id: string): Promise<{ data: SavedDesign | null; reason?: string }> {
  try {
    const { data, error } = await supabase
      .from('saved_designs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return { data: null, reason: error?.message || 'not_found' };
    return { data: data as SavedDesign };
  } catch {
    return { data: null, reason: 'unexpected_error' };
  }
}

export async function saveDesign(design: Partial<SavedDesign>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('saved_designs')
      .insert(design);
    return { success: !error, error: error?.message };
  } catch {
    return { success: false, error: 'unexpected_error' };
  }
}

export async function updateDesign(id: string, design: Partial<SavedDesign>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('saved_designs')
      .update(design)
      .eq('id', id);
    return { success: !error, error: error?.message };
  } catch {
    return { success: false, error: 'unexpected_error' };
  }
}

export async function fetchDesignsByClient(clientId: string): Promise<SavedDesign[]> {
  try {
    const { data, error } = await supabase
      .from('saved_designs')
      .select('*')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false });
    if (error || !data) return [];
    return data as SavedDesign[];
  } catch {
    return [];
  }
}

export async function deleteDesign(id: string): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('saved_designs')
      .delete()
      .eq('id', id);
    return { success: !error };
  } catch {
    return { success: false };
  }
}