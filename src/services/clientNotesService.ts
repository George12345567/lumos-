import { supabase } from '@/lib/supabaseClient';
import { createClientNotification } from '@/services/notificationService';

export type ClientNotePriority = 'normal' | 'important' | 'urgent';
export type ClientNotePlacement = 'home' | 'project' | 'both';

export interface ClientNote {
  id: string;
  client_id: string;
  project_id?: string | null;
  title: string;
  body: string;
  priority: ClientNotePriority;
  placement: ClientNotePlacement;
  is_active: boolean;
  is_dismissible: boolean;
  show_in_profile_hero: boolean;
  expires_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
  read_at?: string | null;
}

export interface CreateClientNoteInput {
  clientId: string;
  projectId?: string | null;
  title: string;
  body: string;
  priority: ClientNotePriority;
  placement: ClientNotePlacement;
  isActive: boolean;
  isDismissible: boolean;
  showInProfileHero?: boolean;
  expiresAt?: string | null;
}

function isActiveForClient(note: ClientNote) {
  if (!note.is_active) return false;
  if (!note.expires_at) return true;
  const expiresAt = new Date(note.expires_at).getTime();
  return Number.isNaN(expiresAt) || expiresAt > Date.now();
}

export async function fetchClientNotes(clientId: string): Promise<ClientNote[]> {
  try {
    const { data, error } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return ((data as ClientNote[]) ?? []).filter(isActiveForClient);
  } catch (error) {
    console.error('[clientNotesService.fetchClientNotes] failed', error);
    return [];
  }
}

export async function fetchClientHeroNotes(clientId: string): Promise<ClientNote[]> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .eq('show_in_profile_hero', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[clientNotesService.fetchClientHeroNotes] failed', error);
      return [];
    }
    return ((data as ClientNote[]) ?? []).filter(isActiveForClient);
  } catch (error) {
    console.error('[clientNotesService.fetchClientHeroNotes] failed', error);
    return [];
  }
}

export async function createClientNote(
  input: CreateClientNoteInput,
): Promise<{ success: boolean; note?: ClientNote; notificationId?: string; telegramError?: string; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const createdBy = sessionData?.session?.user?.id ?? null;
    const payload = {
      client_id: input.clientId,
      project_id: input.projectId || null,
      title: input.title.trim(),
      body: input.body.trim(),
      priority: input.priority,
      placement: input.placement,
      is_active: input.isActive,
      is_dismissible: input.isDismissible,
      show_in_profile_hero: input.showInProfileHero ?? false,
      expires_at: input.expiresAt || null,
      created_by: createdBy,
    };

    const { data, error } = await supabase
      .from('client_notes')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    const note = data as ClientNote;
    let notificationId: string | undefined;
    let telegramError: string | undefined;

    if (note.is_active) {
      const notification = await createClientNotification({
        clientId: note.client_id,
        type: 'project',
        title: note.priority === 'urgent' ? 'Urgent note from Lumos' : 'Important note from Lumos',
        titleAr: note.priority === 'urgent' ? 'ملاحظة عاجلة من لوموس' : 'ملاحظة مهمة من لوموس',
        message: note.title,
        messageAr: note.title,
        entityType: 'client_note',
        entityId: note.id,
        actionUrl: note.project_id ? '/profile?tab=projects' : '/profile',
        priority: note.priority === 'normal' ? 'normal' : note.priority === 'important' ? 'high' : 'urgent',
      });
      notificationId = notification.id;
      if (!notification.success) telegramError = notification.error;
    }

    return { success: true, note, notificationId, telegramError };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'client_note_create_failed',
    };
  }
}

export async function markClientNoteRead(noteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('mark_client_note_read', {
      p_note_id: noteId,
    });

    if (error) throw error;
    if (data === false) return { success: false, error: 'note_not_dismissible_or_not_found' };
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'client_note_read_failed',
    };
  }
}

export const clientNotesService = {
  fetchClientNotes,
  fetchClientHeroNotes,
  createClientNote,
  markClientNoteRead,
};

export default clientNotesService;
