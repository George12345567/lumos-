import { supabase } from '@/lib/supabaseClient';
import { logAuditChange } from './auditService';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  service_interest: string | null;
  message: string | null;
  status: string;
  source: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactFormData {
  name: string;
  phone?: string;
  email?: string;
  message?: string;
  serviceNeeded?: string;
}

export const submitContactForm = async (
  data: ContactFormData,
  teamMemberId?: string | null,
  source: string = 'website'
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const now = new Date().toISOString();

    const contactData = {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      service_interest: data.serviceNeeded || null,
      message: data.message || null,
      source: source || 'website',
      assigned_to: teamMemberId || null,
      created_at: now,
      updated_at: now,
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (insertError) throw insertError;

    await logAuditChange({
      entityType: 'contact',
      entityId: insertedData.id,
      changedBy: null,
      changedByType: 'guest',
      action: 'created',
      oldValues: null,
      newValues: contactData,
      changeSummary: 'New contact form submission',
      changeSummaryAr: 'إرسال نموذج اتصال جديد'
    });

    return { success: true, id: insertedData.id };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error submitting contact form:', error);
    return { success: false, error: errorMessage };
  }
};

export const getContacts = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as any[]) || [];
  } catch (error) {
    console.error('Error getting contacts:', error);
    return [];
  }
};

export const updateContactStatus = async (
  id: string,
  status: string,
  changedById?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        status,
        updated_at: now
      })
      .eq('id', id);

    if (updateError) throw updateError;

    await logAuditChange({
      entityType: 'contact',
      entityId: id,
      changedBy: changedById || null,
      changedByType: changedById ? 'team_member' : 'system',
      action: 'status_changed',
      oldValues: null,
      newValues: { status },
      changeSummary: `Contact status changed to ${status}`,
      changeSummaryAr: `تم تغيير حالة الاتصال إلى ${status}`
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating contact status:', error);
    return { success: false, error: errorMessage };
  }
};

export const assignContact = async (
  contactId: string,
  teamMemberId: string,
  assignedById?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        assigned_to: teamMemberId,
        updated_at: now
      })
      .eq('id', contactId);

    if (updateError) throw updateError;

    await logAuditChange({
      entityType: 'contact',
      entityId: contactId,
      changedBy: assignedById || null,
      changedByType: assignedById ? 'team_member' : 'system',
      action: 'assigned',
      oldValues: { assigned_to: null },
      newValues: { assigned_to: teamMemberId },
      changeSummary: 'Contact assigned to team member',
      changeSummaryAr: 'تم تعيين الاتصال لأحد أفراد الفريق'
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error assigning contact:', error);
    return { success: false, error: errorMessage };
  }
};

export const saveContactNotes = async (
  contactId: string,
  notes: string,
  savedById?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        message: notes,
        updated_at: now
      })
      .eq('id', contactId);

    if (updateError) throw updateError;

    await logAuditChange({
      entityType: 'contact',
      entityId: contactId,
      changedBy: savedById || null,
      changedByType: savedById ? 'team_member' : 'system',
      action: 'notes_added',
      oldValues: null,
      newValues: { notes },
      changeSummary: 'Contact notes added',
      changeSummaryAr: 'تمت إضافة ملاحظات الاتصال'
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving contact notes:', error);
    return { success: false, error: errorMessage };
  }
};

export const deleteContact = async (
  id: string,
  deletedById?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error: deleteError } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await logAuditChange({
      entityType: 'contact',
      entityId: id,
      changedBy: deletedById || null,
      changedByType: deletedById ? 'team_member' : 'system',
      action: 'deleted',
      oldValues: null,
      newValues: null,
      changeSummary: 'Contact deleted',
      changeSummaryAr: 'تم حذف الاتصال'
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting contact:', error);
    return { success: false, error: errorMessage };
  }
};